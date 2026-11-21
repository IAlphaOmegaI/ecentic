import { createHash } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { z } from "zod";
import { normalizeDomain, type Playbook } from "@/lib/outbound";
import type { AutomationState } from "@/lib/outbound-automation";
import { ConflictError } from "@/server/utils/error";
import {
  companyEvidenceSchema,
  sourceReceiptSchema,
} from "./automation-qualification";
import {
  aiCaptureSchema,
  browserResearchSchema,
} from "./live-shopping-contract";
import { researchPolicyHash } from "./shopping-policy";

export const researchRecoveryVersion = "research-sequence-copy-v1";
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  return value;
};
export const researchStateHash = (state: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(state)))
    .digest("hex");
const reject = (): never => {
  throw new ConflictError("research-review-recovery-unavailable");
};
const fresh = (time: string, days: number, now: number) =>
  Number.isFinite(Date.parse(time)) &&
  Date.parse(time) <= now &&
  now - Date.parse(time) < days * 86_400_000;

/** Only completed pre-contact holds affected by this correction can be reassessed once. */
export const researchRecoveryState = (input: {
  state: AutomationState;
  error: string | null;
  playbook: Playbook;
  domain: string;
  platforms: string[];
  now?: number;
}) => {
  const { state, error, playbook, platforms } = input;
  const now = input.now ?? Date.now();
  const domain = normalizeDomain(input.domain);
  if (
    !domain ||
    !playbook.requireShoppingEvidence ||
    state.lease ||
    state["researchReviewRecovery"] ||
    state["prospectId"] ||
    state["shoppingReceipt"] ||
    state["people"] ||
    state["selection"] ||
    state["enrichment"] ||
    state["verification"] ||
    state["draft"] ||
    state.contactAttempts?.length
  )
    return reject();

  if (state.stage === "qualify" && error === "qualification-held") {
    const qualification = z
      .object({
        status: z.literal("hold"),
        reason: z.string(),
        providerRequestId: z.string().regex(/^[A-Za-z0-9_.:-]{1,200}$/),
        assessment: z.object({ decision: z.literal("hold") }),
        receipts: z.array(sourceReceiptSchema).min(1).max(6),
        observedProduct: companyEvidenceSchema.shape.product,
      })
      .safeParse(state["qualification"]);
    if (
      !qualification.success ||
      !/(gap|verified.*finding|AI shopping|objective)/i.test(
        qualification.data.reason,
      )
    )
      return reject();
    const receipts = qualification.data.receipts;
    if (
      receipts.some(
        (source) => !fresh(source.checkedAt, playbook.verificationDays, now),
      )
    )
      return reject();
    const observations = receipts
      .filter((source) => source.kind === "provider")
      .flatMap((source) => {
        if (
          createHash("sha256").update(source.excerpt).digest("hex") !==
          source.sha256
        )
          return [];
        const decoded = resultify(() => JSON.parse(source.excerpt) as unknown);
        if (!decoded.success) return [];
        const parsed = z
          .object({
            domain: z.string(),
            platform: z.enum(["shopify", "woocommerce"]),
            source: z.literal("apollo"),
            sourceId: z.string().regex(/^[A-Za-z0-9_-]+$/),
            sourceObservedAt: z.string().datetime(),
          })
          .safeParse(decoded.data);
        if (
          !parsed.success ||
          normalizeDomain(parsed.data.domain) !== domain ||
          source.url !==
            `https://app.apollo.io/#/organizations/${parsed.data.sourceId}` ||
          parsed.data.sourceObservedAt !== source.checkedAt ||
          !platforms.includes(parsed.data.platform)
        )
          return [];
        return [parsed.data];
      });
    if (
      observations.length !== 1 ||
      normalizeDomain(qualification.data.observedProduct.url) !== domain
    )
      return reject();
    const evidence = companyEvidenceSchema.parse({
      platform: observations[0]?.platform,
      product: qualification.data.observedProduct,
      receipts,
    });
    const productSource = receipts.find(
      (source) =>
        source.kind === "product" && source.url === evidence.product.url,
    );
    const marker = "\nObserved structured product: ";
    const excerpt = productSource?.excerpt ?? "";
    const position = excerpt.lastIndexOf(marker);
    const observed = resultify(() =>
      position < 0
        ? null
        : companyEvidenceSchema.shape.product.parse(
            JSON.parse(excerpt.slice(position + marker.length)),
          ),
    );
    if (
      !observed.success ||
      researchStateHash(observed.data) !== researchStateHash(evidence.product)
    )
      return reject();
    return {
      kind: "qualification" as const,
      evidence,
      previous: state["qualification"],
    };
  }

  if (state.stage !== "assessShopping" || error !== "shopping-research-held")
    return reject();
  const assessment = z
    .object({
      status: z.literal("held"),
      providerRequestId: z.string().regex(/^[A-Za-z0-9_.:-]{1,200}$/),
      reason: z.literal(
        "The finding needs more words than the first-email template allows; do not remove evidence qualifiers to fit.",
      ),
    })
    .safeParse(state["shoppingAssessment"]);
  const qualification = z
    .object({
      status: z.literal("qualified"),
      details: z.object({ product: z.string(), productUrl: z.string() }),
      receipts: z.array(sourceReceiptSchema).min(1),
    })
    .safeParse(state["qualification"]);
  const answer = aiCaptureSchema.safeParse(state["shoppingAnswer"]);
  const browser = browserResearchSchema.safeParse(state["shoppingBrowser"]);
  if (
    !assessment.success ||
    !qualification.success ||
    !answer.success ||
    !browser.success ||
    browser.data.status !== "captured" ||
    state["shoppingPolicyHash"] !== researchPolicyHash(playbook)
  )
    return reject();
  if (
    answer.data.job.query.product.name !== qualification.data.details.product ||
    answer.data.job.query.product.url !==
      qualification.data.details.productUrl ||
    normalizeDomain(answer.data.job.query.product.url) !== domain ||
    !fresh(answer.data.executedAt, playbook.verificationDays, now) ||
    qualification.data.receipts.some(
      (source) => !fresh(source.checkedAt, playbook.verificationDays, now),
    )
  )
    return reject();
  const sources = [answer.data.source, ...browser.data.sources];
  const captures = [...answer.data.raw, ...browser.data.raw];
  if (
    captures.some(
      (capture) =>
        createHash("sha256").update(capture.body).digest("hex") !==
          capture.sha256 ||
        !fresh(capture.receivedAt, playbook.verificationDays, now),
    ) ||
    sources.some(
      (source) =>
        !fresh(source.checkedAt, playbook.verificationDays, now) ||
        !captures.some(
          (capture) => source.artifact === `sha256:${capture.sha256}`,
        ),
    ) ||
    !sources.some(
      (source) =>
        source.kind === "product" &&
        source.capture === "browser" &&
        source.url === answer.data.job.query.product.url,
    )
  )
    return reject();
  return {
    kind: "assessment" as const,
    evidence: null,
    previous: state["shoppingAssessment"],
  };
};
