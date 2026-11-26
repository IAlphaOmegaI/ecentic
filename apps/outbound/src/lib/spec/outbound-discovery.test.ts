import { describe, expect, test } from "bun:test";
import {
  type ShoppingResearch,
  shoppingFinding,
  shoppingResearchSchema,
  validateShoppingResearch,
} from "../outbound-shopping-research";

const observedAt = "2026-11-26T12:00:00.000Z";
const observed = Date.parse(observedAt);

// Synthetic contract fixture, never presented as an actual search or merchant.
const absence = (): ShoppingResearch => {
  const page = "Trail Tote. Reusable bags for travel.";
  const answer = "1. Other Goods at around $30.\n2. Another Goods at $35.";
  return shoppingResearchSchema.parse({
    product: {
      name: "Trail Tote",
      url: "https://samplegoods.com/products/tote",
    },
    sources: [
      {
        id: "page",
        kind: "product",
        url: "https://samplegoods.com/products/tote?variant=123",
        capture: "browser",
        checkedAt: observedAt,
        content: page,
        artifact: "synthetic-page",
      },
      {
        id: "answer",
        kind: "search",
        url: "https://www.google.com/search?q=reusable+travel+bags",
        capture: "provider",
        checkedAt: observedAt,
        content: answer,
        artifact: "synthetic-answer",
      },
      {
        id: "ucp",
        kind: "ucp",
        url: "https://samplegoods.com/.well-known/ucp",
        capture: "http",
        checkedAt: observedAt,
        content: "HTTP 404",
        artifact: "synthetic-ucp",
      },
    ],
    queries: [
      {
        query: "reusable travel bags",
        surface: "Google AI Mode",
        market: "unknown",
        interfaceLocale: "unknown",
        signedOut: null,
        executedAt: observedAt,
        status: "observed",
        sourceIds: ["answer"],
        coverage: "Synthetic test answer only.",
        intent: "unbranded-specific",
        basis: {
          category: "bags",
          attribute: "travel",
          excerpts: [{ id: "basis", sourceId: "page", quote: page }],
          promptHash: "a".repeat(64),
        },
      },
    ],
    discovery: {
      queryIndex: 0,
      sourceId: "answer",
      answerHash: "b".repeat(64),
      linksHash: "c".repeat(64),
      checkedAt: observedAt,
      completeness: { status: "complete", reason: null },
      merchantPresent: false,
      merchantPosition: null,
      totalListed: 2,
      listed: [
        {
          name: "Other Goods",
          kind: "brand",
          position: 1,
          price: "around $30",
          excerptIds: ["answer-excerpt"],
        },
        {
          name: "Another Goods",
          kind: "retailer",
          position: 2,
          price: "$35",
          excerptIds: ["answer-excerpt"],
        },
      ],
      description: null,
      matchedAliases: [],
      presenceMethod: "server-v1",
      correctness: "uncertain",
      correctnessExcerptIds: [],
    },
    claims: [
      {
        id: "query",
        type: "observed",
        kind: "query",
        value: "reusable travel bags",
        sourceIds: ["answer"],
        excerptIds: ["answer-excerpt"],
        queryIndex: 0,
        qualifiers: [],
      },
      {
        id: "presence",
        type: "observed",
        kind: "merchant-presence",
        value: "absent",
        sourceIds: ["answer"],
        excerptIds: ["answer-excerpt"],
        queryIndex: 0,
        qualifiers: [],
      },
      {
        id: "price",
        type: "observed",
        kind: "price",
        value: "$30",
        sourceIds: ["answer"],
        excerptIds: ["answer-excerpt"],
        queryIndex: 0,
        qualifiers: ["around"],
      },
    ],
    claimExcerpts: [
      { id: "answer-excerpt", sourceId: "answer", quote: answer },
      { id: "page-excerpt", sourceId: "page", quote: page },
    ],
    ucp: {
      url: "https://samplegoods.com/.well-known/ucp",
      status: "notObserved",
      httpStatus: 404,
      capabilities: [],
      sourceIds: ["ucp"],
    },
    checkout: { status: "notTested", sourceIds: [], notes: "Not tested." },
    competitors: [],
    selected: {
      kind: "discovery-absence",
      observation:
        "The merchant was not matched in this answer or its citations.",
      consequence: "No commercial outcome was measured.",
      askAbout: "reusable travel bags",
      scope: "One synthetic answer only.",
      queryIndex: 0,
      sourceIds: ["answer", "page"],
      quotes: [
        { sourceId: "answer", quote: answer },
        { sourceId: "page", quote: page },
      ],
    },
  });
};

describe("discovery receipt contract", () => {
  test("accepts a complete unbranded receipt even when the page selected a default variant", () => {
    expect(validateShoppingResearch(absence(), 7, observed + 1000)).toBeNull();
  });
  test("caps absence at seven days regardless of stale-evidence permission", () => {
    expect(
      validateShoppingResearch(absence(), 30, observed + 7 * 86_400_000, {
        allowStaleEvidence: true,
      }),
    ).toBeNull();
    expect(
      validateShoppingResearch(absence(), 30, observed + 7 * 86_400_000 + 1, {
        allowStaleEvidence: true,
      }),
    ).toContain("fresh search");
  });
  test("a blocked answer or a matched merchant cannot become absence", () => {
    const blocked = absence();
    if (blocked.discovery)
      blocked.discovery.completeness = {
        status: "blocked",
        reason: "Access blocked.",
      };
    expect(validateShoppingResearch(blocked, 7, observed)).toContain(
      "incomplete",
    );
    const matched = absence();
    if (matched.discovery)
      matched.discovery.matchedAliases = ["samplegoods.com"];
    expect(validateShoppingResearch(matched, 7, observed)).toContain(
      "no merchant match",
    );
  });
  test("new claims cannot invent a price, lose an excerpt or gain a qualifier", () => {
    const changed = absence();
    const price = changed.claims?.find((claim) => claim.kind === "price");
    if (price) price.value = "$90";
    expect(validateShoppingResearch(changed, 7, observed)).toContain(
      "claim or qualifier",
    );
    const unknown = absence();
    if (unknown.claims?.[0]) unknown.claims[0].excerptIds = ["missing"];
    expect(validateShoppingResearch(unknown, 7, observed)).toContain("unknown");
    const qualifier = absence();
    if (qualifier.claims?.[2]) qualifier.claims[2].qualifiers = ["starting at"];
    expect(validateShoppingResearch(qualifier, 7, observed)).toContain(
      "claim or qualifier",
    );
  });
  test("new findings require unbranded intent and no-gap requires correctness proof", () => {
    const exact = absence();
    if (exact.queries[0]) exact.queries[0].intent = "exact-product";
    expect(validateShoppingResearch(exact, 7, observed)).toContain("unbranded");
    const unclear = absence();
    unclear.selected.kind = "no-gap";
    if (unclear.discovery) {
      unclear.discovery.merchantPresent = true;
      unclear.discovery.matchedAliases = ["Sample Goods"];
      unclear.discovery.merchantPosition = 1;
    }
    expect(validateShoppingResearch(unclear, 7, observed)).toContain(
      "verified correct",
    );
  });
  test("finding date belongs to its query rather than reused page context", () => {
    const receipt = absence();
    if (receipt.sources[0])
      receipt.sources[0].checkedAt = "2026-11-25T12:00:00.000Z";
    expect(shoppingFinding(receipt).checkedAt).toBe(observedAt);
  });
});
