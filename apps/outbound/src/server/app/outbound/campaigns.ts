import "server-only";

import { randomUUID } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { companyExcluded, normalizeDomain, splitList } from "@/lib/outbound";
import {
  type Campaign,
  type CampaignCompany,
  type CampaignCriteria,
  type CampaignDiscoveryState,
  type CampaignRun,
  campaignCountryMatches,
  campaignCriteriaSchema,
  campaignStatusSchema,
  candidateExclusion,
  defaultCampaignCriteria,
  initialCampaignDiscoveryState,
} from "@/lib/outbound-campaigns";
import { claudePreviewSchema } from "@/lib/outbound-claude";
import { db, schema, type TransactionScope } from "@/server/database";
import { Environment } from "@/server/utils/environment";
import { ConflictError, NotFoundError } from "@/server/utils/error";
import * as Providers from "@/server/utils/outbound/company-discovery";
import { IntegrationError } from "@/server/utils/outbound/http";
import { repository, resultifyRead } from "@/server/utils/repository";
import * as Store from "./store";

const Campaigns = repository(schema.outboundCampaign);
const Companies = repository(schema.outboundCampaignCompany);
const Runs = repository(schema.outboundCampaignRun);
const ExistingCompanies = repository(schema.outboundCompany);
const Prospects = repository(schema.outboundProspect);
const Revisions = repository(schema.outboundRevision);
const Suppressions = repository(schema.outboundSuppression);
const Events = repository(schema.outboundEvent);
const Generations = repository(schema.outboundIntegrationJob);
const PAGE_SIZE = 25;
type CampaignRow = typeof schema.outboundCampaign.$inferSelect;
type CompanyRow = typeof schema.outboundCampaignCompany.$inferSelect;
type RunRow = typeof schema.outboundCampaignRun.$inferSelect;

const value = <Data>(result: Result<Data, Error>): Data => {
  if (!result.success) throw result.error;
  return result.data as Data;
};
const campaignView = (campaign: CampaignRow): Campaign => ({
  id: campaign.id,
  name: campaign.name,
  status: campaign.status,
  criteria: campaign.criteria,
  revision: campaign.revision,
  answers: campaign.answers,
  createdAt: campaign.createdAt.toISOString(),
  updatedAt: campaign.updatedAt.toISOString(),
});
const companyView = (company: CompanyRow): CampaignCompany => ({
  id: company.id,
  campaignId: company.campaignId,
  domain: company.domain,
  name: company.name,
  website: company.website,
  country: company.country,
  platform: company.platform,
  teamSize: company.teamSize,
  annualRevenue: company.annualRevenue,
  source: company.source,
  sourceId: company.sourceId,
  status: company.status,
  reason: company.reason,
  prospectId: company.prospectId,
  criteriaRevision: company.criteriaRevision,
  createdAt: company.createdAt.toISOString(),
  updatedAt: company.updatedAt.toISOString(),
});
const runView = (run: RunRow): CampaignRun => ({
  id: run.id,
  campaignId: run.campaignId,
  provider: run.provider,
  operation: run.operation,
  status: run.status,
  criteriaRevision: run.criteriaRevision,
  companyCount: run.companyCount,
  error: run.error,
  startedAt: run.startedAt.toISOString(),
  completedAt: run.completedAt?.toISOString() ?? null,
});
const transaction = <Data>(
  operation: (transaction: TransactionScope) => Promise<Data>,
) =>
  resultify(() =>
    db.transaction(async (transaction) => {
      // Shared with prospect promotion, policy updates, approvals and final send checks.
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext('ecentic-outbound-workspace'))`,
      );
      return operation(transaction);
    }),
  );
const readWithin = async (id: string, transaction?: TransactionScope) => {
  const campaign = value(
    await Campaigns.get(Environment.SERVER, id, { tx: transaction }),
  );
  if (!campaign) throw new NotFoundError("Campaign not found.");
  return campaign;
};
const checkRevision = (campaign: CampaignRow, revision: number) => {
  if (campaign.revision !== revision)
    throw new ConflictError("campaign-criteria-changed");
};
const pageSchema = z.number().int().min(1).max(100000).default(1);
const idSchema = z.string().uuid();

export const list = (
  input: {
    page?: number;
    q?: string;
    status?: Campaign["status"] | "all";
  } = {},
) =>
  resultify(async () => {
    const query = z
      .object({
        page: pageSchema,
        q: z.string().trim().max(200).default(""),
        status: z
          .union([campaignStatusSchema, z.literal("all")])
          .default("all"),
      })
      .parse(input);
    const pattern = `%${query.q.replace(/[!%_]/g, "!$&")}%`;
    const where = and(
      query.status === "all"
        ? undefined
        : eq(schema.outboundCampaign.status, query.status),
      query.q
        ? sql`${schema.outboundCampaign.name} ilike ${pattern} escape '!'`
        : undefined,
    );
    const total = value(await Campaigns.count(Environment.SERVER, where));
    const page = Math.min(
      query.page,
      Math.max(1, Math.ceil(total / PAGE_SIZE)),
    );
    const rows = value(
      await Campaigns.paginate(Environment.SERVER, page, PAGE_SIZE, {
        where,
        orderBy: [
          { column: schema.outboundCampaign.updatedAt, direction: "desc" },
          { column: schema.outboundCampaign.id, direction: "asc" },
        ],
      }),
    );
    return {
      rows: rows.items.map(campaignView),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  });

/** Navigation context needs the label only, not company/provider discovery payloads. */
export const getSummary = (input: { id: string }) =>
  resultify(async () => {
    const id = idSchema.parse(input.id);
    const rows = value(
      await resultifyRead(() =>
        db
          .select({
            id: schema.outboundCampaign.id,
            name: schema.outboundCampaign.name,
          })
          .from(schema.outboundCampaign)
          .where(eq(schema.outboundCampaign.id, id))
          .limit(1),
      ),
    );
    const campaign = rows[0];
    if (!campaign) throw new NotFoundError("Campaign not found.");
    return campaign;
  });

export const get = (input: { id: string; page?: number }) =>
  resultify(async () => {
    const parsed = z.object({ id: idSchema, page: pageSchema }).parse(input);
    const campaign = await readWithin(parsed.id);
    const where = eq(schema.outboundCampaignCompany.campaignId, parsed.id);
    const total = value(await Companies.count(Environment.SERVER, where));
    const page = Math.min(
      parsed.page,
      Math.max(1, Math.ceil(total / PAGE_SIZE)),
    );
    const [companies, runs] = await Promise.all([
      Companies.paginate(Environment.SERVER, page, PAGE_SIZE, {
        where,
        orderBy: [
          {
            column: schema.outboundCampaignCompany.createdAt,
            direction: "desc",
          },
          { column: schema.outboundCampaignCompany.id, direction: "asc" },
        ],
      }),
      Runs.find(Environment.SERVER, {
        where: eq(schema.outboundCampaignRun.campaignId, parsed.id),
        limit: 1,
        orderBy: [
          { column: schema.outboundCampaignRun.startedAt, direction: "desc" },
        ],
      }),
    ]);
    return {
      campaign: campaignView(campaign),
      companies: {
        rows: value(companies).items.map(companyView),
        total,
        page,
        pageSize: PAGE_SIZE,
      },
      latestRun: value(runs)[0] ? runView(value(runs)[0] as RunRow) : null,
      discoveryState: campaign.discoveryState,
    };
  });

export const create = (actor: string, input: { name: string }) =>
  transaction(async (transaction) => {
    const parsed = z
      .strictObject({ name: z.string().trim().min(1).max(120) })
      .parse(input);
    const settings = await Store.policy(transaction);
    const campaign = value(
      await Campaigns.create(
        Environment.SERVER,
        {
          name: parsed.name,
          criteria: defaultCampaignCriteria(settings.settings),
          createdBy: actor,
          updatedBy: actor,
        },
        { tx: transaction },
      ),
    );
    value(
      await Events.create(
        Environment.SERVER,
        { actor, kind: "campaignCreated", detail: campaign.name },
        { tx: transaction },
      ),
    );
    return { id: campaign.id };
  });

export const update = (
  actor: string,
  input: {
    id: string;
    name: string;
    status: Campaign["status"];
    expectedRevision: number;
  },
) =>
  transaction(async (transaction) => {
    const parsed = z
      .strictObject({
        id: idSchema,
        name: z.string().trim().min(1).max(120),
        status: campaignStatusSchema,
        expectedRevision: z.number().int().positive(),
      })
      .parse(input);
    const campaign = await readWithin(parsed.id, transaction);
    checkRevision(campaign, parsed.expectedRevision);
    // Metadata is not a targeting change. In particular, activating a reviewed
    // campaign must not make all its researched companies stale.
    value(
      await Campaigns.update(
        Environment.SERVER,
        campaign.id,
        {
          name: parsed.name,
          status: parsed.status,
          updatedBy: actor,
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    return { id: campaign.id, revision: campaign.revision };
  });

export const saveCriteria = (
  actor: string,
  input: {
    id: string;
    expectedRevision: number;
    criteria: CampaignCriteria;
    answers: string;
    claudeGenerationId?: string;
  },
) =>
  transaction(async (transaction) => {
    const parsed = z
      .strictObject({
        id: idSchema,
        expectedRevision: z.number().int().positive(),
        criteria: campaignCriteriaSchema,
        answers: z.string().max(50000),
        claudeGenerationId: idSchema.optional(),
      })
      .parse(input);
    const campaign = await readWithin(parsed.id, transaction);
    checkRevision(campaign, parsed.expectedRevision);
    if (parsed.claudeGenerationId) {
      const generation = value(
        await Generations.get(Environment.SERVER, parsed.claudeGenerationId, {
          tx: transaction,
        }),
      );
      const preview = claudePreviewSchema.safeParse(generation?.output);
      if (
        generation?.provider !== "claude" ||
        generation.input["operation"] !== "campaignCriteria" ||
        !["complete", "uncertain"].includes(generation.status) ||
        !preview.success ||
        preview.data.requestId !== generation.id ||
        generation.input["campaignId"] !== campaign.id ||
        preview.data.campaignId !== campaign.id ||
        generation.input["expectedRevision"] !==
          preview.data.campaignRevision ||
        generation.input["playbookRevision"] !== preview.data.playbookRevision
      )
        throw new ConflictError("campaign-generation-invalid");
      if (campaign.status === "archived")
        throw new ConflictError("campaign-archived");
      checkRevision(campaign, preview.data.campaignRevision);
      // The preview can remain open while another staff member edits policy.
      // Validate its original context under the same lock as the final save.
      const policy = await Store.policy(transaction);
      if (policy.revision !== preview.data.playbookRevision)
        throw new ConflictError("campaign-playbook-changed");
    }
    const changed =
      JSON.stringify(campaign.criteria) !== JSON.stringify(parsed.criteria);
    const revision = campaign.revision + Number(changed);
    value(
      await Campaigns.update(
        Environment.SERVER,
        campaign.id,
        {
          criteria: parsed.criteria,
          answers: parsed.answers,
          revision,
          ...(changed
            ? { discoveryState: initialCampaignDiscoveryState() }
            : {}),
          updatedBy: actor,
          updatedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    if (!changed) return { id: campaign.id, revision };
    const prospects = value(
      await Prospects.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundProspect.campaignId, campaign.id),
            inArray(schema.outboundProspect.status, [
              "candidate",
              "draft",
              "approved",
              "active",
              "held",
            ]),
          ),
        },
        { tx: transaction },
      ),
    );
    for (const prospect of prospects) {
      value(
        await Prospects.update(
          Environment.SERVER,
          prospect.id,
          {
            status: prospect.sentStep
              ? "held"
              : prospect.messages.length
                ? "draft"
                : "candidate",
            approvedAt: null,
            approvedBy: null,
            approvalHash: null,
            nextSendAt: null,
            holdReason: "campaignCriteriaChanged",
            revision: prospect.revision + 1,
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
      const revisions = value(
        await Revisions.find(
          Environment.SERVER,
          { where: eq(schema.outboundRevision.prospectId, prospect.id) },
          { tx: transaction },
        ),
      );
      for (const version of revisions.filter(
        (version) => version.approvedAt && !version.revokedAt,
      ))
        value(
          await Revisions.update(
            Environment.SERVER,
            version.id,
            {
              revokedAt: new Date(),
              revokeReason: "Campaign criteria changed",
            },
            { tx: transaction },
          ),
        );
    }
    const companies = value(
      await Companies.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundCampaignCompany.campaignId, campaign.id),
            eq(schema.outboundCampaignCompany.status, "candidate"),
          ),
        },
        { tx: transaction },
      ),
    );
    for (const company of companies)
      value(
        await Companies.update(
          Environment.SERVER,
          company.id,
          {
            status: "excluded",
            reason: "criteriaChanged",
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
    value(
      await Events.create(
        Environment.SERVER,
        {
          actor,
          kind: "campaignCriteriaUpdated",
          detail: `${campaign.name}: criteria revision ${revision}; ${prospects.length} prospects returned to review.`,
        },
        { tx: transaction },
      ),
    );
    return { id: campaign.id, revision };
  });

const runInputSchema = z.strictObject({
  id: idSchema,
  expectedRevision: z.number().int().positive(),
  provider: z.enum(["auto", "apollo", "clay"]).default("auto"),
});
type RunInput = z.input<typeof runInputSchema>;

export type DiscoveryOptions = {
  /** Internal scheduler guard; evaluated with the durable reservation under the workspace lock. */
  guard?: (
    transaction: TransactionScope,
    campaign: CampaignRow,
  ) => Promise<void>;
  singleOperation?: boolean;
  deadline?: number;
};

const reserve = (
  actor: string,
  input: RunInput,
  options: DiscoveryOptions = {},
) =>
  transaction(async (transaction) => {
    const parsed = runInputSchema.parse(input);
    const campaign = await readWithin(parsed.id, transaction);
    checkRevision(campaign, parsed.expectedRevision);
    if (!["draft", "active"].includes(campaign.status))
      throw new ConflictError("campaign-paused");
    if (
      options.deadline !== undefined &&
      Date.now() >= options.deadline - 25_000
    )
      throw new ConflictError("campaign-discovery-deadline");
    await options.guard?.(transaction, campaign);
    const pending = value(
      await Runs.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundCampaignRun.campaignId, campaign.id),
            inArray(schema.outboundCampaignRun.status, [
              "starting",
              "uncertain",
            ]),
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    );
    if (pending.length) throw new ConflictError("campaign-run-unresolved");
    const state = campaign.discoveryState;
    const provider =
      parsed.provider === "auto"
        ? state.apolloExhausted
          ? "clay"
          : "apollo"
        : parsed.provider;
    if (
      (provider === "apollo" && state.apolloExhausted) ||
      (provider === "clay" && state.clayExhausted)
    )
      throw new ConflictError("campaign-source-exhausted");
    const operation =
      provider === "apollo"
        ? "apolloPage"
        : state.claySearchId
          ? "clayPage"
          : "clayStart";
    const run = value(
      await Runs.create(
        Environment.SERVER,
        {
          campaignId: campaign.id,
          requestId: randomUUID(),
          provider,
          operation,
          criteriaRevision: campaign.revision,
          criteria: campaign.criteria,
          cursor:
            provider === "apollo"
              ? { page: state.apolloPage, limit: PAGE_SIZE }
              : { searchId: state.claySearchId, limit: PAGE_SIZE },
          createdBy: actor,
          startedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    return run;
  });

const sharedExclusion = async (
  transaction: TransactionScope,
  campaign: CampaignRow,
  company: Providers.CompanyCandidate,
) => {
  const mismatch = candidateExclusion(campaign.criteria, company);
  if (mismatch) return mismatch;
  const policy = (await Store.policy(transaction)).settings;
  const domain = normalizeDomain(company.domain);
  if (splitList(policy.excludedDomains).map(normalizeDomain).includes(domain))
    return "playbookDomainExcluded";
  if (companyExcluded(policy, company.name)) return "playbookCompanyExcluded";
  if (
    company.country &&
    (!campaignCountryMatches(
      splitList(policy.allowedCountries),
      company.country,
    ) ||
      campaignCountryMatches(splitList(policy.heldCountries), company.country))
  )
    return "countryMismatch";
  const suppressed = value(
    await Suppressions.find(Environment.SERVER, {}, { tx: transaction }),
  );
  if (
    suppressed.some(
      (entry) =>
        normalizeDomain(
          entry.scope === "domain"
            ? entry.value
            : (entry.value.split("@")[1] ?? ""),
        ) === domain,
    )
  )
    return "suppressed";
  const existing = value(
    await ExistingCompanies.find(
      Environment.SERVER,
      { where: eq(schema.outboundCompany.domain, domain), limit: 1 },
      { tx: transaction },
    ),
  )[0];
  if (existing) {
    if (existing.relationship !== "cold") return "relationshipExcluded";
    if (
      existing.lastContactedAt &&
      Date.now() - existing.lastContactedAt.getTime() < 180 * 86400000
    )
      return "companyContacted";
    const prospects = value(
      await Prospects.find(
        Environment.SERVER,
        { where: eq(schema.outboundProspect.companyId, existing.id), limit: 1 },
        { tx: transaction },
      ),
    );
    if (prospects.length) return "existingProspect";
  }
  const peers = value(
    await Companies.find(
      Environment.SERVER,
      {
        where: and(
          eq(schema.outboundCampaignCompany.domain, domain),
          ne(schema.outboundCampaignCompany.campaignId, campaign.id),
          inArray(schema.outboundCampaignCompany.status, [
            "candidate",
            "added",
          ]),
        ),
      },
      { tx: transaction },
    ),
  );
  if (peers.length) return "otherCampaign";
  return null;
};

const persistCompanies = async (
  transaction: TransactionScope,
  campaign: CampaignRow,
  candidates: Providers.CompanyCandidate[],
) => {
  const domains = [
    ...new Set(
      candidates
        .map((company) => normalizeDomain(company.domain))
        .filter(Boolean),
    ),
  ];
  // Project presence only: provider receipts and contact records are not needed for novelty.
  const prior = domains.length
    ? await Promise.all([
        resultifyRead(
          () =>
            transaction
              .select({ domain: schema.outboundCampaignCompany.domain })
              .from(schema.outboundCampaignCompany)
              .where(inArray(schema.outboundCampaignCompany.domain, domains)),
          { tx: transaction },
        ),
        resultifyRead(
          () =>
            transaction
              .select({ domain: schema.outboundCompany.domain })
              .from(schema.outboundCompany)
              .where(inArray(schema.outboundCompany.domain, domains)),
          { tx: transaction },
        ),
      ])
    : [];
  const knownDomains = new Set(
    prior.flatMap((result) => value(result).map((row) => row.domain)),
  );
  const newCompanyDomains = new Set<string>();
  const records = [] as { status: "candidate" | "excluded" | "added" }[];
  for (const company of candidates) {
    const domain = normalizeDomain(company.domain);
    if (!domain) continue;
    const existing = value(
      await Companies.find(
        Environment.SERVER,
        {
          where: and(
            eq(schema.outboundCampaignCompany.campaignId, campaign.id),
            eq(schema.outboundCampaignCompany.domain, domain),
          ),
          limit: 1,
        },
        { tx: transaction },
      ),
    )[0];
    if (
      existing?.status === "added" ||
      (existing?.status === "candidate" &&
        existing.criteriaRevision === campaign.revision)
    ) {
      // The first source owns this campaign candidate. A secondary result stays
      // in the run receipt without overwriting known Apollo facts with nulls.
      continue;
    }
    const reason = await sharedExclusion(transaction, campaign, company);
    const status = reason ? ("excluded" as const) : ("candidate" as const);
    const record = {
      ...company,
      domain,
      campaignId: campaign.id,
      criteriaRevision: campaign.revision,
      reason: reason ?? "",
      status,
      updatedAt: new Date(),
    };
    if (existing)
      value(
        await Companies.update(Environment.SERVER, existing.id, record, {
          tx: transaction,
        }),
      );
    else
      value(
        await Companies.create(Environment.SERVER, record, { tx: transaction }),
      );
    if (status === "candidate" && !knownDomains.has(domain))
      newCompanyDomains.add(domain);
    knownDomains.add(domain);
    records.push({ status });
  }
  return {
    added: records.filter((record) => record.status === "candidate").length,
    excluded: records.filter((record) => record.status === "excluded").length,
    newCompanyDomains: [...newCompanyDomains],
  };
};

const failure = (run: RunRow, error: Error) =>
  transaction(async (transaction) => {
    const current = value(
      await Runs.get(Environment.SERVER, run.id, { tx: transaction }),
    );
    if (!current) throw new NotFoundError("Campaign run not found.");
    // A commit whose acknowledgement was lost may already have stored the page.
    // Do not overwrite its durable completed outcome while handling that error.
    if (current.status !== "starting")
      return {
        run: runView(current),
        companyCount: current.companyCount,
        added: 0,
        excluded: 0,
      };
    const certain =
      error instanceof IntegrationError &&
      ["configuration", "input", "access", "quota", "rate-limit"].includes(
        error.code,
      );
    const updated = value(
      await Runs.update(
        Environment.SERVER,
        run.id,
        {
          status: certain ? "failed" : "uncertain",
          ...(error instanceof IntegrationError && error.receipt
            ? { output: { receipt: error.receipt } }
            : {}),
          error:
            error instanceof IntegrationError
              ? error.providerCode === "advanced_filters_require_plan"
                ? error.provider === "clay"
                  ? "provider-clay-plan-required"
                  : "provider-plan-required"
                : `provider-${error.code}`
              : "provider-uncertain",
          completedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    if (!updated) throw new NotFoundError("Campaign run not found.");
    return { run: runView(updated), companyCount: 0, added: 0, excluded: 0 };
  });

const finish = (
  run: RunRow,
  output: Record<string, unknown>,
  next: Partial<CampaignDiscoveryState>,
  companies: Providers.CompanyCandidate[] = [],
) =>
  transaction(async (transaction) => {
    const campaign = await readWithin(run.campaignId, transaction);
    const current = value(
      await Runs.get(Environment.SERVER, run.id, { tx: transaction }),
    );
    if (current?.status !== "starting")
      throw new ConflictError("campaign-run-unresolved");
    const stale = campaign.revision !== run.criteriaRevision;
    const counts = stale
      ? { added: 0, excluded: 0, newCompanyDomains: [] }
      : await persistCompanies(transaction, campaign, companies);
    if (!stale)
      value(
        await Campaigns.update(
          Environment.SERVER,
          campaign.id,
          {
            discoveryState: { ...campaign.discoveryState, ...next },
            updatedAt: new Date(),
          },
          { tx: transaction },
        ),
      );
    const updated = value(
      await Runs.update(
        Environment.SERVER,
        run.id,
        {
          status: "completed",
          output: { ...output, acquisition: { version: 1, ...counts } },
          companyCount: companies.length,
          error: stale ? "campaign-criteria-changed" : null,
          completedAt: new Date(),
        },
        { tx: transaction },
      ),
    );
    if (!updated) throw new NotFoundError("Campaign run not found.");
    return {
      run: runView(updated),
      companyCount: companies.length,
      added: counts.added,
      excluded: counts.excluded,
    };
  });

/** One user action consumes at most one 25-company page. Clay search creation is
 * separately committed so a lost page response cannot reset its iterator. */
export const discover = (
  actor: string,
  input: RunInput,
  providers: Pick<
    typeof Providers,
    "searchApolloCompanies" | "startClayCompanySearch" | "nextClayCompanies"
  > = Providers,
  options: DiscoveryOptions = {},
) =>
  resultify(async () => {
    const reserved = value(await reserve(actor, input, options));
    const execute = async (run: RunRow) => {
      switch (run.operation) {
        case "apolloPage": {
          const result = await providers.searchApolloCompanies({
            criteria: run.criteria,
            page: Number(run.cursor["page"]),
            limit: PAGE_SIZE,
          });
          if (!result.success) return value(await failure(run, result.error));
          return value(
            await finish(
              run,
              result.data,
              {
                apolloPage: result.data.nextPage ?? Number(run.cursor["page"]),
                apolloExhausted: result.data.nextPage === null,
              },
              result.data.companies,
            ),
          );
        }
        case "clayStart": {
          const result = await providers.startClayCompanySearch({
            criteria: run.criteria,
          });
          if (!result.success) return value(await failure(run, result.error));
          return value(
            await finish(run, result.data, {
              claySearchId: result.data.searchId,
            }),
          );
        }
        case "clayPage": {
          const result = await providers.nextClayCompanies({
            searchId: String(run.cursor["searchId"]),
            limit: PAGE_SIZE,
          });
          if (!result.success) return value(await failure(run, result.error));
          return value(
            await finish(
              run,
              result.data,
              { clayExhausted: !result.data.hasMore },
              result.data.companies,
            ),
          );
        }
      }
    };
    const executed = await resultify(() => execute(reserved));
    if (!executed.success)
      return value(await failure(reserved, executed.error));
    if (
      reserved.operation !== "clayStart" ||
      options.singleOperation ||
      executed.data.run.status !== "completed" ||
      executed.data.run.error
    )
      return executed.data;
    const page = value(
      await reserve(actor, { ...input, provider: "clay" }, options),
    );
    const completed = await resultify(() => execute(page));
    return completed.success
      ? completed.data
      : value(await failure(page, completed.error));
  });

export const readCompany = (id: string) =>
  Companies.get(Environment.SERVER, idSchema.parse(id));

/** Recheck current workspace exclusions immediately before people research. */
export const researchContext = (input: { campaign: string; company: string }) =>
  transaction(async (transaction) => {
    const parsed = z
      .strictObject({ campaign: idSchema, company: idSchema })
      .parse(input);
    const campaign = await readWithin(parsed.campaign, transaction);
    const company = value(
      await Companies.get(Environment.SERVER, parsed.company, {
        tx: transaction,
      }),
    );
    if (!company || company.campaignId !== campaign.id)
      throw new NotFoundError("Campaign company not found.");
    if (
      company.status !== "candidate" ||
      !["draft", "active"].includes(campaign.status)
    )
      throw new ConflictError("campaign-paused");
    if (company.criteriaRevision !== campaign.revision)
      throw new ConflictError("campaign-criteria-changed");
    const reason = await sharedExclusion(transaction, campaign, company);
    if (reason) throw new ConflictError(`campaign-company-${reason}`);
    return { campaign, company };
  });
