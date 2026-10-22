import { describe, expect, mock, test } from "bun:test";

/**
 * Drives the whole claim-check pipeline with the model calls and page reads
 * replaced by fixtures, to pin the provenance rules that live between stages:
 * a citation that redirects into the merchant's store is never independent,
 * an assistant that does not know the product never diverges, and a research
 * answer that skips a claim leaves it unresearched.
 */

type GenerateOptions = { label?: string; model?: string; prompt?: string };

const STORE = "acme-store.com";
const PRODUCT_URL = `https://${STORE}/products/runner`;
const CLAIM = "Battery lasts 12 hours";

const fixture = {
  research: "### C1\nSTATUS: supported\nNOTE: Confirmed by testers [1][2].",
  recognized: true,
};

const pages: Record<string, { url: string; body: string }> = {
  [PRODUCT_URL]: {
    url: PRODUCT_URL,
    body: `<script type="application/ld+json">${JSON.stringify({
      "@type": "Product",
      name: "Runner",
      offers: { price: "100.00", priceCurrency: "USD" },
    })}</script>`,
  },
  // Cited as a third party, but answers from the merchant's own store.
  "https://redirect.example/x": {
    url: `https://${STORE}/blogs/news/runner`,
    body: "<p>Our battery lasts 12 hours on a single charge, battery life tested.</p>",
  },
  "https://review.example/y": {
    url: "https://review.example/y",
    body: "<p>In our testing the battery lasts 12 hours, battery life is excellent.</p>",
  },
};

mock.module("@/server/utils/http", () => ({
  page: async (url: string) => {
    const hit = pages[url];
    if (!hit) return { success: false, error: new Error("unreachable") };
    return {
      success: true,
      data: {
        status: 200,
        body: hit.body,
        url: hit.url,
        headers: new Headers({ "content-type": "text/html" }),
      },
    };
  },
}));

mock.module("@/server/utils/ai", () => ({
  generate: async (options: GenerateOptions) => {
    switch (options.label) {
      case "claim-check.extract":
        return {
          assertions: [
            {
              span: CLAIM,
              kind: "performance",
              attribute: "battery life",
              value: "12",
              unit: "hours",
              qualifier: null,
              checkable: true,
              relevance: "high",
            },
          ],
        };
      case "claim-check.assistant":
        if (options.model !== "gpt") throw new Error("402 insufficient funds");
        return {
          recognized: fixture.recognized,
          price: 250,
          currency: "USD",
          availability: "out_of_stock",
          attributes: [{ id: "C1", value: "20 hours" }],
        };
      case "claim-check.research":
        return {
          text: fixture.research,
          sources: [
            { sourceType: "url", url: "https://redirect.example/x" },
            { sourceType: "url", url: "https://review.example/y" },
          ],
        };
      case "claim-check.judge": {
        const prompt = options.prompt ?? "";
        const ids = (pattern: RegExp) =>
          [...prompt.matchAll(pattern)].map((match) => match[1] ?? "");
        return {
          excerpts: ids(/^(E[\w-]+) —/gm).map((id) => ({
            id,
            relation: "supports",
            quote: "battery lasts 12 hours",
          })),
          assistants: ids(/^(A-[\w-]+) —/gm).map((id) => ({
            id,
            stance: "diverges",
          })),
        };
      }
      default:
        throw new Error(`unexpected call ${options.label}`);
    }
  },
}));

const { runClaimCheck } = await import(
  "@/server/app/intelligence/claim-check-engine"
);

const run = () =>
  runClaimCheck({
    product: {
      id: "p1",
      title: "Runner",
      description: `<p>${CLAIM}.</p>`,
      price: "100.00",
      compareAtPrice: null,
      currency: "USD",
      sku: null,
      gtin: null,
      url: PRODUCT_URL,
      rawData: null,
      syncedAt: null,
    },
    store: { domain: STORE, storefrontHosts: null },
    startedAt: new Date(),
  });

describe("runClaimCheck provenance", () => {
  test("a citation redirecting into the merchant's store never counts", async () => {
    fixture.research =
      "### C1\nSTATUS: supported\nNOTE: Confirmed by testers [1][2].";
    fixture.recognized = true;
    const report = await run();
    const [claim] = report.claims;

    expect(claim?.verdict).toBe("verified");
    const pageHosts = claim?.evidence
      .filter((entry) => entry.kind === "page")
      .map((entry) => entry.host);
    expect(pageHosts).toEqual(["review.example"]);
    expect(report.sources).toEqual({ attempted: 2, read: 2 });
  });

  test("only the redirected source leaves the claim merely cited", async () => {
    fixture.research =
      "### C1\nSTATUS: supported\nNOTE: Confirmed by the brand blog [1].";
    const report = await run();
    expect(report.claims[0]?.verdict).toBe("cited");
    expect(
      report.claims[0]?.evidence.some((entry) => entry.kind === "page"),
    ).toBe(false);
  });

  test("an assistant that does not know the product never diverges", async () => {
    fixture.research =
      "### C1\nSTATUS: supported\nNOTE: Confirmed by testers [2].";
    fixture.recognized = false;
    const report = await run();
    expect(report.claims[0]?.assistants).toEqual([
      { assistant: "chatgpt", stance: "unknown", value: null },
    ]);
    const price = report.coreFacts.find((fact) => fact.key === "price");
    expect(price?.assistants).toEqual([
      { assistant: "chatgpt", stance: "unknown", value: null },
    ]);
    expect(report.summary.divergent).toBe(0);
    expect(
      report.assistants.filter((entry) => entry.status === "failed"),
    ).toHaveLength(2);
  });

  test("a research answer that skips the claim leaves it unresearched", async () => {
    fixture.research = "Here is what I found about this product in general.";
    fixture.recognized = true;
    const report = await run();
    expect(report.claims[0]?.verdict).toBe("unresearched");
    expect(report.research.status).toBe("failed");
  });
});
