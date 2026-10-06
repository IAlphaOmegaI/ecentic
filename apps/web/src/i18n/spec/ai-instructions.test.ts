import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { routing } from "../routing";

type Row = Record<string, string | boolean>;

type Catalog = {
  aiInstructions: {
    faq: { items: { question: string; answer: string }[] };
  };
  pricing: {
    plans: Record<string, { figure?: string }>;
    compare: { rows: Row[] };
  };
};

const catalog = (locale: string) =>
  JSON.parse(
    readFileSync(
      join(import.meta.dir, `../../../messages/${locale}.json`),
      "utf8",
    ),
  ) as Catalog;

const paid = ["payg", "compete", "scale", "dominate"] as const;
const plans = ["scan", ...paid] as const;

/**
 * `/ai-instructions` exists to be quoted. Whatever it says about price is what
 * an answer engine repeats, so a figure that drifts from the pricing page is
 * not a stale page — it is a wrong answer, served under the brand's name, by
 * something the merchant cannot correct.
 */
describe("AI instructions page", () => {
  for (const locale of routing.locales) {
    const messages = catalog(locale);

    test(`${locale}: the prices it quotes are the pricing page's own`, () => {
      const answers = messages.aiInstructions.faq.items
        .map((item) => item.answer)
        .join("\n");

      for (const plan of paid) {
        const figure = messages.pricing.plans[plan]?.figure;
        expect(figure, `pricing.plans.${plan}.figure`).toBeString();
        expect(answers, `${plan} price in the FAQ`).toContain(figure as string);
      }
    });

    // The page builds its price table from the comparison rows that state a
    // value for every plan. If those rows change shape the table renders with
    // no columns, and nothing else would notice.
    test(`${locale}: the pricing rows the table reads still exist`, () => {
      const rows = messages.pricing.compare.rows.filter((row) =>
        plans.every((plan) => typeof row[plan] === "string"),
      );

      expect(rows.length).toBeGreaterThanOrEqual(2);
    });
  }
});
