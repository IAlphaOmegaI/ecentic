import "server-only";

import { randomUUID } from "node:crypto";
import type { Result } from "@zenncore/utils";
import { z } from "zod";
import { normalizeDomain, prospectSchema, splitList } from "@/lib/outbound";
import {
  type AutomationStage,
  type AutomationState,
  type ContactAttempt,
  contactAttemptsSchema,
} from "@/lib/outbound-automation";
import { shoppingResearchSchema } from "@/lib/outbound-shopping-research";
import { ConflictError, ValidationError } from "@/server/utils/error";
import * as Qualification from "@/server/utils/outbound/automation-qualification";
import type { CompanyCandidate } from "@/server/utils/outbound/company-discovery";
import * as Draft from "@/server/utils/outbound/draft";
import * as Capture from "@/server/utils/outbound/live-shopping";
import * as MX from "@/server/utils/outbound/mx";
import { productCategoryCorrection } from "@/server/utils/outbound/product-category";
import * as Providers from "@/server/utils/outbound/providers";
import * as ShoppingAssessment from "@/server/utils/outbound/shopping-assessment";
import { researchPolicyHash } from "@/server/utils/outbound/shopping-research";
import type { AutomationClaim } from "./automation";
import * as Campaigns from "./campaigns";
import * as LeadResearch from "./lead-research";
import * as Credentials from "./provider-credentials";
import * as ResearchReadiness from "./research-readiness";
import * as Store from "./store";

export type Transition = {
  stage: AutomationStage;
  output?: Record<string, unknown>;
  reason?: string;
  delayMs?: number;
  normalizeProductCategory?: true;
  companyFacts?: Pick<
    CompanyCandidate,
    "country" | "platform" | "teamSize" | "annualRevenue" | "sourcePayload"
  >;
};
const value = <Data>(result: Result<Data, Error>): Data => {
  if (!result.success) throw result.error;
  return result.data as Data;
};
const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  first: z.string(),
  title: z.string(),
  domain: z.string(),
  company: z.string(),
  linkedinUrl: z.string(),
  email: z.string(),
  emailStatus: z.string(),
  matchConfidence: z.string(),
  source: z.literal("apollo"),
  timezone: z.string().nullish(),
});
const qualificationSchema = z
  .object({
    status: z.literal("qualified"),
    details: prospectSchema.partial(),
    receipts: z.array(Qualification.sourceReceiptSchema),
  })
  .passthrough();
const selectionSchema = z
  .object({
    status: z.literal("selected"),
    person: personSchema,
    details: prospectSchema
      .pick({
        name: true,
        first: true,
        title: true,
        email: true,
        emailStatus: true,
        emailVerifiedAt: true,
        emailSource: true,
        linkedinUrl: true,
        roleSource: true,
        roleCheckedAt: true,
        timezone: true,
      })
      .partial(),
    provisional: z.boolean().optional(),
  })
  .passthrough();
const verificationSchema = z.object({
  requestId: z.string(),
  requestedAt: z.string(),
  records: z.array(
    z.object({ record_id: z.string(), input: z.object({ email: z.string() }) }),
  ),
});
/** Upgrade a known, completed legacy no-contact result without repeating its paid request. */
export const contactFallbackState = (state: AutomationState) => {
  if (
    state.stage !== "enrich" ||
    !Object.hasOwn(state, "enrichment") ||
    state["prospectId"]
  )
    throw new ConflictError("contact-fallback-unavailable");
  qualificationSchema.parse(state["qualification"]);
  const people = z.array(personSchema).max(25).parse(state["people"]);
  const selected = selectionSchema.safeParse(state["selection"]);
  const enriched = personSchema.nullable().parse(state["enrichment"]);
  const personId = selected.success ? selected.data.person.id : enriched?.id;
  if (!personId || !people.some((person) => person.id === personId))
    throw new ConflictError("contact-fallback-unavailable");
  const previous = contactAttemptsSchema.parse(state.contactAttempts ?? []);
  if (
    previous.length >= 3 ||
    previous.some(
      (attempt) =>
        attempt.status === "selected" || attempt.status === "enriched",
    )
  )
    throw new ConflictError("contact-fallback-unavailable");
  const contactAttempts = previous.some(
    (attempt) => attempt.personId === personId,
  )
    ? previous
    : [
        ...previous,
        {
          personId,
          status: "unavailable",
          selectedAt: z.string().datetime().parse(state["peopleObservedAt"]),
          completedAt: new Date().toISOString(),
          reason: "legacy-contact-unavailable",
          enrichment: enriched ? { ...enriched } : null,
        } satisfies ContactAttempt,
      ];
  return {
    ...state,
    stage: "selectContact" as const,
    contactAttempts: contactAttemptsSchema.parse(contactAttempts),
    availableAt: new Date().toISOString(),
    lease: null,
    contactFallback: "next-saved-contact",
  };
};
const fresh = (time: string | null, days: number) => {
  const timestamp = time ? Date.parse(time) : Number.NaN;
  return (
    Number.isFinite(timestamp) &&
    timestamp <= Date.now() &&
    Date.now() - timestamp < days * 86400000
  );
};
const currentProspect = async (claimed: AutomationClaim) => {
  const id = z.string().uuid().parse(claimed.state["prospectId"]);
  const revision = z
    .number()
    .int()
    .nonnegative()
    .parse(claimed.state["prospectRevision"]);
  const row = value(await Store.readProspect(id));
  if (
    !row ||
    row.campaignId !== claimed.campaign.id ||
    row.revision !== revision ||
    row.sentStep ||
    !["candidate", "draft"].includes(row.status) ||
    row.holdReason ||
    row.details.automationEvidenceId !== claimed.job.id
  )
    throw new ConflictError("The automation prospect changed.");
  return row;
};
const shoppingEvidence = (claimed: AutomationClaim) => {
  const answer = Capture.aiCaptureSchema.parse(claimed.state["shoppingAnswer"]);
  const browser = Capture.browserResearchSchema.parse(
    claimed.state["shoppingBrowser"],
  );
  if (
    browser.status !== "captured" ||
    claimed.state["shoppingPolicyHash"] !== researchPolicyHash(claimed.playbook)
  )
    throw new ValidationError(
      "The shopping research no longer matches the Playbook.",
    );
  return { answer, browser };
};
const shoppingReceipt = (claimed: AutomationClaim) => {
  const receipt = shoppingResearchSchema.parse(
    claimed.state["shoppingReceipt"],
  );
  const problem = ShoppingAssessment.validateAutomaticResearch(
    shoppingEvidence(claimed),
    receipt,
    claimed.playbook.verificationDays,
  );
  if (problem) throw new ValidationError(problem);
  return receipt;
};
const requiredKey = async (provider: "scrapellm" | "firecrawl") => {
  const key = value(await Credentials.resolveKey(provider));
  if (!key)
    throw new ValidationError("Live shopping research is not configured.");
  return key;
};

/** Each invocation owns one durable, leased stage. Provider results are saved before mutation stages run. */
export const execute = async (
  claimed: AutomationClaim,
  deadline: number,
): Promise<Transition> => {
  const { state, campaign, company, playbook, input } = claimed;
  const actor = input.actor;
  if (
    playbook.requireShoppingEvidence &&
    !state["shoppingReceipt"] &&
    state.stage !== "assessShopping" &&
    !value(await ResearchReadiness.getStatus(playbook)).ready
  )
    return { stage: state.stage, delayMs: 60_000 };
  switch (state.stage) {
    case "companyFacts": {
      value(
        await Campaigns.researchContext({
          campaign: campaign.id,
          company: company.id,
        }),
      );
      const facts = value(await Qualification.enrichCompany({ company }));
      if (
        !facts ||
        normalizeDomain(facts.domain) !== company.domain ||
        !facts.country
      )
        return {
          stage: "companyFacts",
          reason: "qualification-held",
          output: { companyFacts: facts },
        };
      return {
        stage: "qualify",
        output: { companyFacts: facts },
        companyFacts: {
          country: facts.country,
          platform: facts.platform,
          teamSize: facts.teamSize,
          annualRevenue: facts.annualRevenue,
          sourcePayload: facts.sourcePayload,
        },
      };
    }
    case "qualify": {
      value(
        await Campaigns.researchContext({
          campaign: campaign.id,
          company: company.id,
        }),
      );
      const qualification = value(
        await Qualification.qualifyCompany({
          campaign,
          company,
          playbook,
          deadline,
        }),
      );
      const correction =
        qualification.status === "qualified"
          ? productCategoryCorrection(qualification)
          : null;
      const qualified =
        qualification.status === "qualified" && correction
          ? {
              ...qualification,
              details: {
                ...qualification.details,
                productCategory: correction.after,
              },
            }
          : qualification;
      return qualification.status === "qualified"
        ? {
            stage: playbook.requireShoppingEvidence
              ? "researchQuery"
              : "findContacts",
            output: {
              qualification: qualified,
              ...(correction
                ? {
                    categoryCorrections: [
                      {
                        ...correction,
                        actor,
                        correctedAt: new Date().toISOString(),
                        phase: "qualification",
                      },
                    ],
                  }
                : {}),
            },
            companyFacts: {
              country: qualification.details.country ?? company.country,
              platform:
                qualification.details.platform === "shopify" ||
                qualification.details.platform === "woocommerce"
                  ? qualification.details.platform
                  : company.platform,
              teamSize: company.teamSize,
              annualRevenue: company.annualRevenue,
              sourcePayload: company.sourcePayload,
            },
          }
        : {
            stage: "qualify",
            reason: "qualification-held",
            output: { qualification },
          };
    }
    case "researchQuery": {
      const qualification = qualificationSchema.parse(state["qualification"]);
      const product = z
        .object({
          product: z.string().min(1),
          productUrl: z.url(),
          productCategory: z.string().min(1),
        })
        .parse(qualification.details);
      const query = value(
        Capture.prepareQuery({
          product: { name: product.product, url: product.productUrl },
          category: product.productCategory,
          country: company.country ?? "US",
          surface: "google_ai_mode",
        }),
      );
      return {
        stage: "startShoppingQuery",
        output: {
          shoppingQuery: query,
          shoppingPolicyHash: researchPolicyHash(playbook),
          shoppingRequestId: randomUUID(),
          shoppingPolls: 0,
        },
      };
    }
    case "startShoppingQuery": {
      value(
        await Campaigns.researchContext({
          campaign: campaign.id,
          company: company.id,
        }),
      );
      const query = Capture.preparedQuerySchema.parse(state["shoppingQuery"]);
      if (
        query.product.url !==
          qualificationSchema.parse(state["qualification"]).details
            .productUrl ||
        state["shoppingPolicyHash"] !== researchPolicyHash(playbook)
      )
        throw new ConflictError("The research plan changed before submission.");
      const job = value(
        await Capture.startQuery({
          apiKey: await requiredKey("scrapellm"),
          query,
          deadline,
        }),
      );
      return {
        stage: "pollShoppingQuery",
        output: { shoppingJob: job },
        delayMs: 30_000,
      };
    }
    case "pollShoppingQuery": {
      const job = Capture.aiJobSchema.parse(state["shoppingJob"]);
      const polls = z
        .number()
        .int()
        .nonnegative()
        .parse(state["shoppingPolls"]);
      if (polls >= 40 || !fresh(job.submittedAt, 1))
        return {
          stage: "pollShoppingQuery",
          reason: "shopping-research-expired",
        };
      const response = await Capture.pollQuery({
        apiKey: await requiredKey("scrapellm"),
        job,
        deadline,
      });
      if (
        !response.success &&
        ["unavailable", "rate-limit"].includes(response.error.code)
      )
        return {
          stage: "pollShoppingQuery",
          delayMs: Math.min(
            300_000,
            Math.max(60_000, (response.error.retryAfterSeconds ?? 60) * 1000),
          ),
          output: {
            shoppingPolls: polls + 1,
            shoppingPollError: response.error.code,
          },
        };
      const result = value(response);
      return result.status === "pending"
        ? {
            stage: "pollShoppingQuery",
            delayMs: 60_000,
            output: { shoppingPolls: polls + 1 },
          }
        : {
            stage: "browseShopping",
            output: {
              shoppingAnswer: result.capture,
              shoppingPolls: polls + 1,
            },
          };
    }
    case "browseShopping": {
      value(
        await Campaigns.researchContext({
          campaign: campaign.id,
          company: company.id,
        }),
      );
      const answer = Capture.aiCaptureSchema.parse(state["shoppingAnswer"]);
      const browser = value(
        await Capture.inspectPages({
          apiKey: await requiredKey("firecrawl"),
          product: answer.job.query.product,
          answer,
          country: answer.job.query.country,
          deadline,
        }),
      );
      return browser.status === "captured"
        ? { stage: "assessShopping", output: { shoppingBrowser: browser } }
        : {
            stage: "browseShopping",
            reason: "shopping-research-held",
            output: { shoppingBrowser: browser },
          };
    }
    case "assessShopping": {
      const assessment = value(
        await ShoppingAssessment.assess({
          ...shoppingEvidence(claimed),
          playbook,
          deadline,
        }),
      );
      return assessment.status === "researched"
        ? {
            stage: "findContacts",
            output: {
              shoppingReceipt: assessment.receipt,
              shoppingAssessment: assessment,
            },
          }
        : {
            stage: "assessShopping",
            reason: "shopping-research-held",
            output: { shoppingAssessment: assessment },
          };
    }
    case "findContacts": {
      if (playbook.requireShoppingEvidence) shoppingReceipt(claimed);
      value(
        await Campaigns.researchContext({
          campaign: campaign.id,
          company: company.id,
        }),
      );
      qualificationSchema.parse(state["qualification"]);
      const excludedTitles = [
        ...new Set([
          ...campaign.criteria.excludedRoles,
          ...splitList(playbook.excludedRoles),
        ]),
      ];
      const found = value(
        await Providers.searchApolloPeople({
          domain: company.domain,
          titles: campaign.criteria.targetRoles,
          excludedTitles: excludedTitles.slice(0, 48),
          page: 1,
        }),
      );
      return {
        stage: "selectContact",
        output: {
          people: found.people,
          peopleObservedAt: new Date().toISOString(),
        },
      };
    }
    case "selectContact": {
      const contactAttempts = contactAttemptsSchema.parse(
        state.contactAttempts ?? [],
      );
      if (contactAttempts.some((attempt) => attempt.status === "selected"))
        throw new ConflictError(
          "The previous contact enrichment has no completed receipt.",
        );
      if (contactAttempts.length >= 3)
        return {
          stage: "selectContact",
          reason: "contact-held",
          output: { contactFallback: "attempt-limit" },
        };
      const selection = Qualification.selectContact({
        people: z.array(personSchema).parse(state["people"]),
        excludedIds: contactAttempts.map((attempt) => attempt.personId),
        company,
        criteria: campaign.criteria,
        playbook,
        observedAt: z.string().parse(state["peopleObservedAt"]),
      });
      return selection.status === "selected"
        ? {
            stage: "enrich",
            output: {
              selection,
              contactAttempts: [
                ...contactAttempts,
                {
                  personId: selection.person.id,
                  status: "selected",
                  selectedAt: new Date().toISOString(),
                  completedAt: null,
                  reason: null,
                  enrichment: null,
                } satisfies ContactAttempt,
              ],
            },
          }
        : {
            stage: "selectContact",
            reason: "contact-held",
            output: { selection },
          };
    }
    case "enrich": {
      value(
        await Campaigns.researchContext({
          campaign: campaign.id,
          company: company.id,
        }),
      );
      const selection = selectionSchema.parse(state["selection"]);
      const contactAttempts = contactAttemptsSchema.parse(
        state.contactAttempts ?? [],
      );
      const attempt = contactAttempts.find(
        (attempt) => attempt.personId === selection.person.id,
      );
      // Earlier versions did not persist a per-person reservation. Upgrade it before any paid call.
      if (!attempt) {
        if (contactAttempts.length >= 3)
          return {
            stage: "enrich",
            reason: "contact-held",
            output: { contactFallback: "attempt-limit" },
          };
        return {
          stage: "enrich",
          output: {
            contactAttempts: [
              ...contactAttempts,
              {
                personId: selection.person.id,
                status: "selected",
                selectedAt: new Date().toISOString(),
                completedAt: null,
                reason: null,
                enrichment: null,
              } satisfies ContactAttempt,
            ],
          },
        };
      }
      if (attempt.status !== "selected")
        throw new ConflictError(
          "The selected contact already has an enrichment receipt.",
        );
      const enriched = value(
        await Providers.enrichApolloPerson({
          id: selection.person.id,
          domain: company.domain,
        }),
      );
      const complete = (
        status: ContactAttempt["status"],
        reason: string | null,
      ) =>
        contactAttempts.map((prior) =>
          prior.personId === selection.person.id
            ? {
                ...prior,
                status,
                completedAt: new Date().toISOString(),
                reason,
                enrichment: enriched ? { ...enriched } : null,
              }
            : prior,
        );
      const unavailable = (
        reason: string,
        selected: unknown = selection,
      ): Transition => ({
        stage: "selectContact",
        ...(contactAttempts.length >= 3 ? { reason: "contact-held" } : {}),
        output: {
          enrichment: enriched,
          selection: selected,
          contactAttempts: complete("unavailable", reason),
          contactFallback:
            contactAttempts.length >= 3
              ? "attempt-limit"
              : "next-saved-contact",
        },
      });
      if (
        !enriched ||
        enriched.id !== selection.person.id ||
        normalizeDomain(enriched.domain) !== company.domain
      )
        return unavailable(!enriched ? "no-enrichment" : "identity-mismatch");
      const selected = Qualification.selectContact({
        people: [enriched],
        company,
        criteria: campaign.criteria,
        playbook,
        observedAt: new Date().toISOString(),
      });
      const checked = selectionSchema.safeParse(selected);
      if (
        !checked.success ||
        checked.data.provisional ||
        !enriched.email ||
        normalizeDomain(enriched.email.split("@")[1] ?? "") !== company.domain
      )
        return unavailable(
          !enriched.email
            ? "email-unavailable"
            : !checked.success || checked.data.provisional
              ? "contact-unqualified"
              : "email-domain-mismatch",
          selected,
        );
      return {
        stage: "promote",
        output: {
          enrichment: enriched,
          selection: selected,
          contactAttempts: complete("enriched", null),
        },
      };
    }
    case "promote": {
      const qualification = qualificationSchema.parse(state["qualification"]);
      const selection = selectionSchema.parse(state["selection"]);
      if (
        selection.provisional ||
        normalizeDomain(selection.person.domain) !== company.domain
      )
        throw new ValidationError("The selected contact is not fully sourced.");
      const details = prospectSchema.parse({
        ...qualification.details,
        ...selection.details,
        name: selection.person.name,
        first: selection.person.first,
        title: selection.person.title,
        email: selection.person.email,
        emailStatus: "unknown",
        emailVerifiedAt: "",
        emailSource: `Apollo person ${selection.person.id}`,
        automationEvidenceId: claimed.job.id,
        relationship: "cold",
      });
      const saved = value(
        await Store.saveCampaignProspect(actor, {
          company: company.id,
          revision: campaign.revision,
          prospect: details,
        }),
      );
      return {
        stage: "verify",
        output: {
          prospectId: saved.prospect,
          prospectRevision: saved.revision,
        },
      };
    }
    case "verify": {
      const row = await currentProspect(claimed);
      if (
        !row.details.email ||
        !row.details.emailSource ||
        normalizeDomain(row.details.email.split("@")[1] ?? "") !==
          company.domain
      )
        return { stage: "verify", reason: "email-held" };
      const verification = value(
        await Providers.verifyApolloEmails({ emails: [row.details.email] }),
      );
      return {
        stage: "pollVerification",
        output: { verification, verificationPolls: 0 },
        delayMs: 30000,
      };
    }
    case "pollVerification": {
      await currentProspect(claimed);
      const verification = verificationSchema.parse(state["verification"]);
      const polls = z
        .number()
        .int()
        .nonnegative()
        .parse(state["verificationPolls"]);
      if (polls >= 20 || !fresh(verification.requestedAt, 1))
        return { stage: "pollVerification", reason: "verification-held" };
      const polled = value(
        await Providers.pollApolloVerification({
          requestId: verification.requestId,
        }),
      );
      return {
        stage:
          polled.status === "pending"
            ? "pollVerification"
            : "applyVerification",
        output: { verificationResult: polled, verificationPolls: polls + 1 },
        delayMs:
          polled.status === "pending"
            ? Math.min(300000, Math.max(30000, polled.retryAfterSeconds * 1000))
            : 0,
      };
    }
    case "applyVerification": {
      const row = await currentProspect(claimed);
      const verification = verificationSchema.parse(state["verification"]);
      const result = z
        .object({
          results: z.array(
            z.object({
              email: z.string(),
              status: z.enum(["verified", "unknown"]),
              recordId: z.string(),
              verifiedAt: z.string().nullable(),
            }),
          ),
        })
        .parse(state["verificationResult"]);
      const matching = result.results.filter(
        (entry) =>
          entry.email.toLowerCase() === row.details.email.toLowerCase() &&
          verification.records.some(
            (record) =>
              record.record_id === entry.recordId &&
              record.input.email.toLowerCase() === entry.email.toLowerCase(),
          ),
      );
      const match = matching.length === 1 ? matching[0] : null;
      if (
        match?.status !== "verified" ||
        !fresh(match.verifiedAt, playbook.emailVerificationDays)
      )
        return { stage: "applyVerification", reason: "verification-held" };
      const saved = value(
        await Store.patchProspect(
          actor,
          row.id,
          {
            emailStatus: "verified",
            emailVerifiedAt: match.verifiedAt ?? "",
            emailSource: `Apollo verification ${verification.requestId}; record ${match.recordId}`,
          },
          row.revision,
        ),
      );
      return {
        stage: "mx",
        output: {
          prospectId: saved.prospect,
          prospectRevision: saved.revision,
        },
      };
    }
    case "mx": {
      const row = await currentProspect(claimed);
      const checked = value(await MX.check(row.details.email));
      return { stage: "applyMx", output: { mx: checked } };
    }
    case "applyMx": {
      const row = await currentProspect(claimed);
      const checked = z
        .object({
          provider: z.enum(["google", "microsoft", "other", "unknown"]),
          checkedAt: z.string(),
        })
        .parse(state["mx"]);
      if (
        ["unknown", "microsoft"].includes(checked.provider) ||
        !fresh(checked.checkedAt, 1)
      )
        return { stage: "applyMx", reason: "mx-held" };
      const saved = value(
        await Store.patchProspect(
          actor,
          row.id,
          { mxProvider: checked.provider, mxCheckedAt: checked.checkedAt },
          row.revision,
        ),
      );
      return {
        stage: playbook.requireShoppingEvidence ? "applyShopping" : "draft",
        output: {
          prospectId: saved.prospect,
          prospectRevision: saved.revision,
        },
      };
    }
    case "applyShopping": {
      const row = await currentProspect(claimed);
      const receipt = shoppingReceipt(claimed);
      const saved = value(
        await LeadResearch.saveAutomaticAndApply(
          actor,
          {
            requestId: z.string().uuid().parse(state["shoppingRequestId"]),
            prospectId: row.id,
            expectedRevision: row.revision,
            expectedPlaybookRevision: input.playbookRevision,
            receipt,
          },
          { jobId: claimed.job.id, leaseToken: claimed.state.lease.token },
        ),
      );
      return {
        stage: "draft",
        output: {
          prospectRevision: saved.revision,
          shoppingResearchId: saved.researchId,
        },
      };
    }
    case "draft": {
      const row = await currentProspect(claimed);
      const qualification = qualificationSchema.parse(state["qualification"]);
      if (productCategoryCorrection(qualification))
        return { stage: "draft", normalizeProductCategory: true };
      const draft = value(await Draft.generateDraft(row.details, playbook));
      return draft.issues.length
        ? { stage: "draft", reason: "draft-held", output: { draft } }
        : { stage: "applyDraft", output: { draft } };
    }
    case "applyDraft": {
      const row = await currentProspect(claimed);
      const draft = z
        .object({
          messages: z
            .array(z.object({ subject: z.string(), body: z.string() }))
            .length(3),
        })
        .parse(state["draft"]);
      const [first, second, third] = draft.messages;
      if (!first || !second || !third)
        throw new ValidationError("Incomplete automatic draft.");
      const saved = value(
        await Store.saveDraft(actor, {
          prospect: row.id,
          revision: row.revision,
          subject: first.subject,
          body: first.body,
          followupOne: second.body,
          followupTwo: third.body,
        }),
      );
      return {
        stage: "approve",
        output: {
          prospectId: saved.prospect,
          prospectRevision: saved.revision,
        },
      };
    }
    case "approve": {
      const row = await currentProspect(claimed);
      const approval = value(
        await Store.approveAutomatically(actor, {
          prospect: row.id,
          revision: row.revision,
          automationJobId: claimed.job.id,
        }),
      );
      return { stage: "complete", output: { approval } };
    }
    default:
      throw new ValidationError("The automation stage is not available.");
  }
};
