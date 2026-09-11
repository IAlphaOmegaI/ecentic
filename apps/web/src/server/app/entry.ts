"use server";

import { resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  ENTRY_COOKIE,
  type Entry,
  entrySchema,
  parseEntry,
  sanitizeRedirect,
} from "@/lib/redirect";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import { redis } from "../utils/durable";
import { Environment } from "../utils/environment";
import * as HTTP from "../utils/http";
import { consume, ENTRY_POLICY } from "../utils/rate-limit";
import { resolveOrigin } from "../utils/ssrf";
import { normalizeHostname } from "../utils/tracking";
import * as Shopify from "./integration/shopify";
import * as WooCommerce from "./integration/woocommerce";
import * as Store from "./store";

/**
 * The landing hero's store-URL entry: a visitor types their store, we work out
 * what it runs on, and — once they have an account — import its public catalog
 * so onboarding opens on their own products instead of a platform picker.
 *
 * Every action here writes or clears the entry cookie and then navigates with
 * `redirect()` from inside the action. A cookie write makes Next refresh the
 * current page in the same response; a client-side `router.push` afterwards
 * would race that refresh. The client passes `locale` because actions cannot
 * read it from the route (`src/i18n/request.ts`).
 */

const COOKIE = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  // Long enough to outlive email verification, short enough that a stale
  // store does not import itself into next week's session.
  maxAge: 60 * 60 * 24,
} as const;

const HOMEPAGE_TIMEOUT_MS = 5000;
const HOMEPAGE_LIMIT_BYTES = 3 * 1024 * 1024;
// Outlives the import itself (the connect page's `maxDuration` is 300s), so a
// waiting tab can never start a second import while the first still runs.
const LOCK_SECONDS = 330;

const localeOf = (locale: string) =>
  hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;

/**
 * Writes the entry — only in a shape `parseEntry` will read back. Every field
 * after the origin is a storefront's own say-so (`/meta.json`, `X-WP-Total`),
 * so anything malformed is dropped rather than letting the whole entry vanish
 * silently on the next read.
 */
const write = async (entry: Entry) => {
  const valid = entrySchema.safeParse(entry);
  const value = valid.success
    ? valid.data
    : { ...entry, name: null, products: null };

  (await cookies()).set(ENTRY_COOKIE, JSON.stringify(value), COOKIE);
};

/**
 * The hero's submit. Resolves the store's platform before sign-up so a typo is
 * caught while the visitor is still on the page, then hands them to sign-up —
 * or straight to onboarding when they already have a session.
 *
 * Outcomes the hero explains inline come back as data, never as errors: a
 * typo is not a defect, and Sentry should not hear about one. Whether another
 * account already holds the store is deliberately *not* checked here — that
 * would tell an anonymous visitor which domains are customers.
 */
export const begin = withContext(
  async (context, { url, locale }: { url: string; locale: string }) => {
    const target = resolveOrigin(url);
    if (!target)
      return { success: true as const, data: { kind: "invalid" as const } };

    const verdict = await consume({ headers: await headers() }, ENTRY_POLICY);
    if (!verdict.allowed)
      return { success: true as const, data: { kind: "limited" as const } };

    // One read of the homepage is shared with both platform probes (Shopify's
    // password page, WordPress's advertised REST root) instead of each
    // fetching it again. It is evidence, not a gate: a slow or oversized
    // homepage still lets `/meta.json` or the Store API answer.
    const home = await HTTP.page(target.origin, {
      timeout: HOMEPAGE_TIMEOUT_MS,
      limit: HOMEPAGE_LIMIT_BYTES,
    });
    const page = home.success ? home.data : null;

    const [shopify, woo] = await Promise.all([
      Shopify.probe(Environment.SERVER, { domain: target.origin, home: page }),
      WooCommerce.probe(Environment.SERVER, {
        domain: target.origin,
        home: page,
      }),
    ]);

    const found = {
      shopify: shopify.success ? shopify.data : null,
      woocommerce: woo.success ? woo.data : null,
    };

    // An importable catalog outranks a recognised-but-locked one: a WordPress
    // store that embeds a Shopify Buy Button carries Shopify markup, but its
    // WooCommerce catalog is the one that answers.
    const detected = (() => {
      switch (true) {
        case found.shopify?.importable === true:
          return { platform: "shopify" as const, ...found.shopify };
        case found.woocommerce?.importable === true:
          return { platform: "woocommerce" as const, ...found.woocommerce };
        case found.shopify !== null:
          return { platform: "shopify" as const, ...found.shopify };
        case found.woocommerce !== null:
          return { platform: "woocommerce" as const, ...found.woocommerce };
        default:
          return null;
      }
    })();

    if (!page && !detected)
      return {
        success: true as const,
        data: { kind: "unreachable" as const, host: target.host },
      };

    const entry = ((): Entry => {
      if (!detected)
        return {
          origin: target.origin,
          host: target.host,
          platform: "unknown",
          name: null,
          products: null,
          status: "unsupported",
        };

      return {
        origin: target.origin,
        host: target.host,
        platform: detected.platform,
        name: detected.name,
        products: detected.products,
        status: detected.importable ? "pending" : "locked",
      };
    })();

    await write(entry);

    const session = await resultify(async () =>
      context.auth.getSession({ headers: await headers() }),
    );

    // The proxy bounces a signed-in visitor off `/sign-up` anyway; send them
    // where the import runs. Returned so the type checker sees the navigation
    // end the action — next-intl's `redirect` is `never`, but only a returned
    // call narrows through a destructured binding.
    return redirect({
      href:
        session.success && session.data ? "/onboarding/connect" : "/sign-up",
      locale: localeOf(locale),
    });
  },
  "Entry.begin",
);

/** The entry the visitor's cookie carries, for server components to render. */
export const pending = withContext(async () => {
  const jar = await cookies();
  return {
    success: true as const,
    data: parseEntry(jar.get(ENTRY_COOKIE)?.value),
  };
}, "Entry.pending");

/**
 * The account's existing store for this storefront, by any name it goes by —
 * the stored domain, or a host an app install recorded (a Shopify install is
 * stored under its myshopify host but lists the custom domain here).
 */
const ownedStore = async (user: string, host: string) => {
  const stores = await Store.find(Environment.SERVER, {
    where: eq(schema.store.userId, user),
  });
  if (!stores.success) return null;

  return (
    stores.data.find(
      (store) =>
        normalizeHostname(store.domain).replace(/^www\./, "") === host ||
        (store.storefrontHosts ?? []).some(
          (candidate) =>
            normalizeHostname(candidate).replace(/^www\./, "") === host,
        ),
    ) ?? null
  );
};

/**
 * Imports the entry's store for the signed-in account. Runs once, from the
 * onboarding panel, and ends in one of three places:
 *
 * - imported → the cookie is spent and the visitor lands on the product
 *   picker (or, for a store they already onboarded, its dashboard — re-running
 *   the picker would let them select past their plan's product limit);
 * - an outcome the panel explains (`claimed`, `locked`) → recorded on the
 *   cookie, which refreshes the page into that state;
 * - a transient failure → returned as an error, cookie untouched, so the
 *   panel can offer a retry.
 */
export const connect = withAuthentication(
  async (context, { locale }: { locale: string }) => {
    const language = localeOf(locale);
    const user = context.session.user.id;

    const jar = await cookies();
    const entry = parseEntry(jar.get(ENTRY_COOKIE)?.value);

    if (entry?.status !== "pending" || entry.platform === "unknown")
      return { success: true as const, data: { kind: "idle" as const } };

    // A double-mounted effect or a second tab must not create two stores:
    // reconcile-then-create is check-then-act, and `store.domain` is not
    // unique. Fails open if Redis is unreachable — the client guard still
    // holds, and a missing lock costs a rare duplicate, not the import.
    const lock = `entry:lock:${user}`;
    const token = crypto.randomUUID();
    const acquired = await resultify(() =>
      redis.set(lock, token, { nx: true, ex: LOCK_SECONDS }),
    );
    if (acquired.success && acquired.data === null)
      return { success: true as const, data: { kind: "busy" as const } };

    const destination = await (async () => {
      const owned = await ownedStore(user, entry.host);
      if (owned)
        return { success: true as const, data: `/dashboard/${owned.id}` };

      const connection =
        entry.platform === "shopify"
          ? await Shopify.connectPublic(Environment.SERVER, {
              domain: entry.origin,
            })
          : await WooCommerce.connectPublic(Environment.SERVER, {
              domain: entry.origin,
            });

      if (!connection.success) return connection;

      return {
        success: true as const,
        data: connection.data.reconnected
          ? `/dashboard/${connection.data.store.id}`
          : `/onboarding/products?connected=${entry.platform}`,
      };
    })();

    // Release only a lock this call still holds — never one a later call took
    // after ours lapsed.
    await resultify(async () => {
      if ((await redis.get(lock)) === token) await redis.del(lock);
    });

    if (!destination.success) {
      const outcome = (() => {
        switch (destination.error.name) {
          case "conflict-error":
            return "claimed" as const;
          // A closed public catalog — the probe saw it open, but a store can
          // lock its API between the hero and the import.
          case "validation-error":
            return "locked" as const;
          default:
            return null;
        }
      })();

      if (!outcome) return destination;

      await write({ ...entry, status: outcome });
      return { success: true as const, data: { kind: outcome } };
    }

    jar.delete(ENTRY_COOKIE);
    return redirect({ href: destination.data, locale: language });
  },
  "Entry.connect",
);

/**
 * Forgets the entry — "Choose another way", or skipping the connect step — and
 * continues to `href`. Only internal paths are honoured; anything else lands
 * on the platform grid.
 */
export const dismiss = withContext(
  async (
    _,
    { locale, href = "/onboarding/connect" }: { locale: string; href?: string },
  ) => {
    (await cookies()).delete(ENTRY_COOKIE);
    return redirect({
      href: sanitizeRedirect(href, "/onboarding/connect"),
      locale: localeOf(locale),
    });
  },
  "Entry.dismiss",
);
