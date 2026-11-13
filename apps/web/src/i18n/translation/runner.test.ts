import { describe, expect, test } from "bun:test";
import { translationReviewPasses } from "./policy";
import {
  type TranslationGenerator,
  type TranslationReviewReport,
  type TranslationUnit,
  TranslationValidationError,
  translateTextUnits,
  validateTranslationUnit,
} from "./runner";

const source = (
  text: string,
  fields: Partial<TranslationUnit> = {},
): TranslationUnit => ({
  id: "example",
  text,
  context: "A customer-facing product explanation",
  ...fields,
});

test("correction reviews only affected targets and records reused six-pass coverage", async () => {
  const reports: TranslationReviewReport[] = [];
  const reviews: {
    units: { id: string }[];
    unchangedNeighbors: { id: string }[];
  }[] = [];
  const generate: TranslationGenerator = async (request) => {
    if (request.phase === "draft")
      return {
        units: [
          { id: "price", text: "$999" },
          { id: "phrase", text: "Faire une décision" },
          { id: "label", text: "Comparer" },
        ],
      };
    if (request.phase === "correct")
      return {
        units: [
          { id: "price", text: "$14.90" },
          { id: "phrase", text: "Prendre une décision" },
        ],
      };
    if (request.phase !== "review") throw new Error("Unexpected adjudication");
    const payload = JSON.parse(
      request.prompt.slice(request.prompt.lastIndexOf("\n") + 1),
    );
    reviews.push(payload);
    return reviews.length === 1
      ? {
          checkedPasses: [...translationReviewPasses],
          reviewedIds: ["price", "phrase", "label"],
          issues: [
            {
              id: "phrase",
              pass: "linguistic",
              message: "Use the idiomatic collocation.",
            },
          ],
        }
      : reviewed(["price", "phrase"]);
  };
  expect(
    await translateTextUnits({
      units: [
        source("$14.90", { id: "price" }),
        source("Make a decision", { id: "phrase" }),
        source("Compare", { id: "label" }),
      ],
      targetLocale: "fr",
      generate,
      onReview: (report) => {
        reports.push(report);
      },
    }),
  ).toEqual([
    { id: "price", text: "$14.90" },
    { id: "phrase", text: "Prendre une décision" },
    { id: "label", text: "Comparer" },
  ]);
  expect(reviews[1]?.units.map((unit) => unit.id)).toEqual(["price", "phrase"]);
  expect(reviews[1]?.unchangedNeighbors.map((unit) => unit.id)).toEqual([
    "label",
  ]);
  expect(reports[1]?.reviewed).toEqual(["price", "phrase", "label"]);
  expect(reports[1]?.reviewCoverage).toEqual({
    freshIds: ["price", "phrase"],
    reusedIds: ["label"],
    reusedFrom: "draft",
  });
  expect(reports[1]?.findings).toEqual([]);
});

test("a correction cannot skip fresh review of an affected target", async () => {
  const count = { reviews: 0 };
  const generate: TranslationGenerator = async (request) => {
    if (request.phase === "draft")
      return {
        units: [
          { id: "price", text: "$999" },
          { id: "label", text: "Comparer" },
        ],
      };
    if (request.phase === "correct")
      return { units: [{ id: "price", text: "$14.90" }] };
    count.reviews++;
    return reviewed(count.reviews === 1 ? ["price", "label"] : []);
  };
  await expect(
    translateTextUnits({
      units: [
        source("$14.90", { id: "price" }),
        source("Compare", { id: "label" }),
      ],
      targetLocale: "fr",
      generate,
    }),
  ).rejects.toThrow(
    "Review returned missing, duplicate or unexpected unit IDs",
  );
});

const reviewed = (identifiers: readonly string[]) => ({
  checkedPasses: [...translationReviewPasses],
  reviewedIds: identifiers,
  issues: [],
});

describe("translation fidelity", () => {
  test("accepts equivalent French decimal and grouping conventions without changing USD", () => {
    expect(
      validateTranslationUnit(
        source("1,000 products cost $14.90 at 3%."),
        "1 000 produits coûtent $14,90 à 3 %.",
        "fr",
      ),
    ).toEqual([]);
    expect(
      validateTranslationUnit(
        source("Costs $14.90."),
        "料金は $14.90 です。",
        "ja",
      ),
    ).toEqual([]);
  });

  test("rejects changed facts, currency and a sign lost during translation", () => {
    expect(
      validateTranslationUnit(
        source("Costs $14.90 at 3%."),
        "Coûte 14,90 € à 4 %.",
        "fr",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateTranslationUnit(source("Change: -10"), "变化：10", "zh-CN")
        .length,
    ).toBeGreaterThan(0);
    expect(
      validateTranslationUnit(source("1 product"), "1.000 Produkte", "de")
        .length,
    ).toBeGreaterThan(0);
  });

  test("allows a written count to become digits and a range to use local punctuation", () => {
    expect(
      validateTranslationUnit(
        source("Two hands pass products."),
        "2つの手が商品を受け渡します。",
        "ja",
      ),
    ).toEqual([]);
    expect(
      validateTranslationUnit(
        source("Use three models."),
        "使用 3 个模型。",
        "zh-CN",
      ),
    ).toEqual([]);
    expect(
      validateTranslationUnit(
        source("Two hands pass products."),
        "3つの手が商品を受け渡します。",
        "ja",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateTranslationUnit(source("20-30 products"), "20〜30件の商品", "ja"),
    ).toEqual([]);
  });

  test("does not round large IDs or equate invalid numeric versions", () => {
    expect(
      validateTranslationUnit(source("Version 3.5.4"), "バージョン3.5.5", "ja")
        .length,
    ).toBeGreaterThan(0);
    expect(
      validateTranslationUnit(
        source("ID 9007199254740993"),
        "ID 9007199254740992",
        "ja",
      ).length,
    ).toBeGreaterThan(0);
  });

  test("allows grammatical acronym pluralization without losing a protected concept", () => {
    expect(
      validateTranslationUnit(source("Public APIs"), "API publiques", "fr"),
    ).toEqual([]);
    expect(
      validateTranslationUnit(
        source("Public APIs"),
        "Interfaces publiques",
        "fr",
      ).length,
    ).toBeGreaterThan(0);
  });

  test("rejects rearranged HTML nesting with the same tag counts", () => {
    expect(
      validateTranslationUnit(
        source("<strong><em>Read</em></strong>"),
        "<em><strong>Lire</strong></em>",
        "fr",
      ).length,
    ).toBeGreaterThan(0);
  });

  test("preserves code, endpoints and identifiers while allowing prose typography", () => {
    const unit = source("Use `GET /api/catalog` at https://ecentic.ai/docs.");
    expect(
      validateTranslationUnit(
        unit,
        "Utilisez `GET /api/catalog` sur https://ecentic.ai/docs.",
        "fr",
      ),
    ).toEqual([]);
    expect(
      validateTranslationUnit(
        unit,
        "「https://ecentic.ai/docs」を参照し、`GET /api/catalog` を使用します。",
        "ja",
      ),
    ).toEqual([]);
    expect(
      validateTranslationUnit(
        unit,
        "Utilisez `POST /api/catalog` sur https://ecentic.ai/fr/docs.",
        "fr",
      ).length,
    ).toBeGreaterThan(0);
  });

  test("preserves Markdown code and links without translating destinations", () => {
    const unit = source(
      "## Connect\n- **Read** [the guide](https://ecentic.ai/docs).\n```sh\nGET /api/catalog\n```",
      { format: "markdown" },
    );
    expect(
      validateTranslationUnit(
        unit,
        "## Connecter\n- **Lire** [le guide](https://ecentic.ai/docs).\n```sh\nGET /api/catalog\n```",
        "fr",
      ),
    ).toEqual([]);
    expect(
      validateTranslationUnit(
        unit,
        "## Connecter\n- Lire [le guide](https://ecentic.ai/fr/docs).\n```sh\nGET /api/catalog\n```",
        "fr",
      ).length,
    ).toBeGreaterThan(0);
  });

  test("checks protected names and supports explicit ordinary-word exceptions", () => {
    expect(
      validateTranslationUnit(
        source("Use Shopify and Compete."),
        "Utilisez Shopify et Compete.",
        "fr",
      ),
    ).toEqual([]);
    expect(
      validateTranslationUnit(
        source("Use Shopify and Compete."),
        "Utilisez Shopify et Concurrence.",
        "fr",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateTranslationUnit(
        source("Scale when AI starts buying.", {
          translatableTerms: ["Scale"],
        }),
        "Développez votre activité quand l’IA commence à acheter.",
        "fr",
      ),
    ).toEqual([]);
  });

  test("checks simple placeholders outside ICU", () => {
    expect(
      validateTranslationUnit(source("Hello {name}"), "Bonjour {nom}", "fr")
        .length,
    ).toBeGreaterThan(0);
    expect(
      validateTranslationUnit(source("Hello {name}"), "Bonjour {name}", "fr"),
    ).toEqual([]);
  });

  test("allows natural ICU argument order but rejects renaming, types and tag nesting", () => {
    const unit = source(
      "<strong>{name}</strong> has {count, number} products",
      { format: "icu" },
    );
    expect(
      validateTranslationUnit(
        unit,
        "<strong>{name}</strong>の商品は {count, number} 件です",
        "ja",
      ),
    ).toEqual([]);
    expect(
      validateTranslationUnit(
        unit,
        "{count, number} 商品属于 <strong>{name}</strong>",
        "zh-CN",
      ),
    ).toEqual([]);
    expect(
      validateTranslationUnit(
        unit,
        "<strong>{name}</strong>の商品は {total, number} 件です",
        "ja",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateTranslationUnit(
        unit,
        "{name}の商品は <strong>{count, number}</strong> 件です",
        "ja",
      ).length,
    ).toBeGreaterThan(0);
  });

  test("validates CJK plural branches locally instead of requiring English category counts", () => {
    const unit = source(
      "{count, plural, =0 {No Shopify products for {name}} one {# Shopify product for {name}} other {# Shopify products for {name}}}",
      { format: "icu" },
    );
    expect(
      validateTranslationUnit(
        unit,
        "{count, plural, =0 {{name} の Shopify 商品はありません} other {{name} の Shopify 商品は # 件です}}",
        "ja",
      ),
    ).toEqual([]);
    expect(
      validateTranslationUnit(
        unit,
        "{count, plural, other {{name} の Shopify 商品は # 件です}}",
        "ja",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateTranslationUnit(
        unit,
        "{count, plural, =0 {{name} の Shopify 商品はありません} other {Shopify 商品は # 件です}}",
        "ja",
      ).length,
    ).toBeGreaterThan(0);
  });

  test("requires French many, keeps exact branches and nested placeholders", () => {
    const unit = source(
      "{count, plural, one {# product in {store}} other {# products in {store}}}",
      { format: "icu" },
    );
    expect(
      validateTranslationUnit(
        unit,
        "{count, plural, one {# produit dans {store}} many {# produits dans {store}} other {# produits dans {store}}}",
        "fr",
      ),
    ).toEqual([]);
    expect(
      validateTranslationUnit(
        unit,
        "{count, plural, one {# produit dans {store}} other {# produits dans {store}}}",
        "fr",
      ).length,
    ).toBeGreaterThan(0);
  });

  test("preserves select keys, plural offsets and number skeletons", () => {
    expect(
      validateTranslationUnit(
        source("{role, select, owner {Owner {name}} other {Member {name}}}", {
          format: "icu",
        }),
        "{role, select, proprietaire {Propriétaire {name}} other {Membre {name}}}",
        "fr",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateTranslationUnit(
        source("{count, plural, offset:1 one {# product} other {# products}}", {
          format: "icu",
        }),
        "{count, plural, other {# 件の商品}}",
        "ja",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateTranslationUnit(
        source("{price, number, ::currency/USD}", { format: "icu" }),
        "{price, number, ::currency/EUR}",
        "fr",
      ).length,
    ).toBeGreaterThan(0);
  });

  test("does not use English character-count thresholds for CJK", () => {
    expect(
      validateTranslationUnit(
        source(
          "Please select the product you want to compare with a competitor.",
        ),
        "比較する商品を選択",
        "ja",
      ),
    ).toEqual([]);
  });
});

describe("translation and editorial review workflow", () => {
  test("runs a fresh six-pass review and preserves caller order and invariant rows", async () => {
    const phases: string[] = [];
    const generate: TranslationGenerator = async (request) => {
      phases.push(request.phase);
      return request.phase === "draft"
        ? {
            units: [
              { id: "second", text: "Publier" },
              { id: "first", text: "Comparer" },
            ],
          }
        : reviewed(["first", "second"]);
    };
    expect(
      await translateTextUnits({
        units: [
          source("Compare", { id: "first" }),
          source("/api/catalog", { id: "endpoint", invariant: true }),
          source("Publish", { id: "second" }),
        ],
        targetLocale: "fr",
        generate,
      }),
    ).toEqual([
      { id: "first", text: "Comparer" },
      { id: "endpoint", text: "/api/catalog" },
      { id: "second", text: "Publier" },
    ]);
    expect(phases).toEqual(["draft", "review"]);
  });

  test("corrects a mechanical failure even if the reviewer misses it, then rechecks", async () => {
    const phases: string[] = [];
    const generate: TranslationGenerator = async (request) => {
      phases.push(request.phase);
      switch (request.phase) {
        case "draft":
          return { units: [{ id: "example", text: "Coûte $19.90." }] };
        case "correct":
          return { units: [{ id: "example", text: "Coûte $14.90." }] };
        default:
          return reviewed(["example"]);
      }
    };
    expect(
      await translateTextUnits({
        units: [source("Costs $14.90.")],
        targetLocale: "fr",
        generate,
      }),
    ).toEqual([{ id: "example", text: "Coûte $14.90." }]);
    expect(phases).toEqual(["draft", "review", "correct", "review"]);
  });

  test("corrects a linguistic review finding through a separate drafting request", async () => {
    const phases: string[] = [];
    const generate: TranslationGenerator = async (request) => {
      phases.push(request.phase);
      if (request.phase === "draft")
        return { units: [{ id: "example", text: "Faire une décision" }] };
      if (request.phase === "correct")
        return { units: [{ id: "example", text: "Prendre une décision" }] };
      return phases.length === 2
        ? {
            checkedPasses: [...translationReviewPasses],
            reviewedIds: ["example"],
            issues: [
              {
                id: "example",
                pass: "linguistic",
                message: "The verbal collocation is an English calque.",
              },
            ],
          }
        : reviewed(["example"]);
    };
    expect(
      await translateTextUnits({
        units: [source("Make a decision")],
        targetLocale: "fr",
        generate,
      }),
    ).toEqual([{ id: "example", text: "Prendre une décision" }]);
    expect(phases).toEqual(["draft", "review", "correct", "review"]);
  });

  test("stops after one correction, exposing only independently cleared rows", async () => {
    const phases: string[] = [];
    const generate: TranslationGenerator = async (request) => {
      phases.push(request.phase);
      if (request.phase === "draft")
        return {
          units: [
            { id: "price", text: "$999" },
            { id: "label", text: "Comparer" },
          ],
        };
      if (request.phase === "correct")
        return { units: [{ id: "price", text: "$999" }] };
      return reviewed(phases.length === 2 ? ["price", "label"] : ["price"]);
    };
    const failure = await translateTextUnits({
      units: [
        source("$14.90", { id: "price" }),
        source("Compare", { id: "label" }),
      ],
      targetLocale: "fr",
      generate,
    }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(TranslationValidationError);
    if (!(failure instanceof TranslationValidationError))
      throw new Error("Expected validation failure");
    expect(failure.approvedUnits).toEqual([{ id: "label", text: "Comparer" }]);
    expect(phases).toEqual(["draft", "review", "correct", "review"]);
  });

  test("does not accept a missing, duplicate or unexpected translation row", async () => {
    const generate: TranslationGenerator = async () => ({ units: [] });
    await expect(
      translateTextUnits({
        units: [source("Compare")],
        targetLocale: "fr",
        generate,
      }),
    ).rejects.toThrow("missing, duplicate or unexpected");
  });

  test("does not accept a review that skipped required passes", async () => {
    const generate: TranslationGenerator = async (request) =>
      request.phase === "review"
        ? {
            checkedPasses: ["semantic"],
            reviewedIds: ["example"],
            issues: [],
          }
        : { units: [{ id: "example", text: "Comparer" }] };
    await expect(
      translateTextUnits({
        units: [source("Compare")],
        targetLocale: "fr",
        generate,
      }),
    ).rejects.toThrow("all six required passes");
  });
});

test("compact reviews cannot omit a clean unit or invent an issue ID", async () => {
  for (const review of [
    { checkedPasses: translationReviewPasses, reviewedIds: [], issues: [] },
    {
      checkedPasses: translationReviewPasses,
      reviewedIds: ["example"],
      issues: [
        { id: "unrequested", pass: "semantic", message: "Incorrect meaning" },
      ],
    },
  ]) {
    await expect(
      translateTextUnits({
        units: [source("Compare")],
        targetLocale: "fr",
        generate: async ({ phase }) =>
          phase === "review"
            ? review
            : { units: [{ id: "example", text: "Comparer" }] },
      }),
    ).rejects.toBeInstanceOf(TranslationValidationError);
  }
});
