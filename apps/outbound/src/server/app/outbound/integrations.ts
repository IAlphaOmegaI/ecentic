"use server";

import { resultify } from "@zenncore/utils";
import { z } from "zod";
import {
  companyExcluded,
  normalizeDomain,
  prospectIssues,
  recipientMailHostAllowed,
  type SenderProfile,
  settingsForProspect,
  splitList,
} from "@/lib/outbound";
import { evidenceDateUsable } from "@/lib/outbound-evidence";
import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/utils/error";
import * as Draft from "@/server/utils/outbound/draft";
import { IntegrationError } from "@/server/utils/outbound/http";
import * as MX from "@/server/utils/outbound/mx";
import * as Providers from "@/server/utils/outbound/providers";
import * as Research from "@/server/utils/outbound/research";
import * as Unipile from "@/server/utils/outbound/unipile";

import * as Jobs from "./jobs";
import * as LinkedInAccounts from "./linkedin-accounts";
import * as Preparation from "./preparation";
import * as Credentials from "./provider-credentials";
import * as Store from "./store";
import * as Mailboxes from "./transport-store";
import * as Worker from "./worker";

const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const prospect = async (id: string) => {
  if (!z.string().uuid().safeParse(id).success)
    throw new ValidationError("Choose a prospect.");
  const row = value(await Store.readProspect(id));
  if (!row) throw new NotFoundError("Prospect not found.");
  return row;
};

const eligibleForEnrichment = async (id: string, roleCheck = false) => {
  if (!z.string().uuid().safeParse(id).success)
    throw new ValidationError("Choose a prospect.");
  const context = value(await Store.getEnrichmentContext(id));
  const { prospect: row, settings } = context;
  const details = row.details;
  const domain = normalizeDomain(details.domain);
  const countries = (value: string) =>
    splitList(value).map((country) => country.toUpperCase());
  const now = Date.now();
  const fresh = (timestamp: string, days: number) => {
    const checkedAt = Date.parse(timestamp);
    return (
      Number.isFinite(checkedAt) &&
      checkedAt <= now &&
      now - checkedAt < days * 86400_000
    );
  };
  if (
    row.sentStep ||
    !["candidate", "draft", "held", "approved"].includes(row.status) ||
    context.suppressed ||
    context.lastContactedAt ||
    details.relationship !== "cold" ||
    !domain ||
    companyExcluded(settings, details.company) ||
    splitList(settings.excludedDomains).map(normalizeDomain).includes(domain) ||
    !countries(settings.allowedCountries).includes(details.country) ||
    countries(settings.heldCountries).includes(details.country) ||
    !["shopify", "woocommerce"].includes(details.platform)
  )
    throw new ValidationError(
      "This company is outside the cold-outreach policy or already has contact history. No paid lookup was started.",
    );
  if (
    !details.product ||
    !details.productUrl ||
    !details.gap ||
    !details.finding ||
    !details.evidence ||
    !details.findingReviewed ||
    prospectIssues(details, settings).some(
      (issue) => issue.code === "findingReviewRequired",
    ) ||
    normalizeDomain(details.productUrl) !== domain ||
    !evidenceDateUsable(details.evidenceCheckedAt, settings, now)
  )
    throw new ValidationError(
      "Review a current product finding on this company's domain before spending on contact lookup or enrichment.",
    );
  // Initial Apollo lookup can precede having an email address to check MX for.
  if (
    details.mxProvider === "microsoft" &&
    !recipientMailHostAllowed(details.mxProvider, settings)
  )
    throw new ValidationError(
      "Check an enabled recipient mail host before enrichment. No paid lookup was started.",
    );
  if (
    roleCheck &&
    (!details.title.trim() ||
      (!details.linkedinUrl.trim() && !details.name.trim()) ||
      !details.email ||
      details.emailStatus !== "verified" ||
      !details.emailSource ||
      normalizeDomain(details.email.split("@")[1] ?? "") !== domain ||
      !fresh(details.emailVerifiedAt, settings.emailVerificationDays) ||
      details.mxProvider === "unknown" ||
      !fresh(details.mxCheckedAt, 1))
  )
    throw new ValidationError(
      "Clay's role check needs a sourced contact and title, a current verified work-email receipt, and a checked enabled mail host. No routine was started.",
    );
  return row;
};
const failJob = async (job: Jobs.Job, error: Error) => {
  value(
    await Jobs.update(job.id, {
      status:
        error instanceof IntegrationError &&
        ["uncertain", "contract"].includes(error.code)
          ? "uncertain"
          : "failed",
      error: error.message,
    }),
  );
  throw error;
};

export const connectDirectMailbox = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { email: string; appPassword: string }) =>
    Mailboxes.connectDirect(context.session.user.id, input),
  "OutboundIntegrations.connectDirectMailbox",
);

export const saveUnipileKey = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { apiKey: string }) =>
    Credentials.save(context.session.user.id, {
      provider: "unipile",
      apiKey: input?.apiKey,
    }),
  "OutboundIntegrations.saveUnipileKey",
);

export const saveProviderCredentials = withAuthorization(
  [UserRole.STAFF],
  async (
    context,
    input: {
      provider: "apollo" | "clay" | "google" | "scrapellm" | "firecrawl";
      apiKey: string;
      configuration?: { routineId?: string; clientId?: string };
    },
  ) => {
    if (
      !z
        .enum(["apollo", "clay", "google", "scrapellm", "firecrawl"])
        .safeParse(input?.provider).success
    )
      return {
        success: false as const,
        error: new ValidationError("provider-key-invalid"),
      };
    return Credentials.save(context.session.user.id, input);
  },
  "OutboundIntegrations.saveProviderCredentials",
);

const clayStatus = async () => {
  const metadata = value(await Credentials.metadata("clay"));
  return {
    configured: metadata.configured,
    routineConfigured: Boolean(metadata.configuration.routineId?.trim()),
  };
};

export const getClayStatus = withAuthorization(
  [UserRole.STAFF],
  async () => resultify(clayStatus),
  "OutboundIntegrations.getClayStatus",
);

export const getStatus = withAuthorization(
  [UserRole.STAFF],
  async () =>
    resultify(async () => {
      const [inboxes, jobs, linkedin, providers] = await Promise.all([
        Store.getInboxSummaries(),
        Jobs.listMetadata(),
        Unipile.getConfiguration(),
        Providers.getIntegrationStatus(),
      ]);
      return {
        ...providers,
        linkedin: {
          ...linkedin,
          accounts: linkedin.configured
            ? value(await LinkedInAccounts.list())
            : [],
        },
        inboxes: value(inboxes),
        jobs: value(jobs).map(
          ({
            id,
            provider,
            prospectId,
            requestId,
            status,
            error,
            createdAt,
            updatedAt,
          }) => ({
            id,
            provider,
            prospectId,
            requestId,
            status,
            error,
            createdAt: createdAt.toISOString(),
            updatedAt: updatedAt.toISOString(),
          }),
        ),
      };
    }),
  "OutboundIntegrations.getStatus",
);

export const refreshLinkedInAccount = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { accountId: string }) =>
    resultify(async () => {
      const id = z.string().min(1).max(200).parse(input.accountId);
      value(await LinkedInAccounts.requireAccount(id));
      const account = value(await Unipile.getAccount(id));
      if (account.id !== id)
        throw new ValidationError("LinkedIn account did not match.");
      return value(
        await LinkedInAccounts.save(context.session.user.id, account),
      );
    }),
  "OutboundIntegrations.refreshLinkedInAccount",
);

export const searchPeople = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { domain: string }) =>
    resultify(async () => {
      const settings = (await Store.policy()).settings;
      return value(
        await Providers.searchApolloPeople({
          domain: input.domain,
          titles: splitList(settings.targetRoles),
          excludedTitles: splitList(settings.excludedRoles),
        }),
      );
    }),
  "OutboundIntegrations.searchPeople",
);

export const enrichProspect = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { prospectId: string }) =>
    resultify(async () => {
      const row = await eligibleForEnrichment(input.prospectId);
      const job = value(
        await Jobs.reserve("apollo", row.id, {
          operation: "enrich",
          revision: row.revision,
          name: row.details.name,
          domain: row.details.domain,
        }),
      );
      const enriched = await Providers.enrichApolloPerson({
        name: row.details.name,
        domain: row.details.domain,
        ...(row.details.linkedinUrl
          ? { linkedinUrl: row.details.linkedinUrl }
          : {}),
      });
      if (!enriched.success) return failJob(job, enriched.error);
      value(
        await Jobs.update(job.id, {
          status: "complete",
          output: { person: enriched.data },
        }),
      );
      if (!enriched.data)
        throw new NotFoundError("Apollo did not return a matching person.");
      if (
        enriched.data.domain.toLowerCase() !==
          row.details.domain.toLowerCase() ||
        !["high", "exact"].includes(enriched.data.matchConfidence.toLowerCase())
      )
        throw new ConflictError(
          "Apollo's employer or match confidence needs manual review. The source result is retained; prospect data was not replaced.",
        );
      const person = enriched.data;
      return value(
        await Store.patchProspect(
          context.session.user.id,
          row.id,
          {
            name: person.name || row.details.name,
            first: person.first || row.details.first,
            title: person.title || row.details.title,
            email: person.email || row.details.email,
            emailStatus: "unknown",
            emailVerifiedAt: "",
            emailSource: person.email
              ? `Apollo person ${person.id}`
              : row.details.emailSource,
            linkedinUrl: person.linkedinUrl || row.details.linkedinUrl,
          },
          row.revision,
        ),
      );
    }),
  "OutboundIntegrations.enrichProspect",
);

export const verifyProspect = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { prospectId: string }) =>
    resultify(async () => {
      const row = await eligibleForEnrichment(input.prospectId);
      if (!row.details.email || !row.details.emailSource)
        throw new ValidationError(
          "Save a sourced work address and its source before verification.",
        );
      const job = value(
        await Jobs.reserve("apollo", row.id, {
          operation: "verify",
          revision: row.revision,
          email: row.details.email,
        }),
      );
      const started = await Providers.verifyApolloEmails({
        emails: [row.details.email],
      });
      if (!started.success) return failJob(job, started.error);
      value(
        await Jobs.update(job.id, {
          status: "pending",
          requestId: started.data.requestId,
          output: { records: started.data.records },
        }),
      );
      return {
        jobId: job.id,
        requestId: started.data.requestId,
        status: "pending" as const,
      };
    }),
  "OutboundIntegrations.verifyProspect",
);

export const pollVerification = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { prospectId: string }) =>
    resultify(async () => {
      const row = await prospect(input.prospectId);
      const latest = value(await Jobs.find("apollo", row.id));
      if (!latest) throw new NotFoundError("Start email verification first.");
      const job = value(await Jobs.beginPoll(latest.id));
      if (!job)
        throw new ConflictError(
          "The verification job expired. Review its status before submitting again.",
        );
      const polled = await Providers.pollApolloVerification({
        requestId: job.requestId ?? "",
      });
      if (!polled.success) return failJob(job, polled.error);
      value(
        await Jobs.update(job.id, {
          status: polled.data.status === "pending" ? "pending" : "complete",
          output: { ...job.output, results: polled.data.results },
          error: null,
        }),
      );
      if (polled.data.status === "pending")
        return { status: "pending" as const };
      const accepted = z
        .array(
          z.object({
            record_id: z.string(),
            input: z.object({ email: z.string() }),
          }),
        )
        .safeParse(job.output?.["records"]);
      const matching = polled.data.results.filter(
        (entry) =>
          entry.email.toLowerCase() ===
            String(job.input["email"]).toLowerCase() &&
          accepted.success &&
          accepted.data.some(
            (record) =>
              record.record_id === entry.recordId &&
              record.input.email.toLowerCase() === entry.email.toLowerCase(),
          ),
      );
      const verification = matching.length === 1 ? matching[0] : undefined;
      if (
        !verification ||
        row.details.email.toLowerCase() !==
          String(job.input["email"]).toLowerCase()
      )
        throw new ConflictError(
          "No verified result matched this prospect's current email. Review the provider response.",
        );
      const settings = (await Store.policy()).settings;
      const checkedAt = verification.verifiedAt
        ? Date.parse(verification.verifiedAt)
        : Number.NaN;
      const fresh =
        Number.isFinite(checkedAt) &&
        checkedAt <= Date.now() &&
        Date.now() - checkedAt < settings.emailVerificationDays * 86400_000;
      value(
        await Store.patchProspect(
          context.session.user.id,
          row.id,
          {
            emailStatus:
              verification.status === "verified"
                ? fresh
                  ? "verified"
                  : "stale"
                : "unknown",
            emailVerifiedAt: verification.verifiedAt ?? "",
            emailSource: `Apollo verification ${job.requestId}; record ${verification.recordId}`,
          },
          Number(job.input["revision"]),
        ),
      );
      return {
        status:
          fresh && verification.status === "verified"
            ? ("verified" as const)
            : ("held" as const),
        verifiedAt: verification.verifiedAt,
      };
    }),
  "OutboundIntegrations.pollVerification",
);

export const researchProspect = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { prospectId: string }) =>
    resultify(async () => {
      const row = await prospect(input.prospectId);
      if (
        !row.details.productUrl ||
        normalizeDomain(row.details.productUrl) !==
          normalizeDomain(row.details.domain)
      )
        throw new ValidationError(
          "Save a product URL on this company’s domain before researching it.",
        );
      const research = value(
        await Research.checkProduct({ url: row.details.productUrl }),
      );
      value(
        await Store.patchProspect(
          context.session.user.id,
          row.id,
          {
            product: research.product || row.details.product,
            gap: research.gap,
            finding: research.finding,
            evidence: research.evidence,
            evidenceCheckedAt:
              research.status === "verified" ? research.checkedAt : "",
          },
          row.revision,
        ),
      );
      return research;
    }),
  "OutboundIntegrations.researchProspect",
);

export const checkMx = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { prospectId: string }) =>
    resultify(async () => {
      const row = await prospect(input.prospectId);
      const checked = value(await MX.check(row.details.email));
      value(
        await Store.patchProspect(
          context.session.user.id,
          row.id,
          { mxProvider: checked.provider, mxCheckedAt: checked.checkedAt },
          row.revision,
        ),
      );
      return checked;
    }),
  "OutboundIntegrations.checkMx",
);

export const generateDraft = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { prospectId: string }) =>
    resultify(async () => {
      const row = await prospect(input.prospectId);
      const generated = value(
        await Draft.generateDraft(
          row.details,
          settingsForProspect(row, (await Store.policy()).settings),
        ),
      );
      const [first, second, third] = generated.messages;
      if (!first || !second || !third)
        throw new ValidationError("Generate all three messages before saving.");
      return value(
        await Store.saveDraft(context.session.user.id, {
          prospect: row.id,
          revision: row.revision,
          subject: first.subject,
          body: first.body,
          followupOne: second.body,
          followupTwo: third.body,
        }),
      );
    }),
  "OutboundIntegrations.generateDraft",
);

export const startClay = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { prospectIds: string[] }) =>
    resultify(async () => {
      const ids = z
        .array(z.string().uuid())
        .min(1)
        .max(100)
        .parse(input.prospectIds);
      const status = await clayStatus();
      if (!status.configured || !status.routineConfigured)
        throw new ValidationError(
          "Connect a Clay API key and configure an enrichment routine before running enrichment.",
        );
      const prospects = await Promise.all(
        [...new Set(ids)].map((id) => eligibleForEnrichment(id, true)),
      );
      const job = value(
        await Jobs.reserve("clay", null, {
          operation: "routine",
          prospects: prospects.map((row) => row.id),
        }),
      );
      const started = await Providers.startClayEnrichment({
        items: prospects.map((row) => ({
          id: row.id,
          inputs: {
            name: row.details.name,
            domain: row.details.domain,
            linkedin_url: row.details.linkedinUrl,
            email: row.details.email,
            title: row.details.title,
            company: row.details.company,
          },
        })),
      });
      if (!started.success) return failJob(job, started.error);
      value(
        await Jobs.update(job.id, {
          requestId: started.data.runId,
          status: "pending",
        }),
      );
      return {
        jobId: job.id,
        runId: started.data.runId,
        status: "pending" as const,
      };
    }),
  "OutboundIntegrations.startClay",
);

export const pollClay = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { runId: string }) =>
    resultify(async () => {
      const found = value(await Jobs.byRequest(input.runId));
      if (found?.provider !== "clay")
        throw new NotFoundError("Clay run not found.");
      const job = value(await Jobs.beginPoll(found.id));
      if (!job) throw new ConflictError("This Clay job expired.");
      const cursor =
        typeof job.output?.["cursor"] === "string"
          ? job.output["cursor"]
          : undefined;
      const polled = await Providers.pollClayEnrichment({
        runId: input.runId,
        cursor,
      });
      if (!polled.success) return failJob(job, polled.error);
      const existing = Array.isArray(job.output?.["results"])
        ? (job.output["results"] as { id: string }[])
        : [];
      const results = [
        ...new Map(
          [...existing, ...polled.data.results].map((item) => [item.id, item]),
        ).values(),
      ];
      const status =
        polled.data.status === "complete" && !polled.data.cursor
          ? ("complete" as const)
          : ("pending" as const);
      value(
        await Jobs.update(job.id, {
          status,
          output: { ...polled.data, results },
          error: null,
        }),
      );
      return { ...polled.data, results, status };
    }),
  "OutboundIntegrations.pollClay",
);

export const configureInbox = withAuthorization(
  [UserRole.STAFF],
  async (
    context,
    input: {
      inboxId: string;
      enabled: boolean;
      dailyCap: number;
      profile?: Omit<SenderProfile, "email">;
    },
  ) => Mailboxes.configure(context.session.user.id, input),
  "OutboundIntegrations.configureInbox",
);
export const disconnectInbox = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { inboxId: string }) =>
    Mailboxes.disconnect(context.session.user.id, input.inboxId),
  "OutboundIntegrations.disconnectInbox",
);
export const syncInbox = withAuthorization(
  [UserRole.STAFF],
  async () => Worker.syncAll(),
  "OutboundIntegrations.syncInbox",
);
export const runWorker = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { dryRun?: boolean } = { dryRun: true }) =>
    Worker.run(input),
  "OutboundIntegrations.runWorker",
);

export const prepareProspect = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { prospectId: string }) =>
    Preparation.prepare(context.session.user.id, input.prospectId),
  "OutboundIntegrations.prepareProspect",
);
export const prepareBatch = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { prospectIds: string[] }) =>
    resultify(async () => {
      const ids = [
        ...new Set(
          z.array(z.string().uuid()).min(1).max(3).parse(input.prospectIds),
        ),
      ];
      const deadline = Date.now() + 120000;
      const results = [] as {
        prospectId: string;
        status: "verified" | "hold";
        discovered: number;
        checked: number;
        productUrl: string | null;
        reason: string | null;
      }[];
      for (const prospectId of ids) {
        const prepared = await Preparation.prepare(
          context.session.user.id,
          prospectId,
          deadline,
        );
        if (!prepared.success) throw prepared.error;
        results.push(prepared.data);
      }
      return {
        results,
        verified: results.filter((result) => result.status === "verified")
          .length,
        held: results.filter((result) => result.status === "hold").length,
      };
    }),
  "OutboundIntegrations.prepareBatch",
);
