import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { plansIndex } from "@/lib/agent-api";
import { agentInstructions } from "@/lib/agent-discovery";
import { routing } from "../routing";

type Row = Record<string, string | boolean>;

type Catalog = {
  enterpriseRecovery: {
    instructions: {
      sections: { id: string; title: string; description?: string }[];
    };
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
 * The current instructions page embeds the canonical agent document, which
 * directs agents to the public list_plans tool instead of repeating prices in
 * a separate FAQ. That public catalog must agree with the pricing page.
 */
describe("AI instructions page", () => {
  test("canonical guidance directs agents to the public plan catalog", () => {
    expect(agentInstructions).toContain("`list_plans` needs no credential");
    expect(plansIndex().documentation).toBe("https://ecentic.ai/pricing");
  });

  for (const locale of routing.locales) {
    const messages = catalog(locale);

    test(`${locale}: canonical guidance and public prices agree with the pricing page`, () => {
      const guidance = messages.enterpriseRecovery.instructions.sections.find(
        (section) => section.id === "machine-guidance",
      );
      expect(guidance?.title).toBeString();
      expect(guidance?.description).toContain(
        "/.well-known/agent-instructions.md",
      );

      for (const plan of paid) {
        const figure = messages.pricing.plans[plan]?.figure;
        expect(figure, `pricing.plans.${plan}.figure`).toBeString();
        if (!figure) throw new Error(`Missing ${plan} price`);
        const amount = Number(figure.replace(/[^\d.,]/g, "").replace(",", "."));
        const published = plansIndex(plan).plans[0];
        expect(published, `${plan} in the public catalog`).toBeDefined();
        if (!published) throw new Error(`Missing public ${plan} plan`);
        expect(published.currency).toBe("USD");
        if (published.performanceFee) {
          expect(figure).toContain("%");
          expect(amount * 100).toBe(published.performanceFee.rateBps);
        } else {
          expect(figure).toContain("$");
          expect(Math.round(amount * 100)).toBe(published.price?.amountCents);
        }
      }
    });

    // The pricing page builds its table from rows that state a value for every
    // plan. If those rows change shape the table renders with
    // no columns, and nothing else would notice.
    test(`${locale}: the pricing rows the table reads still exist`, () => {
      const rows = messages.pricing.compare.rows.filter((row) =>
        plans.every((plan) => typeof row[plan] === "string"),
      );

      expect(rows.length).toBeGreaterThanOrEqual(2);
    });
  }
});
