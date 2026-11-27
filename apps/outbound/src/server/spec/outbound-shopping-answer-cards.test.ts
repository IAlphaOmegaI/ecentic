import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  parseShoppingAnswerCards,
  SHOPPING_ANSWER_CARDS_FORMAT,
} from "@/server/utils/outbound/shopping-answer-cards";

// Synthetic provider-shaped cards, not real recommendations or provider receipts.
const syntheticCard = (
  index: number,
  options: {
    title?: string;
    seller?: string;
    price?: string;
    originalPrice?: string;
    rating?: string;
    href?: string;
    image?: string;
  } = {},
) => `<div html-index="${index}" style="display:flex;align-items:center;gap:12px;padding:10px">
<img src="${options.image ?? "data:image/jpeg;base64,AA=="}" alt="${options.title ?? "Synthetic Linen Tote"}" width="120" height="auto" style="object-fit:cover; border-radius: 0.5rem;" />
<div style="flex:1">
<div style="font-weight:bold"><a href="${options.href ?? "https://example.test/item?q=tote&amp;source=synthetic"}">${options.title ?? "Synthetic Linen Tote"}</a></div>
<div style="margin-top:4px;font-size:18px">
${options.price ?? "$39.99"}
<span style="text-decoration: line-through;">${options.originalPrice ?? "$50"}</span>
</div>
<div>${options.seller ?? "Synthetic Store"}</div>
<div>${options.rating ?? " "}</div>
</div>
<div style="display: none">${index.toString(16).padStart(32, "0")}</div>
</div>`;
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const parsed = (answer: string) => {
  const result = parseShoppingAnswerCards(answer);
  expect(result.status).toBe("parsed");
  if (result.status !== "parsed") throw new Error(result.reason);
  return result;
};

describe("raw-bound provider product cards", () => {
  test("retains distinct topical sections without asserting a global ranking", () => {
    const answer = [
      "Synthetic answer about bags.",
      "#### Everyday bags",
      syntheticCard(1),
      syntheticCard(2, { title: "Synthetic Canvas Bag" }),
      "#### Travel bags",
      syntheticCard(3, { title: "Synthetic Travel Tote" }),
      "#### Small bags",
      syntheticCard(4, { title: "Synthetic Mini Tote" }),
      "Tell me your preferred size.",
    ].join("\n\n");
    const result = parsed(answer);
    expect(result.format).toBe(SHOPPING_ANSWER_CARDS_FORMAT);
    expect(result.answerHash).toBe(digest(answer));
    expect(result.sections.map((section) => section.heading)).toEqual([
      "Everyday bags",
      "Travel bags",
      "Small bags",
    ]);
    expect(result.sections.map((section) => section.cards.length)).toEqual([
      2, 1, 1,
    ]);
    for (const section of result.sections) {
      expect(
        answer.slice(
          section.start,
          section.start + (section.headingRaw?.length ?? 0),
        ),
      ).toBe(section.headingRaw ?? "");
      expect(section).not.toHaveProperty("position");
      expect(section).not.toHaveProperty("totalListed");
      for (const card of section.cards) {
        expect(card.sectionId).toBe(section.id);
        expect(answer.slice(card.start, card.end)).toBe(card.raw);
        expect(digest(card.raw)).toBe(card.rawHash);
        expect(card).not.toHaveProperty("position");
        expect(card).not.toHaveProperty("rank");
        expect(card).not.toHaveProperty("htmlIndex");
      }
    }
    expect(parseShoppingAnswerCards(answer)).toEqual(result);
  });

  test("decodes labels and links while keeping their exact raw source ranges", () => {
    const answer = syntheticCard(7, {
      title: "Synthetic Women&#39;s Linen &amp; Canvas Bag",
      seller: "Synthetic Shop &amp; Co",
      price: "from $39.99",
      originalPrice: "about $50",
      rating: "4.6 (6.2K)",
    });
    const result = parsed(answer);
    const card = result.sections[0]?.cards[0];
    expect(result.sections[0]?.heading).toBeNull();
    expect(card).toMatchObject({
      title: "Synthetic Women's Linen & Canvas Bag",
      seller: "Synthetic Shop & Co",
      price: "from $39.99",
      originalPrice: "about $50",
      rating: "4.6 (6.2K)",
      href: "https://example.test/item?q=tote&source=synthetic",
    });
    expect(card?.fields.title.raw).toBe(
      "Synthetic Women&#39;s Linen &amp; Canvas Bag",
    );
    expect(card?.fields.seller.raw).toBe("Synthetic Shop &amp; Co");
    expect(card?.fields.href.raw).toBe(
      'href="https://example.test/item?q=tote&amp;source=synthetic"',
    );
    if (!card) throw new Error("Missing synthetic card");
    for (const field of Object.values(card.fields))
      if (field) expect(answer.slice(field.start, field.end)).toBe(field.raw);
    expect(card.fields.price.raw.trim()).toBe("from $39.99");
    expect(card.fields.originalPrice?.raw).toBe("about $50");
    expect(card.fields.rating?.raw).toBe("4.6 (6.2K)");
  });

  test("retains repeated titles as distinct offers and never merges sellers or sections", () => {
    const answer = [
      "#### One use",
      syntheticCard(1, { seller: "Synthetic Retailer A" }),
      "#### Another use",
      syntheticCard(2, {
        seller: "Synthetic Retailer B",
        price: "$29",
        originalPrice: "",
      }),
    ].join("\n\n");
    const result = parsed(answer);
    const first = result.sections[0]?.cards[0];
    const second = result.sections[1]?.cards[0];
    expect(first?.title).toBe(second?.title);
    expect(first?.id).not.toBe(second?.id);
    expect(first?.sectionId).not.toBe(second?.sectionId);
    expect(first?.seller).toBe("Synthetic Retailer A");
    expect(second?.seller).toBe("Synthetic Retailer B");
    expect(second?.originalPrice).toBeNull();
    expect(second?.fields.originalPrice).toBeNull();
    expect(second?.rating).toBeNull();
    expect(second?.fields.rating).toBeNull();
  });

  test("large image data does not hide later cards or become a semantic field", () => {
    const answer = [
      "#### Synthetic cards",
      syntheticCard(1, {
        image: `data:image/jpeg;base64,${"A".repeat(450_000)}`,
      }),
      syntheticCard(2, { title: "Synthetic Later Merchant Tote" }),
    ].join("\n\n");
    const result = parsed(answer);
    expect(result.sections[0]?.cards[1]?.title).toBe(
      "Synthetic Later Merchant Tote",
    );
    const first = result.sections[0]?.cards[0];
    expect(first?.raw.length).toBeGreaterThan(450_000);
    expect(first).not.toHaveProperty("image");
    expect(first).not.toHaveProperty("imageUrl");
  });

  test("hashes change when the raw card or its answer context changes", () => {
    const answer = syntheticCard(1);
    const first = parsed(answer);
    const changed = parsed(answer.replace("$39.99", "$40.99"));
    const moved = parsed(`Synthetic context.\n\n${answer}`);
    expect(changed.answerHash).not.toBe(first.answerHash);
    expect(changed.sections[0]?.cards[0]?.rawHash).not.toBe(
      first.sections[0]?.cards[0]?.rawHash,
    );
    expect(moved.sections[0]?.cards[0]?.rawHash).toBe(
      first.sections[0]?.cards[0]?.rawHash,
    );
    expect(moved.sections[0]?.cards[0]?.id).not.toBe(
      first.sections[0]?.cards[0]?.id,
    );
  });

  test("plain answers and ordinary HTML do not claim card-format support", () => {
    for (const answer of [
      "1. Synthetic Store\n2. Another Store",
      "<p>Synthetic prose</p>",
      "No results.",
    ])
      expect(parseShoppingAnswerCards(answer).status).toBe("not-present");
  });

  test("rejects malformed, hidden, quoted or ambiguous cards without partial output", () => {
    const card = syntheticCard(1);
    const invalid = [
      card.slice(0, -6),
      card.replace(
        'href="https://example.test',
        'href="javascript:example.test',
      ),
      card.replace('style="flex:1"', 'style="flex:1;display:none"'),
      card.replace(
        'style="font-weight:bold"',
        'style="font-weight:bold;visibility:hidden"',
      ),
      card.replace('alt="Synthetic Linen Tote"', 'alt="Different Product"'),
      card.replace("<div>Synthetic Store</div>", "<div></div>"),
      card.replace("<div> </div>", "<div>Subscription required</div>"),
      card.replace(
        "</a>",
        '</a><a href="https://example.test/other">Other product</a>',
      ),
      card.replace(
        "<div>Synthetic Store</div>",
        "<div><span>Synthetic Store</span></div>",
      ),
      `${card}\n${card}`,
      `<div>${card}</div>`,
      `> ${card}`,
      `    ${card}`,
      `\x60\x60\x60html\n${card}\n\x60\x60\x60`,
      `${card}\n<script>synthetic()</script>`,
      `${card}\n${syntheticCard(2).replace('html-index="2"', 'html-index="2" html-index="3"')}`,
      `${card}\n${syntheticCard(2).replace("$39.99", "")}`,
    ];
    for (const answer of invalid) {
      const result = parseShoppingAnswerCards(answer);
      expect(result.status).toBe("invalid");
      expect(result).not.toHaveProperty("sections");
    }
  });
});
