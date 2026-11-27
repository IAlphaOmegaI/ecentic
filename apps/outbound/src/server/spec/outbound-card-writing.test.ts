import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { assembleSequence } from "@/lib/outbound-composition";
import { deterministicCopyIssues } from "@/lib/outbound-copy-quality";
import {
  reviewDiscoverySummary,
  reviewResearchOutcome,
} from "@/lib/outbound-review-context";
import { compositionPrompt, validateWriterParts } from "@/lib/outbound-writing";
import { writerFixture } from "./helpers/outbound-writer-fixture";

/** Synthetic copy-only bound labels; never evidence of a real provider response. */
const cardFixture = () => {
  const fixture = writerFixture();
  const discovery = fixture.receipt.discovery;
  if (!discovery) throw new Error("Missing synthetic discovery.");
  discovery.order = "unranked";
  discovery.merchantPosition = discovery.totalListed = null;
  discovery.listed = [
    { name: "Alder Canvas Carry Tote", seller: "Marketplace Store" },
    { name: "Birch Linen Bag", seller: "Harbor Label" },
  ].map((card, index) => ({
    ...card,
    kind: "product",
    position: null,
    price: null,
    cardId: `synthetic-card-${index}`,
    excerptIds: [`synthetic-card-excerpt-${index}`],
  }));
  discovery.brandProjection = {
    version: "answer-brands-v1",
    brands: ["Alder", "Birch"].map((name, index) => ({
      name,
      position: null,
      excerptIds: [`synthetic-brand-${index}`],
    })),
  };
  fixture.receipt.claims = (fixture.receipt.claims ?? [])
    .filter((claim) =>
      ["query", "merchant-presence", "product-attribute"].includes(claim.kind),
    )
    .concat(
      discovery.brandProjection.brands.map((brand, index) => ({
        id: `brand-${index}`,
        type: "observed",
        kind: "brand",
        value: brand.name,
        qualifiers: [],
        sourceIds: [discovery.sourceId],
        excerptIds: brand.excerptIds,
        queryIndex: 0,
      })),
    );
  fixture.receipt.claimExcerpts = [
    ...(fixture.receipt.claimExcerpts ?? []).filter(
      (excerpt) => !excerpt.brand,
    ),
    ...discovery.listed.map((card, index) => ({
      id: `synthetic-brand-${index}`,
      sourceId: discovery.sourceId,
      quote: card.name,
      brand: {
        version: "answer-brands-v1" as const,
        answerHash: discovery.answerHash,
        context: "card-title" as const,
        cardId: card.cardId,
        start: index * 100,
        end: index * 100 + card.name.length,
        rawHash: createHash("sha256").update(card.name).digest("hex"),
        title: card.name,
      },
    })),
  ];
  fixture.parts.result =
    "It picked Alder and Birch. Sample Goods didn't come up.";
  return fixture;
};
const issues = (
  fixture: ReturnType<typeof cardFixture>,
  parts = fixture.parts,
) => validateWriterParts({ ...fixture, playbook: fixture.policy, parts });

describe("v2 brand-only unranked card results", () => {
  test("two source-bound brands may appear in either order without a rank claim", () => {
    const fixture = cardFixture();
    expect(issues(fixture)).toEqual([]);
    expect(
      issues(fixture, {
        ...fixture.parts,
        result: "It picked Birch and Alder. Sample Goods didn't come up.",
      }),
    ).toEqual([]);
    const prompt = compositionPrompt({ ...fixture, playbook: fixture.policy });
    const input = JSON.parse(prompt.prompt);
    expect(input.discovery.listed).toEqual([
      { name: "Alder", kind: "brand", position: null, price: null },
      { name: "Birch", kind: "brand", position: null, price: null },
    ]);
    for (const text of [
      "Alder Canvas Carry Tote",
      "Marketplace Store",
      "Harbor Label",
      "followupFact",
    ])
      expect(prompt.prompt).not.toContain(text);
    expect(prompt.instructions).toContain("Name two or three brands");
  });

  test("full listing titles, sellers and interface text never replace brands", () => {
    const fixture = cardFixture();
    for (const result of [
      "It picked Alder Canvas Carry Tote and Birch. Sample Goods didn't come up.",
      "It picked Marketplace Store and Harbor Label. Sample Goods didn't come up.",
      "It picked Alder and Birch & more. Sample Goods didn't come up.",
      "It picked Alder from Marketplace Store and Birch. Sample Goods didn't come up.",
      "It picked Alder. Sample Goods didn't come up.",
      "It picked Cedar and Birch. Sample Goods didn't come up.",
    ])
      expect(
        issues(fixture, { ...fixture.parts, result }).length,
      ).toBeGreaterThan(0);
  });

  test("missing or changed brand proof cannot authorize copy", () => {
    const missing = cardFixture();
    delete missing.receipt.discovery!.brandProjection;
    expect(issues(missing).length).toBeGreaterThan(0);
    const changed = cardFixture();
    changed.receipt.discovery!.brandProjection!.brands[0]!.name =
      "Harbor Label";
    expect(issues(changed).length).toBeGreaterThan(0);
    const seller = cardFixture();
    const proof = seller.receipt.claimExcerpts!.find(
      (excerpt) => excerpt.brand,
    )!;
    proof.brand!.title = proof.quote = "Marketplace Store";
    expect(issues(seller).length).toBeGreaterThan(0);
  });

  test("ordinals, relative order, total counts and prices are never inferred from cards", () => {
    const fixture = cardFixture();
    for (const result of [
      "It picked Alder first and Birch second. Sample Goods didn't come up.",
      "It picked Alder before Birch. Sample Goods didn't come up.",
      "It picked Alder then Birch. Sample Goods didn't come up.",
      "It picked Alder instead of Birch. Sample Goods didn't come up.",
      "It picked only Alder and Birch. Sample Goods didn't come up.",
      "It picked two brands, Alder and Birch. Sample Goods didn't come up.",
      "It picked Alder at $36 and Birch. Sample Goods didn't come up.",
    ])
      expect(
        issues(fixture, { ...fixture.parts, result }).length,
      ).toBeGreaterThan(0);
  });

  test("unknown ordering cannot authorize ranked or no-gap copy", () => {
    const fixture = cardFixture();
    for (const kind of ["discovery-outranked", "no-gap"] as const) {
      fixture.receipt.selected.kind = kind;
      expect(issues(fixture).length).toBeGreaterThan(0);
    }
    fixture.receipt.selected.kind = "discovery-absence";
    delete fixture.receipt.discovery!.order;
    expect(
      issues(fixture).some((issue) => /unknown ordering/.test(issue)),
    ).toBe(true);
  });

  test("quality runs the same exact brand gate and fixed follow-ups carry no fact", () => {
    const fixture = cardFixture();
    fixture.parts.result =
      "It picked Alder Canvas Carry Tote and Birch. Sample Goods didn't come up.";
    const assembled = assembleSequence(
      fixture.prospect,
      fixture.receipt,
      fixture.policy,
      fixture.parts,
    );
    if (assembled.status !== "ready") throw new Error(assembled.reason);
    expect(assembled.messages.slice(1).map((message) => message.body)).toEqual([
      "Bumping this!",
      "Jamie?",
    ]);
    expect(
      deterministicCopyIssues({
        ...fixture,
        playbook: fixture.policy,
        messages: assembled.messages,
      }).length,
    ).toBeGreaterThan(0);
  });

  test("review labels retain sellers and never turn card counts into global ranks", () => {
    const fixture = cardFixture();
    if (!fixture.receipt.discovery) throw new Error("Missing discovery.");
    fixture.receipt.discovery.merchantPosition = 1;
    fixture.receipt.discovery.totalListed = 2;
    const summary = reviewDiscoverySummary(fixture.receipt);
    expect(summary).toMatchObject({
      order: "unranked",
      position: null,
      total: null,
      listed: [
        "Alder Canvas Carry Tote (Marketplace Store)",
        "Birch Linen Bag (Harbor Label)",
      ],
    });
    delete fixture.receipt.discovery.order;
    expect(reviewDiscoverySummary(fixture.receipt)).toEqual(summary);
    const research = {
      ...summary,
      query: "linen bags",
      queryIntent: "unbranded-specific",
      priceDifference: false,
      kind: fixture.receipt.selected.kind,
      observation: "Synthetic fixture",
      checkedAt: new Date().toISOString(),
      fullAnswerAvailable: true,
    };
    expect(reviewResearchOutcome(research)).toBe("absent");
    expect(
      reviewResearchOutcome({
        ...research,
        kind: "discovery-outranked",
        position: 1,
        total: 2,
      }),
    ).toBe("unknown");
    expect(
      reviewResearchOutcome({
        ...research,
        kind: "no-gap",
        position: 1,
        total: 2,
      }),
    ).toBe("unknown");
    expect(
      reviewResearchOutcome({
        ...research,
        ...reviewDiscoverySummary(writerFixture(true).receipt),
        kind: "discovery-outranked",
      }),
    ).toBe("ranked");
  });
});
