import { describe, expect, mock, test } from "bun:test";
import { createHash } from "node:crypto";
import { defaultPlaybook } from "@/lib/outbound";
import type { AutomationState } from "@/lib/outbound-automation";
import type { SourceReceipt } from "@/server/utils/outbound/automation-qualification";
import type {
  AiCapture,
  BrowserResearch,
  RawCapture,
  Source,
} from "@/server/utils/outbound/live-shopping-contract";

mock.module("server-only", () => ({}));
const { researchRecoveryState, researchStateHash, researchRecoveryVersion } =
  await import("@/server/utils/outbound/automation-recovery");
const now = Date.parse("2026-11-21T09:00:00Z");
const timestamp = new Date(now - 3600000).toISOString();
const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
const playbook = { ...defaultPlaybook, requireShoppingEvidence: true };
const domain = "samplegoods.com";
const product = {
  name: "Linen tote",
  brand: "Sample Goods",
  url: "https://samplegoods.com/products/tote",
  description: "A physical linen tote with a zipped inner pocket.",
  price: 25,
  currency: "USD",
};
const provider = {
  name: "Sample Goods",
  domain,
  country: "US",
  platform: "shopify",
  estimatedTeamSize: 15,
  annualRevenue: null,
  source: "apollo",
  sourceId: "org_123",
  sourceObservedAt: timestamp,
  provenance: "Sourced organization-enrichment observation",
};
const receipt = (
  kind: SourceReceipt["kind"],
  url: string,
  excerpt: string,
): SourceReceipt => ({
  kind,
  url,
  excerpt,
  checkedAt: timestamp,
  sha256: digest(excerpt),
});
const receipts = () => [
  receipt(
    "storefront",
    "https://samplegoods.com",
    "Sample Goods makes its own bags and has a team of fifteen people.",
  ),
  receipt(
    "product",
    product.url,
    `${product.description}\nObserved structured product: ${JSON.stringify(product)}`,
  ),
  receipt(
    "provider",
    "https://app.apollo.io/#/organizations/org_123",
    JSON.stringify(provider),
  ),
];
const qualificationFixture = () => ({
  stage: "qualify" as const,
  availableAt: timestamp,
  lease: null,
  qualification: {
    status: "hold",
    providerRequestId: "qualification-request-complete",
    reason:
      "Campaign objective requires a verified AI shopping finding before outreach.",
    assessment: { decision: "hold" },
    observedProduct: { ...product },
    receipts: receipts(),
  },
});
const assessmentFixture = () => {
  const raw = (url: string, body: string, status = 200): RawCapture => ({
    url,
    body,
    status,
    receivedAt: timestamp,
    sha256: digest(body),
  });
  const source = (
    id: string,
    kind: Source["kind"],
    capture: Source["capture"],
    raw: RawCapture,
  ): Source => ({
    id,
    kind,
    capture,
    url: raw.url,
    content: raw.body,
    checkedAt: timestamp,
    artifact: `sha256:${raw.sha256}`,
  });
  const answerRaw = raw(
    "https://www.google.com/search?q=large+linen+tote",
    "Linen tote. Variant: large. Current price: USD 30. one-time purchase.",
  );
  const productRaw = raw(
    product.url,
    "Linen tote. Variant: large. Current price: USD 25. one-time purchase.",
  );
  const ucpRaw = raw(
    "https://samplegoods.com/.well-known/ucp",
    "404 Not Found",
    404,
  );
  const answer: AiCapture = {
    job: {
      id: "20000000-0000-4000-8000-000000000002",
      submittedAt: timestamp,
      query: {
        product: { name: product.name, url: product.url },
        category: "large linen tote",
        country: "US",
        surface: "google_ai_mode",
        prompt: "Where can I buy a large linen tote?",
      },
    },
    executedAt: timestamp,
    receivedAt: timestamp,
    answer: answerRaw.body,
    source: source("answer", "search", "provider", answerRaw),
    links: [],
    cached: false,
    raw: [answerRaw],
  };
  const browser: Extract<BrowserResearch, { status: "captured" }> = {
    status: "captured",
    sources: [
      source("product", "product", "browser", productRaw),
      source("ucp", "ucp", "http", ucpRaw),
    ],
    raw: [productRaw, ucpRaw],
    ucp: {
      url: ucpRaw.url,
      status: "notObserved",
      httpStatus: 404,
      capabilities: [],
      sourceIds: ["ucp"],
    },
    checkout: {
      status: "notTested",
      sourceIds: [],
      notes: "Checkout was not tested.",
    },
    candidates: [],
    limitations: ["Market was not independently established."],
  };
  return {
    stage: "assessShopping" as const,
    availableAt: timestamp,
    lease: null,
    qualification: {
      status: "qualified",
      details: { product: product.name, productUrl: product.url },
      receipts: receipts(),
    },
    shoppingAssessment: {
      status: "held",
      providerRequestId: "assessment-request-complete",
      reason:
        "The finding needs more words than the first-email template allows; do not remove evidence qualifiers to fit.",
    },
    shoppingAnswer: answer,
    shoppingBrowser: browser,
    shoppingPolicyHash: digest(
      JSON.stringify({
        instructions: playbook.researchInstructions,
        required: playbook.requireShoppingEvidence,
      }),
    ),
  };
};
const recover = (
  state: AutomationState,
  options: Partial<
    Omit<Parameters<typeof researchRecoveryState>[0], "state">
  > = {},
) =>
  researchRecoveryState({
    state,
    error:
      state.stage === "qualify"
        ? "qualification-held"
        : "shopping-research-held",
    playbook,
    domain,
    platforms: ["shopify"],
    now,
    ...options,
  });
const blocked = (operation: () => unknown) =>
  expect(operation).toThrow("research-review-recovery-unavailable");
const updateProvider = (
  state: ReturnType<typeof qualificationFixture>,
  changes: Record<string, unknown>,
) => {
  const source = state.qualification.receipts.find(
    (source) => source.kind === "provider",
  );
  if (!source) throw new Error("Missing provider fixture");
  source.excerpt = JSON.stringify({ ...provider, ...changes });
  source.sha256 = digest(source.excerpt);
};

describe("completed research holds can be selected once without provider work", () => {
  test("qualification recovery retains original positive product evidence and observation dates", () => {
    const state = qualificationFixture();
    const before = structuredClone(state);
    const recovery = recover(state);
    expect(recovery).toEqual({
      kind: "qualification",
      evidence: {
        platform: "shopify",
        product,
        receipts: state.qualification.receipts,
      },
      previous: state.qualification,
    });
    expect(state).toEqual(before);
  });
  test("a copy-budget hold may be reassessed but is never marked as researched", () => {
    const state = assessmentFixture();
    const before = structuredClone(state);
    expect(recover(state)).toEqual({
      kind: "assessment",
      evidence: null,
      previous: state.shoppingAssessment,
    });
    expect(state).toEqual(before);
    expect(state.shoppingAssessment.status).toBe("held");
  });

  test.each([
    { label: "missing", value: undefined },
    { label: "null", value: null },
    { label: "empty", value: "" },
    { label: "invalid", value: "request with spaces" },
  ])("refuses a $label completed provider request ID", ({ value }) => {
    for (const sample of [
      { state: qualificationFixture(), field: "qualification" },
      { state: assessmentFixture(), field: "shoppingAssessment" },
    ]) {
      const state: AutomationState = sample.state;
      const receipt = state[sample.field] as Record<string, unknown>;
      const saved = Object.fromEntries(
        Object.entries(receipt).filter(([key]) => key !== "providerRequestId"),
      );
      blocked(() =>
        recover({
          ...state,
          [sample.field]:
            value === undefined
              ? saved
              : { ...saved, providerRequestId: value },
        }),
      );
    }
  });
  test.each(["qualify", "assessShopping"] as const)(
    "%s refuses a one-use recovery marker and active lease",
    (stage) => {
      const state =
        stage === "qualify" ? qualificationFixture() : assessmentFixture();
      blocked(() =>
        recover({
          ...state,
          researchReviewRecovery: { version: researchRecoveryVersion },
        }),
      );
      blocked(() =>
        recover({
          ...state,
          lease: {
            token: "30000000-0000-4000-8000-000000000003",
            expiresAt: new Date(now + 60000).toISOString(),
          },
        }),
      );
    },
  );
  test.each([
    "prospectId",
    "shoppingReceipt",
    "people",
    "selection",
    "enrichment",
    "verification",
    "draft",
  ])("does not recover after %s exists", (field) => {
    for (const state of [qualificationFixture(), assessmentFixture()])
      blocked(() =>
        recover({
          ...state,
          [field]:
            field === "prospectId"
              ? "40000000-0000-4000-8000-000000000004"
              : { saved: true },
        }),
      );
  });
  test("does not replay any contact enrichment", () => {
    for (const state of [qualificationFixture(), assessmentFixture()])
      blocked(() =>
        recover({
          ...state,
          contactAttempts: [
            {
              personId: "person_1",
              status: "unavailable",
              selectedAt: timestamp,
              completedAt: timestamp,
              reason: "no-email",
              enrichment: null,
            },
          ],
        }),
      );
  });
  test("requires current shopping evidence mode and matching failure stage", () => {
    blocked(() =>
      recover(qualificationFixture(), {
        playbook: { ...playbook, requireShoppingEvidence: false },
      }),
    );
    blocked(() =>
      recover(qualificationFixture(), { error: "provider-uncertain" }),
    );
    blocked(() => recover({ ...assessmentFixture(), stage: "findContacts" }));
  });
});

describe("qualification recovery requires a fresh matching completed observation", () => {
  test("never upgrades a skip or a factual qualification hold", () => {
    const skipped = qualificationFixture();
    skipped.qualification.status = "skip";
    blocked(() => recover(skipped));
    const unsuitable = qualificationFixture();
    unsuitable.qualification.reason =
      "The merchant only sells digital courses.";
    blocked(() => recover(unsuitable));
    const unknown = qualificationFixture();
    unknown.qualification.assessment.decision = "qualified";
    blocked(() => recover(unknown));
  });
  test.each([null, "other", "woocommerce"])(
    "does not infer Shopify from provider platform %s",
    (platform) => {
      const state = qualificationFixture();
      updateProvider(state, { platform });
      blocked(() => recover(state));
    },
  );
  test("requires a single exact provider observation and current allowed platform", () => {
    blocked(() =>
      recover(qualificationFixture(), { platforms: ["woocommerce"] }),
    );
    const duplicate = qualificationFixture();
    duplicate.qualification.receipts.push(
      structuredClone(duplicate.qualification.receipts[2] as SourceReceipt),
    );
    blocked(() => recover(duplicate));
    const domainChanged = qualificationFixture();
    updateProvider(domainChanged, { domain: "anotherbrand.com" });
    blocked(() => recover(domainChanged));
    const sourceChanged = qualificationFixture();
    updateProvider(sourceChanged, { sourceId: "org_other" });
    blocked(() => recover(sourceChanged));
  });
  test("rejects an edited or malformed provider excerpt instead of trusting its platform", () => {
    for (const excerpt of [
      JSON.stringify({ ...provider, platform: "woocommerce" }),
      "not JSON",
    ]) {
      const state = qualificationFixture();
      const source = state.qualification.receipts.find(
        (source) => source.kind === "provider",
      );
      if (!source) throw new Error("Missing provider fixture");
      source.excerpt = excerpt;
      blocked(() => recover(state));
    }
  });
  test.each([now - 7 * 86400000, now + 1000])(
    "rejects stale or future-dated qualification receipt at %s",
    (time) => {
      const state = qualificationFixture();
      state.qualification.receipts[0] = {
        ...(state.qualification.receipts[0] as SourceReceipt),
        checkedAt: new Date(time).toISOString(),
      };
      blocked(() => recover(state));
    },
  );
  test("does not relabel an old provider observation with a recent timestamp", () => {
    const state = qualificationFixture();
    updateProvider(state, {
      sourceObservedAt: new Date(now - 8 * 86400000).toISOString(),
    });
    blocked(() => recover(state));
  });
  test("requires the observed product URL to match its company and saved receipt", () => {
    const foreign = qualificationFixture();
    foreign.qualification.observedProduct.url = "https://anotherbrand.com/tote";
    blocked(() => recover(foreign));
    const unbound = qualificationFixture();
    unbound.qualification.observedProduct.url =
      "https://samplegoods.com/products/other";
    blocked(() => recover(unbound));
  });
  test("rejects product facts changed after the structured product receipt was recorded", () => {
    const state = qualificationFixture();
    state.qualification.observedProduct.price = 99;
    blocked(() => recover(state));
  });
});

describe("assessment recovery does not validate or relax shopping evidence", () => {
  test("only the known copy-budget hold can be selected", () => {
    for (const reason of [
      "The prices describe different variants, currencies, purchase terms or markets.",
      "The complete answer already includes this variant at the page's current price.",
      "No useful angle.",
    ]) {
      const state = assessmentFixture();
      state.shoppingAssessment.reason = reason;
      blocked(() => recover(state));
    }
  });
  test("requires unchanged research policy and an already qualified product", () => {
    blocked(() =>
      recover(assessmentFixture(), {
        playbook: {
          ...playbook,
          researchInstructions: "A different research policy",
        },
      }),
    );
    const state = assessmentFixture();
    state.shoppingPolicyHash = "a".repeat(64);
    blocked(() => recover(state));
    const unqualified = assessmentFixture();
    unqualified.qualification.status = "hold";
    blocked(() => recover(unqualified));
  });
  test("binds the captured query to the exact qualified product name and URL", () => {
    const renamed = assessmentFixture();
    renamed.shoppingAnswer.job.query.product.name = "Other tote";
    blocked(() => recover(renamed));
    const repointed = assessmentFixture();
    repointed.shoppingAnswer.job.query.product.url =
      "https://samplegoods.com/products/other";
    blocked(() => recover(repointed));
    blocked(() => recover(assessmentFixture(), { domain: "anotherbrand.com" }));
  });
  test.each(["answer", "browser"] as const)(
    "rejects changed %s raw bytes",
    (kind) => {
      const state = assessmentFixture();
      const capture = (
        kind === "answer" ? state.shoppingAnswer.raw : state.shoppingBrowser.raw
      )[0];
      if (!capture) throw new Error("Missing raw fixture");
      capture.body += " changed";
      blocked(() => recover(state));
    },
  );
  test("requires every original source artifact and a matching rendered merchant page", () => {
    const dangling = assessmentFixture();
    dangling.shoppingAnswer.source.artifact = `sha256:${"a".repeat(64)}`;
    blocked(() => recover(dangling));
    const missing = assessmentFixture();
    const page = missing.shoppingBrowser.sources.find(
      (source) => source.kind === "product",
    );
    if (!page) throw new Error("Missing product fixture");
    page.url = "https://samplegoods.com/products/other";
    blocked(() => recover(missing));
  });
  test.each(["query", "source", "raw", "qualification"] as const)(
    "rejects stale %s evidence",
    (kind) => {
      const state = assessmentFixture();
      const expired = new Date(now - 8 * 86400000).toISOString();
      switch (kind) {
        case "query":
          state.shoppingAnswer.executedAt = expired;
          break;
        case "source":
          state.shoppingAnswer.source.checkedAt = expired;
          break;
        case "raw": {
          const capture = state.shoppingAnswer.raw[0];
          if (!capture) throw new Error("Missing raw fixture");
          capture.receivedAt = expired;
          break;
        }
        case "qualification":
          state.qualification.receipts[0] = {
            ...(state.qualification.receipts[0] as SourceReceipt),
            checkedAt: expired,
          };
          break;
      }
      blocked(() => recover(state));
    },
  );
});

test("snapshot hashes ignore object key order but bind nested facts and array order", () => {
  expect(researchStateHash({ stage: "qualify", facts: { a: 1, b: 2 } })).toBe(
    researchStateHash({ facts: { b: 2, a: 1 }, stage: "qualify" }),
  );
  expect(researchStateHash({ facts: { a: 1 } })).not.toBe(
    researchStateHash({ facts: { a: 2 } }),
  );
  expect(researchStateHash({ receipts: ["answer", "page"] })).not.toBe(
    researchStateHash({ receipts: ["page", "answer"] }),
  );
});
