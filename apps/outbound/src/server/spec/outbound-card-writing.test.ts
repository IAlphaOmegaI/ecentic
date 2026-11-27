import { describe, expect, test } from "bun:test";
import { assembleSequence } from "@/lib/outbound-composition";
import { deterministicCopyIssues } from "@/lib/outbound-copy-quality";
import {
  reviewDiscoverySummary,
  reviewResearchOutcome,
} from "@/lib/outbound-review-context";
import { compositionPrompt, validateWriterParts } from "@/lib/outbound-writing";
import { writerFixture } from "./helpers/outbound-writer-fixture";

/** Synthetic copy-only card facts, never evidence of a real provider response. */
const cardFixture = () => {
  const fixture = writerFixture();
  const discovery = fixture.receipt.discovery;
  if (!discovery) throw new Error("Missing synthetic discovery.");
  discovery.order = "unranked";
  discovery.merchantPosition = null;
  discovery.totalListed = null;
  discovery.listed = [
    { name: "Canvas Carry Tote", seller: "Alder Store" },
    { name: "Birch Linen Bag", seller: "Harbor Label" },
  ].map((card, index) => ({
    ...card,
    kind: "product",
    position: null,
    price: null,
    cardId: `synthetic-card-${index}`,
    excerptIds: [`synthetic-card-excerpt-${index}`],
  }));
  fixture.receipt.claims = (fixture.receipt.claims ?? [])
    .filter((claim) =>
      ["query", "merchant-presence", "product-attribute"].includes(claim.kind),
    )
    .concat(
      discovery.listed.flatMap((card, index) => [
        {
          id: `card-title-${index}`,
          type: "observed" as const,
          kind: "name" as const,
          value: card.name,
          qualifiers: [card.seller ?? ""],
          sourceIds: [discovery.sourceId],
          excerptIds: card.excerptIds,
          queryIndex: 0,
        },
        {
          id: `card-seller-${index}`,
          type: "observed" as const,
          kind: "name" as const,
          value: card.seller ?? "",
          qualifiers: [],
          sourceIds: [discovery.sourceId],
          excerptIds: card.excerptIds,
          queryIndex: 0,
        },
      ]),
    );
  fixture.receipt.claimExcerpts = [
    ...(fixture.receipt.claimExcerpts ?? []),
    ...discovery.listed.map((card, index) => ({
      id: `synthetic-card-excerpt-${index}`,
      sourceId: discovery.sourceId,
      quote: `Product: ${card.name}\nSeller: ${card.seller}`,
    })),
  ];
  fixture.parts.result =
    "It listed Canvas Carry Tote from Alder Store and Birch Linen Bag from Harbor Label. Sample Goods didn't come up.";
  fixture.parts.followupFact = "";
  return fixture;
};
const issues = (
  fixture: ReturnType<typeof cardFixture>,
  parts = fixture.parts,
) => validateWriterParts({ ...fixture, playbook: fixture.policy, parts });
const renameCard = (
  fixture: ReturnType<typeof cardFixture>,
  index: number,
  name: string,
  seller: string,
) => {
  const card = fixture.receipt.discovery?.listed[index];
  const titleClaim = fixture.receipt.claims?.find(
    (claim) => claim.id === `card-title-${index}`,
  );
  const sellerClaim = fixture.receipt.claims?.find(
    (claim) => claim.id === `card-seller-${index}`,
  );
  if (!card || !titleClaim || !sellerClaim)
    throw new Error("Missing synthetic card identity.");
  card.name = titleClaim.value = name;
  card.seller = sellerClaim.value = seller;
  titleClaim.qualifiers = [seller];
};

describe("unranked product-card copy", () => {
  test("attributed alternatives may be named in either order without claiming a rank", () => {
    const fixture = cardFixture();
    expect(issues(fixture)).toEqual([]);
    expect(
      issues(fixture, {
        ...fixture.parts,
        result:
          "It listed Birch Linen Bag from Harbor Label and Canvas Carry Tote from Alder Store. Sample Goods didn't come up.",
      }),
    ).toEqual([]);
    expect(
      issues(fixture, {
        ...fixture.parts,
        result:
          "It listed Canvas Carry Tote sold by Alder Store. Sample Goods didn't come up.",
      }),
    ).toEqual([]);
    expect(
      issues(fixture, {
        ...fixture.parts,
        result:
          'It listed "Canvas Carry Tote" from "Alder Store". Sample Goods didn\'t come up.',
      }),
    ).toEqual([]);
    const prompt = compositionPrompt({ ...fixture, playbook: fixture.policy });
    expect(prompt.instructions).toContain(
      "A seller alone cannot replace the product",
    );
    expect(JSON.parse(prompt.prompt).discovery.order).toBe("unranked");
  });

  test("title and seller attribution cannot be omitted, shortened or swapped", () => {
    const fixture = cardFixture();
    for (const result of [
      "It listed Canvas Carry Tote. Sample Goods didn't come up.",
      "It listed Alder Store. Sample Goods didn't come up.",
      "It listed Canvas from Alder Store. Sample Goods didn't come up.",
      "It listed Canvas Carry Tote from Harbor Label. Sample Goods didn't come up.",
      "It listed Canvas Carry Tote. Alder Store was named; Sample Goods didn't come up.",
    ])
      expect(
        issues(fixture, { ...fixture.parts, result }).some((issue) =>
          /attribution|attributed product|shortened/.test(issue),
        ),
      ).toBe(true);
  });

  test("a valid attribution cannot excuse another occurrence with a wrong or missing seller", () => {
    const fixture = cardFixture();
    renameCard(fixture, 0, "Canvas Tote", "Alder Store");
    renameCard(fixture, 1, "Linen Bag", "Harbor Label");
    for (const result of [
      "It listed Canvas Tote from Alder Store, Canvas Tote from Harbor Label and Linen Bag from Harbor Label. Sample Goods didn't come up.",
      "It listed Canvas Tote from Harbor Label and Canvas Tote from Alder Store. Sample Goods didn't come up.",
      "It listed Canvas Tote from Alder Store and Canvas Tote. Sample Goods didn't come up.",
      "It listed Canvas Tote from Alder Store and Alder Store. Sample Goods didn't come up.",
    ])
      expect(
        issues(fixture, { ...fixture.parts, result }).some((issue) =>
          /attribution|attributed product/.test(issue),
        ),
      ).toBe(true);
    const parts = {
      ...fixture.parts,
      result:
        "It listed Linen Bag from Harbor Label. Sample Goods didn't come up.",
      followupFact:
        "Canvas Tote from Alder Store and Canvas Tote from Harbor Label were named.",
    };
    expect(
      issues(fixture, parts).some((issue) =>
        /followupFact:.*attribution/.test(issue),
      ),
    ).toBe(true);
  });

  test("identical titles may use either captured seller without requiring the other", () => {
    const fixture = cardFixture();
    renameCard(fixture, 0, "Canvas Tote", "Alder Store");
    renameCard(fixture, 1, "Canvas Tote", "Harbor Label");
    for (const result of [
      "It listed Canvas Tote from Alder Store. Sample Goods didn't come up.",
      "It listed Canvas Tote from Harbor Label. Sample Goods didn't come up.",
      "It listed Canvas Tote from Alder Store and Canvas Tote from Harbor Label. Sample Goods didn't come up.",
    ])
      expect(issues(fixture, { ...fixture.parts, result })).toEqual([]);
  });

  test("a shorter title cannot lend its seller to a different longer title", () => {
    const fixture = cardFixture();
    renameCard(fixture, 0, "Canvas Tote", "Alder Store");
    renameCard(fixture, 1, "Large Canvas Tote", "Harbor Label");
    expect(
      issues(fixture, {
        ...fixture.parts,
        result:
          "It listed Large Canvas Tote from Alder Store. Sample Goods didn't come up.",
      }).some((issue) => /attribution/.test(issue)),
    ).toBe(true);
    expect(
      issues(fixture, {
        ...fixture.parts,
        result:
          "It listed Large Canvas Tote from Harbor Label. Sample Goods didn't come up.",
      }),
    ).toEqual([]);
  });

  test("ordinals, relative order, total counts and prices are not inferred from cards", () => {
    const fixture = cardFixture();
    for (const result of [
      "It listed Canvas Carry Tote from Alder Store first. Sample Goods didn't come up.",
      "It listed Canvas Carry Tote from Alder Store 1st. Sample Goods didn't come up.",
      "Canvas Carry Tote from Alder Store came before Birch Linen Bag from Harbor Label. Sample Goods didn't come up.",
      "It listed Canvas Carry Tote from Alder Store then Birch Linen Bag from Harbor Label. Sample Goods didn't come up.",
      "It listed Canvas Carry Tote from Alder Store instead of Birch Linen Bag from Harbor Label. Sample Goods didn't come up.",
      "It listed only Canvas Carry Tote from Alder Store. Sample Goods didn't come up.",
      "It listed 2 results, Canvas Carry Tote from Alder Store. Sample Goods didn't come up.",
      "It listed Canvas Carry Tote from Alder Store at $36. Sample Goods didn't come up.",
    ])
      expect(
        issues(fixture, { ...fixture.parts, result }).some((issue) =>
          /position|relative order|number|price/.test(issue),
        ),
      ).toBe(true);
  });

  test("unknown-order receipts cannot authorize outranked/no-gap or forged counts", () => {
    const fixture = cardFixture();
    fixture.receipt.selected.kind = "discovery-outranked";
    expect(issues(fixture).some((issue) => /Unranked/.test(issue))).toBe(true);
    fixture.receipt.selected.kind = "no-gap";
    expect(issues(fixture)).toContain("This finding is not sendable.");
    fixture.receipt.selected.kind = "discovery-absence";
    if (!fixture.receipt.discovery) throw new Error("Missing discovery.");
    fixture.receipt.discovery.totalListed = 2;
    expect(issues(fixture).some((issue) => /Unranked/.test(issue))).toBe(true);
    delete fixture.receipt.discovery.order;
    expect(
      issues(fixture).some((issue) => /unknown ordering/.test(issue)),
    ).toBe(true);
  });

  test("follow-up alternatives retain their attribution and deterministic quality uses the same gate", () => {
    const fixture = cardFixture();
    fixture.parts.result =
      "It listed Canvas Carry Tote from Alder Store. Sample Goods didn't come up.";
    fixture.parts.followupFact =
      "It also listed Birch Linen Bag from Harbor Label.";
    expect(issues(fixture)).toEqual([]);
    fixture.parts.followupFact = "It also listed Harbor Label.";
    const assembled = assembleSequence(
      fixture.prospect,
      fixture.receipt,
      fixture.policy,
      fixture.parts,
    );
    expect(assembled.status).toBe("ready");
    if (assembled.status !== "ready") return;
    expect(
      deterministicCopyIssues({
        ...fixture,
        playbook: fixture.policy,
        messages: assembled.messages,
      }).some((issue) => /attributed product title/.test(issue)),
    ).toBe(true);
  });

  test("numbers and order words inside exact product/seller names remain names", () => {
    const fixture = cardFixture();
    const card = fixture.receipt.discovery?.listed[0];
    const title = fixture.receipt.claims?.find(
      (claim) => claim.id === "card-title-0",
    );
    const seller = fixture.receipt.claims?.find(
      (claim) => claim.id === "card-seller-0",
    );
    if (!card || !title || !seller) throw new Error("Missing synthetic card.");
    card.name = "First Choice 2 Tote";
    card.seller = "Before Dawn";
    title.value = card.name;
    title.qualifiers = [card.seller];
    seller.value = card.seller;
    fixture.parts.result =
      "It listed First Choice 2 Tote from Before Dawn. Sample Goods didn't come up.";
    expect(issues(fixture)).toEqual([]);
  });

  test("a seller word inside another card's exact title is not a separate seller claim", () => {
    const fixture = cardFixture();
    const card = fixture.receipt.discovery?.listed[1];
    const title = fixture.receipt.claims?.find(
      (claim) => claim.id === "card-title-1",
    );
    const seller = fixture.receipt.claims?.find(
      (claim) => claim.id === "card-seller-1",
    );
    if (!card || !title || !seller) throw new Error("Missing synthetic card.");
    card.seller = "Canvas";
    title.qualifiers = [card.seller];
    seller.value = card.seller;
    fixture.parts.result =
      "It listed Canvas Carry Tote from Alder Store. Sample Goods didn't come up.";
    expect(issues(fixture)).toEqual([]);
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
        "Canvas Carry Tote (Alder Store)",
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
