// Deliberately NOT a "use server" module: every export of an action file is a
// public RPC door, and this one holds the only path to a live Google push.

import { resultify } from "@zenncore/utils";
import { eq, ilike, or, sql } from "drizzle-orm";
import { schema } from "../../database";
import { Environment } from "../../utils/environment";
import { RequestError } from "../../utils/error";
import * as GoogleMerchantAPI from "../../utils/google-merchant";
import * as GoogleMerchantAccount from "../google-merchant-account";
import * as Store from "../store";
import type { Merchant, OfferLine, Prepared } from "./catalog";

/**
 * Publishing to Google for `/agents`, on the one store that has earned it: the
 * demo store, whose Merchant Center account is linked to us and whose website
 * Google says is claimed (hard rule 3). Path 1 of
 * docs/integrations/google-merchant-center.md, run through the plain client
 * because the actions in `integration/google-merchant.ts` need a session.
 *
 * Known hazards, both accepted for tonight:
 * - `productInputs:insert` fully replaces the previous input for that offer in
 *   our supplemental source. Anything an earlier push carried and this one does
 *   not, UCP attributes from the dashboard or a title when only a description
 *   is sent now, is gone from Google.
 * - No `google_merchant_offer` rows are written, so the dashboard's verification
 *   and stale cleanup do not know about these inputs. They expire on Google
 *   after 30 days unless something refreshes them.
 */

const UNLINKED =
  "This store is not linked to ecentic. Connect your Merchant Center to publish.";

/** Products, not offers: one product can carry many variant and market offers. */
const MAX_PRODUCTS_PUSHED = 10;
const RESPONSE_LIMIT = 300;
const POLL_WINDOW = 90_000;
const POLL_INTERVAL = 5000;

type Attributes = GoogleMerchantAPI.ProductInputAttributes;
type Offer = GoogleMerchantAPI.MerchantProduct;
type Failure = { success: false; error: Error };

type Grant = {
  account: string;
  dataSource: string;
  refreshToken: string;
  configuration: GoogleMerchantAPI.Configuration;
  hosts: string[];
};

/** One offer's place in a push. `offer` is null when there is nothing to insert. */
export type Landing = {
  line: OfferLine;
  attributes: Attributes;
  offer: Offer | null;
};

/**
 * Credentials for every merchant {@link eligibility} approved. Keyed on the
 * object so the token material can never land in the summary JSON, and so a
 * `Merchant` rebuilt from Redis or written by hand, whatever its `eligible` says,
 * has no grant and cannot push.
 */
const grants = new WeakMap<Merchant, Grant>();

const refuse = (reason: string): Merchant => ({
  eligible: false,
  reason,
  account: null,
  lines: [],
});

const failure = (message: string): Failure => ({
  success: false,
  error: new RequestError(message),
});

/** `Demo.com`, `www.demo.com` and `https://demo.com/` are one host. */
const bare = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  const url = resultify(
    () => new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`),
  );
  return (url.success ? url.data.hostname : trimmed).replace(/^www\./, "");
};

const hostsOf = (store: Store.Type) => [
  ...new Set([store.domain, ...(store.storefrontHosts ?? [])].map(bare)),
];

/** A fresh token per step and never persisted: Google has revoked older ones out of band. */
const mint = ({ configuration, refreshToken }: Grant) =>
  GoogleMerchantAPI.refreshAccessToken(configuration, { refreshToken });

/** Why this account may not publish for this store's hosts, or null when it may. */
const objection = async (accessToken: string, grant: Grant) => {
  const homepage = await GoogleMerchantAPI.getHomepage(
    accessToken,
    grant.account,
  );
  if (!homepage.success)
    return "We could not read this account's website from Merchant Center.";
  if (homepage.data.claimed !== true)
    return "Google does not show this store's website as claimed in Merchant Center.";
  if (!homepage.data.uri || !grant.hosts.includes(bare(homepage.data.uri)))
    return "The website on this Merchant Center account is not this store.";
  return null;
};

const inspect = async (store: Store.Type, host: string): Promise<Merchant> => {
  const hosts = hostsOf(store);
  if (!hosts.includes(host)) return refuse(UNLINKED);

  const accounts = await GoogleMerchantAccount.find(Environment.SERVER, {
    where: eq(schema.googleMerchantAccount.storeId, store.id),
  });
  if (!accounts.success) return refuse(UNLINKED);

  const account = accounts.data[0];
  if (
    !account?.googleAccountId ||
    !account.dataSourceName ||
    !account.refreshToken
  )
    return refuse(UNLINKED);

  const configuration = GoogleMerchantAPI.configuration();
  if (!configuration)
    return refuse("Merchant Center publishing is not set up on this server.");

  const grant: Grant = {
    account: account.googleAccountId,
    dataSource: account.dataSourceName,
    refreshToken: account.refreshToken,
    configuration,
    hosts,
  };

  const token = await mint(grant);
  if (!token.success)
    return refuse("Google refused this store's Merchant Center connection.");

  const reason = await objection(token.data.accessToken, grant);
  if (reason) return refuse(reason);

  const merchant: Merchant = {
    eligible: true,
    reason: null,
    account: grant.account,
    lines: [],
  };
  grants.set(merchant, grant);
  return merchant;
};

/**
 * Whether this run's host may publish. `AGENTS_DEMO_DOMAIN` has no default and
 * there is no override flag: unset means nothing is eligible, ever.
 *
 * `store.domain` is not unique and anyone can import a public catalog under the
 * demo domain, so every row carrying it is judged, and only one whose linked
 * account Google says owns the website passes.
 */
export const eligibility = async (host: string): Promise<Merchant> => {
  const { AGENTS_DEMO_DOMAIN: demo } = process.env;
  const domain = bare(demo ?? "");
  if (!domain) return refuse(UNLINKED);

  const pattern = `%${domain}%`;
  const stores = await Store.find(Environment.SERVER, {
    where: or(
      ilike(schema.store.domain, pattern),
      sql`${schema.store.storefrontHosts}::text ilike ${pattern}`,
    ),
  });
  if (!stores.success) return refuse(UNLINKED);

  const verdicts = await Promise.all(
    stores.data
      .filter((store) => hostsOf(store).includes(domain))
      .map((store) => inspect(store, host)),
  );

  return (
    verdicts.find((verdict) => verdict.eligible) ??
    verdicts[0] ??
    refuse(UNLINKED)
  );
};

/**
 * Copied from `offerMatchesExternalId` in `integration/google-merchant.ts`, where
 * it is private to a "use server" file. Offer ids are read from the account,
 * never rebuilt.
 */
const matches = (offerId: string, externalId: string) =>
  offerId === externalId || offerId.split("_").includes(externalId);

/** Title and description from accepted fixes only. The last fix is what the product now says. */
export const overrides = ({ fixes }: Prepared): Attributes => {
  const accepted = (field: "title" | "description") =>
    fixes.filter((fix) => fix.field === field).at(-1)?.after;
  const title = accepted("title");
  const description = accepted("description");

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  };
};

const line = (
  offerId: string,
  title: string,
  status: OfferLine["status"],
  response: string | null,
): OfferLine => ({
  offerId,
  title,
  status,
  response,
  mergedTitle: null,
  destinations: [],
  issues: [],
});

/**
 * What a push will do, offer by offer, before anything is sent. Pure. Hard rule
 * 5 is enforced here: a flagged override becomes a rejected line and no landing
 * carries an offer for it, so it cannot reach the insert.
 *
 * Products with a fix and a live offer take the slots first, so the cap of 10
 * is not spent on products that have nothing to send.
 */
export const plan = (entries: Prepared[], offers: Offer[]): Landing[] => {
  const candidates = entries.map((entry) => {
    const attributes = overrides(entry);
    const live = offers.filter(
      ({ name, offerId, contentLanguage, feedLabel }) =>
        name &&
        offerId &&
        contentLanguage &&
        feedLabel &&
        matches(offerId, entry.product.id),
    );
    const fixed = Object.keys(attributes).length > 0;
    const rank = (() => {
      switch (true) {
        case fixed && live.length > 0:
          return 0;
        case fixed:
          return 1;
        default:
          return 2;
      }
    })();
    return { product: entry.product, attributes, live, fixed, rank };
  });

  return [...candidates]
    .sort((first, second) => first.rank - second.rank)
    .slice(0, MAX_PRODUCTS_PUSHED)
    .flatMap(({ product, attributes, live, fixed }): Landing[] => {
      const title = attributes.title ?? product.title;

      if (!fixed)
        return [
          {
            line: line(
              product.id,
              title,
              "skipped",
              "No title or description fix to publish.",
            ),
            attributes,
            offer: null,
          },
        ];

      if (live.length === 0)
        return [
          {
            line: line(
              product.id,
              title,
              "skipped",
              "No live Merchant Center offer matches this product.",
            ),
            attributes,
            offer: null,
          },
        ];

      const issues = GoogleMerchantAPI.lintOverrideAttributes(attributes);

      return live.map((offer) =>
        issues.length > 0
          ? {
              line: line(
                offer.offerId as string,
                title,
                "rejected",
                `Held back before sending: ${issues.map((issue) => issue.message).join("; ")}`,
              ),
              attributes,
              offer: null,
            }
          : {
              line: line(offer.offerId as string, title, "pending", null),
              attributes,
              offer,
            },
      );
    });
};

/**
 * The primary's rule must list our source first and keep `self`: without the
 * first, inserts return 200 and merge nothing; without the second, Google drops
 * the merchant's whole primary feed. PATCH replaces the list, so it is
 * read-modify-write, on every primary (a multi-market setup runs one per market).
 */
const ensureRule = async (
  accessToken: string,
  { account, dataSource }: Grant,
) => {
  const sources = await GoogleMerchantAPI.listDataSources(accessToken, account);
  if (!sources.success) return sources;

  const primaries = (sources.data.dataSources ?? []).filter(
    (source) => source.primaryProductDataSource && source.name,
  );
  if (primaries.length === 0)
    return failure("This Merchant Center account has no primary product feed.");

  const identifier = dataSource.split("/").pop();
  const ours = (reference: GoogleMerchantAPI.DataSourceReference) =>
    reference.supplementalDataSourceName?.split("/").pop() === identifier;

  for (const primary of primaries) {
    const current =
      primary.primaryProductDataSource?.defaultRule?.takeFromDataSources ?? [];
    const self = current.some((reference) => reference.self === true);
    const first = current[0];
    if (first && ours(first) && self) continue;

    const patched = await GoogleMerchantAPI.patchDataSourceDefaultRule(
      accessToken,
      {
        name: primary.name as string,
        takeFromDataSources: [
          { supplementalDataSourceName: dataSource },
          ...current.filter((reference) => !ours(reference)),
          ...(self ? [] : [{ self: true }]),
        ],
      },
    );
    if (!patched.success) return patched;
  }

  return { success: true as const, data: null };
};

const replaced = (
  lines: OfferLine[],
  index: number,
  change: Partial<OfferLine>,
) =>
  lines.map((entry, position) =>
    position === index ? { ...entry, ...change } : entry,
  );

/**
 * Inserts one at a time so the stage shows them landing, and returns as soon as
 * the inserts have: accepted by Google's API counts as delivered. {@link confirm}
 * then watches them merge. The guard runs again here, with a token minted now,
 * because the merchant object was approved before the rewrites ran.
 */
export const push = async (
  entries: Prepared[],
  merchant: Merchant,
  onLines: (lines: OfferLine[]) => void,
) => {
  const grant = grants.get(merchant);
  if (!grant || !merchant.eligible) return failure(UNLINKED);

  const token = await mint(grant);
  if (!token.success)
    return failure("Google refused this store's Merchant Center connection.");

  const reason = await objection(token.data.accessToken, grant);
  if (reason) return failure(reason);

  const rule = await ensureRule(token.data.accessToken, grant);
  if (!rule.success) return rule;

  const offers = await GoogleMerchantAPI.listProducts(
    token.data.accessToken,
    grant.account,
  );
  if (!offers.success) return offers;

  const landings = plan(entries, offers.data);
  const planned = landings.map((landing) => landing.line);
  onLines(planned);

  const lines = await landings.reduce(
    async (pending, { attributes, offer }, index) => {
      const current = await pending;
      if (!offer) return current;

      const insertion = await GoogleMerchantAPI.insertProductInput(
        token.data.accessToken,
        {
          accountId: grant.account,
          dataSourceName: grant.dataSource,
          offerId: offer.offerId as string,
          contentLanguage: offer.contentLanguage as string,
          feedLabel: offer.feedLabel as string,
          attributes,
        },
      );

      const updated = replaced(
        current,
        index,
        insertion.success
          ? {
              status: "accepted",
              response:
                `Accepted by Google: ${insertion.data.name ?? "200"}`.slice(
                  0,
                  RESPONSE_LIMIT,
                ),
            }
          : {
              status: "rejected",
              response: insertion.error.message.slice(0, RESPONSE_LIMIT),
            },
      );
      onLines(updated);
      return updated;
    },
    Promise.resolve(planned),
  );

  return {
    success: true as const,
    data: { landings, lines },
  };
};

const same = (first?: string, second?: string) =>
  first !== undefined &&
  second !== undefined &&
  first.replace(/\s+/g, " ").trim() === second.replace(/\s+/g, " ").trim();

/**
 * The pushed value appearing on the processed offer is the proof of merge; per
 * the doc, Google's clock is never compared with ours. A value the offer already
 * said before the insert proves nothing, so it only counts when no field changed.
 */
export const hasMerged = (
  attributes: Attributes,
  baseline: Offer,
  current: Offer,
) => {
  const fields = (["title", "description"] as const).filter(
    (field) => attributes[field],
  );
  const changed = fields.filter(
    (field) => !same(baseline.productAttributes?.[field], attributes[field]),
  );

  return (changed.length > 0 ? changed : fields).some((field) =>
    same(current.productAttributes?.[field], attributes[field]),
  );
};

const destinationsOf = (offer: Offer) =>
  (offer.productStatus?.destinationStatuses ?? []).map((destination) => {
    const status = (() => {
      switch (true) {
        case Boolean(destination.disapprovedCountries?.length):
          return "disapproved";
        case Boolean(destination.approvedCountries?.length):
          return "approved";
        default:
          return "pending";
      }
    })();
    return `${destination.reportingContext ?? "unknown"}: ${status}`;
  });

const issuesOf = (offer: Offer) =>
  (offer.productStatus?.itemLevelIssues ?? []).flatMap((issue) => {
    const text = issue.description ?? issue.code;
    return text ? [text] : [];
  });

/**
 * Polls accepted offers until they all merge or the window ends. A failed read
 * is not a verdict: the line stays accepted and the next tick asks again.
 */
export const confirm = async (
  { landings, lines }: { landings: Landing[]; lines: OfferLine[] },
  merchant: Merchant,
  onLines: (lines: OfferLine[]) => void,
  {
    window = POLL_WINDOW,
    interval = POLL_INTERVAL,
  }: { window?: number; interval?: number } = {},
) => {
  const grant = grants.get(merchant);
  if (!grant) return lines;

  const token = await mint(grant);
  if (!token.success) return lines;

  const deadline = Date.now() + window;

  const tick = async (latest: OfferLine[]): Promise<OfferLine[]> => {
    await new Promise((resolve) => setTimeout(resolve, interval));

    const watched = landings.flatMap(({ attributes, offer }, index) =>
      offer && latest[index]?.status === "accepted"
        ? [{ attributes, offer, index }]
        : [],
    );
    if (watched.length === 0) return latest;

    const reads = await Promise.all(
      watched.map(({ offer }) =>
        GoogleMerchantAPI.getProduct(
          token.data.accessToken,
          offer.name as string,
        ),
      ),
    );

    const updated = watched.reduce(
      (current, { attributes, offer, index }, at) => {
        const read = reads[at];
        if (!read?.success) return current;

        const merged = hasMerged(attributes, offer, read.data);
        return replaced(current, index, {
          destinations: destinationsOf(read.data),
          issues: issuesOf(read.data),
          ...(merged
            ? {
                status: "merged" as const,
                mergedTitle: read.data.productAttributes?.title ?? null,
              }
            : {}),
        });
      },
      latest,
    );
    onLines(updated);

    if (Date.now() + interval > deadline) return updated;
    return tick(updated);
  };

  return tick(lines);
};
