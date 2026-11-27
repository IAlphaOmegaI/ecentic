import { describe, expect, mock, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { defaultPlaybook } from "@/lib/outbound";
import { buildSyntheticShoppingCapture } from "./helpers/outbound-shopping-fixture";

mock.module("server-only", () => ({}));
const Capture = await import("@/server/utils/outbound/live-shopping");
const Presence = await import("@/server/utils/outbound/live-shopping-ai");
const { projectBrowserExecution } = await import(
  "@/server/utils/outbound/live-shopping-browser"
);
const {
  createFactAssessmentCatalog,
  projectFactAssessment,
  validateFactResearch,
} = await import("@/server/utils/outbound/shopping-fact-assessment");
const { assess, validateAutomaticResearch } = await import(
  "@/server/utils/outbound/shopping-assessment"
);

/** Synthetic product/answer pair. No fixture describes a real search or merchant. */
const fixture = async (
  title = "Marlow Tote | PATTERN – Pattern Beauty",
  structured: string[] = [],
  answerText = "1. Pattern Linen Bag — Large carry bag.\n2. Harbor Canvas Bag — Cotton shopper.",
) => {
  const input = await buildSyntheticShoppingCapture({
    prospect: {
      company: "Pattern Beauty",
      domain: "pattern.example",
      product: "Marlow Tote",
      productUrl: "https://pattern.example/products/marlow",
    },
    answerText,
    pageText:
      "Marlow Tote is a large linen bag. Its fabric has a patterned weave.",
  });
  const { browser, answer } = input.evidence;
  const execution = browser.raw.find((raw) => raw.url.endsWith("/execute"));
  if (!execution) throw new Error("Missing synthetic execution.");
  const envelope = JSON.parse(execution.body);
  const rendered = JSON.parse(envelope.stdout);
  rendered.title = title;
  rendered.structured = structured;
  envelope.stdout = JSON.stringify(rendered);
  execution.body = JSON.stringify(envelope);
  execution.sha256 = createHash("sha256").update(execution.body).digest("hex");
  const projection = projectBrowserExecution({
    capture: execution,
    url: answer.job.query.product.url,
    id: "product-browser",
    productName: answer.job.query.product.name,
    startedAt: execution.receivedAt,
    now: input.now,
  });
  if (!projection) throw new Error("Invalid synthetic product projection.");
  browser.sources = browser.sources.map((source) =>
    source.id === "product-browser" ? projection.source : source,
  );
  const merchant = answer.job.query.merchant;
  if (!merchant) throw new Error("Missing synthetic merchant identity.");
  const query = await Capture.generateShopperQuery(
    {
      product: answer.job.query.product,
      merchant,
      category: answer.job.query.category,
      country: answer.job.query.country,
      browser,
      deadline: input.now + 40000,
    },
    {
      now: () => input.now,
      generate: async ({ prompt }) => ({
        question: "large linen bags",
        category: "bag",
        attribute: "large",
        excerptIds: [JSON.parse(prompt).excerpts[0].id],
      }),
    },
  );
  if (!query.success) throw query.error;
  if (query.data.status !== "prepared") throw new Error(query.data.reason);
  answer.job.query = query.data.query;
  const catalog = createFactAssessmentCatalog(input.evidence, input.now);
  const answerQuote = catalog.quotes.find(
    (quote) => quote.sourceId === catalog.answerSourceId,
  );
  if (!answerQuote) throw new Error("Missing synthetic answer quote.");
  const selection = {
    ...input.selection,
    listed: ["Pattern Linen Bag", "Harbor Canvas Bag"].map((name) => ({
      name,
      kind: "brand" as const,
      quoteId: answerQuote.id,
      price: null,
    })),
  };
  return { ...input, selection };
};

describe("captured shortened merchant identity", () => {
  test("an explicit own-page title alias vetoes absence without rewriting evidence", async () => {
    const input = await fixture();
    const saved = JSON.stringify(input.evidence);
    const old = Presence.computeDiscoveryBase(
      { answer: input.evidence.answer },
      input.now,
    );
    expect(old.merchantPresent).toBe(false);
    const base = Presence.computeDiscoveryBase(input.evidence, input.now);
    expect(base.merchantPresent).toBeNull();
    expect(base.completeness.status).toBe("uncertain");
    expect(base.completeness.reason).toContain("shortened merchant identity");
    expect(base.answerHash).toBe(old.answerHash);
    expect(base.linksHash).toBe(old.linksHash);
    expect(base.checkedAt).toBe(old.checkedAt);
    expect(input.evidence.answer.job.query.merchant?.aliases).toEqual([]);
    expect(JSON.stringify(input.evidence)).toBe(saved);
    const projected = projectFactAssessment(
      input.evidence,
      input.selection,
      input.now,
    );
    expect(projected.status).toBe("held");
  });

  test("unrelated body words cannot become merchant aliases", async () => {
    const input = await fixture("Marlow Tote | Pattern Beauty");
    const base = Presence.computeDiscoveryBase(input.evidence, input.now);
    expect(base.completeness.status).toBe("complete");
    expect(base.merchantPresent).toBe(false);
    expect(
      projectFactAssessment(input.evidence, input.selection, input.now).status,
    ).toBe("researched");
  });

  test("the possible alias is checked beyond the displayed answer and citation limits", async () => {
    const input = await fixture(
      undefined,
      [],
      `${"Other choices. ".repeat(1500)}Pattern Linen Bag is also available.`,
    );
    expect(input.evidence.answer.source.content).not.toContain("Pattern");
    expect(
      Presence.computeDiscoveryBase(input.evidence, input.now).merchantPresent,
    ).toBeNull();
    const provider = input.evidence.answer.raw[0];
    if (!provider) throw new Error("Missing synthetic answer response.");
    const body = JSON.parse(provider.body);
    body.result.result_markdown = "Here are available alternatives.";
    body.result.citations = [
      ...Array.from({ length: 50 }, (_, index) => ({
        url: `https://retailer.example/item/${index}`,
        title: "Another offer",
      })),
      { url: "https://retailer.example/final", title: "PATTERN Linen Bag" },
    ];
    const polled = await Capture.pollQuery(
      { apiKey: "synthetic-only", job: input.evidence.answer.job },
      {
        now: () => input.now,
        request: async () => ({ success: true, data: Response.json(body) }),
      },
    );
    if (!polled.success) throw polled.error;
    if (polled.data.status !== "captured")
      throw new Error("Expected complete synthetic cited answer.");
    expect(polled.data.capture.links).toHaveLength(50);
    expect(
      Presence.computeDiscoveryBase(
        { ...input.evidence, answer: polled.data.capture },
        input.now,
      ).merchantPresent,
    ).toBeNull();
  });

  test("a Product brand field must belong to the captured product", async () => {
    for (const name of ["Marlow Tote", "Different Product"]) {
      const input = await fixture("Marlow Tote | Pattern Beauty", [
        JSON.stringify({
          "@type": "Product",
          name,
          brand: { "@type": "Brand", name: "PATTERN" },
        }),
      ]);
      const base = Presence.computeDiscoveryBase(input.evidence, input.now);
      expect(base.merchantPresent).toBe(name === "Marlow Tote" ? null : false);
    }
  });

  test("a staged absence from the old matcher fails fresh raw replay before assessment spend", async () => {
    const input = await fixture();
    const original = Presence.computeDiscoveryBase;
    // Simulate the previous projection once; all later gates are the real validator.
    const legacy = spyOn(Presence, "computeDiscoveryBase").mockImplementation(
      (value, now) => original({ ...value, browser: undefined }, now),
    );
    let staged: ReturnType<typeof projectFactAssessment>;
    try {
      staged = projectFactAssessment(
        input.evidence,
        input.selection,
        input.now,
      );
    } finally {
      legacy.mockRestore();
    }
    expect(staged.status).toBe("researched");
    if (staged.status !== "researched") throw new Error(staged.reason);
    const receipt = JSON.stringify(staged.receipt);
    expect(
      validateFactResearch(input.evidence, staged.receipt, input.now),
    ).toContain("shortened merchant identity");
    expect(
      validateAutomaticResearch(input.evidence, staged.receipt, 7),
    ).toContain("shortened merchant identity");
    let calls = 0;
    const result = await assess(
      {
        ...input.evidence,
        playbook: defaultPlaybook,
        deadline: input.now + 40000,
      },
      {
        now: () => input.now,
        generate: async () => {
          calls += 1;
          return input.selection;
        },
      },
    );
    expect(result.success && result.data.status).toBe("held");
    expect(calls).toBe(0);
    expect(JSON.stringify(staged.receipt)).toBe(receipt);
  });

  test("changed browser evidence cannot authorize an absence", async () => {
    const input = await fixture();
    const raw = input.evidence.browser.raw[0];
    if (!raw) throw new Error("Missing synthetic raw capture.");
    raw.body += "changed";
    const base = Presence.computeDiscoveryBase(input.evidence, input.now);
    expect(base.merchantPresent).toBeNull();
    expect(base.completeness.status).toBe("uncertain");
  });
});
