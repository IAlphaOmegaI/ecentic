import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BLOCKS,
  DONTS,
  FORBIDDEN_CLAIMS,
  fill,
  NO_FINDING_EMAIL,
  objections,
  type Placeholders,
} from "@/app/[locale]/(main)/dev/call-sheet/_components/script";
import { formatPlanPrice, PLAN_CATALOG } from "@/lib/agent-api";

const values: Placeholders = {
  rep: "Sam",
  contact: "Alex",
  company: "Example Co",
  product: "the Wool Runner",
  finding: "there is no barcode on any product page",
  email: "alex@example.com",
};

/** Every string this page can render aloud, script and objections alike. */
const spoken = (): string[] => [
  ...BLOCKS.flatMap((block) => [
    block.title,
    ...block.lines.map((line) => fill(line, values)),
    block.note ?? "",
  ]),
  ...objections(values).flatMap((objection) => [
    objection.title,
    ...objection.lines,
    objection.note ?? "",
  ]),
  ...DONTS,
  fill(NO_FINDING_EMAIL.subject, values),
  fill(NO_FINDING_EMAIL.body, values),
];

/** The findings copy the rep reads out, taken from the scanner's own source. */
const findingCopy = (): string =>
  readFileSync(
    join(import.meta.dir, "../app/intelligence/prospect.ts"),
    "utf8",
  );

describe("claims the call sheet must never make", () => {
  test("none of the blocked claims appear in anything spoken", () => {
    // These are unverifiable, unbuilt, or misdescribe a relationship. A rep
    // reading one aloud cannot take it back.
    const text = spoken().join("\n").toLowerCase();

    for (const claim of FORBIDDEN_CLAIMS)
      expect(text).not.toContain(claim.toLowerCase());
  });

  test("none of the blocked claims appear in the findings copy", () => {
    const source = findingCopy().toLowerCase();

    for (const claim of FORBIDDEN_CLAIMS)
      expect(source).not.toContain(claim.toLowerCase());
  });

  test("no statistic is ever quoted", () => {
    // A measurement of the prospect's own catalogue ("0 of 8 products") is the
    // payload and is computed at scan time. A percentage or a customer count
    // about ecentic is what gets checked and found wrong.
    for (const line of spoken()) {
      expect(line).not.toMatch(/\d+\s?%/);
      expect(line).not.toMatch(/\b\d[\d,]*\s+(stores|merchants|customers)\b/i);
    }
  });
});

describe("the script reads correctly", () => {
  test("no placeholder survives into spoken copy", () => {
    for (const line of spoken()) expect(line).not.toMatch(/\{\{\w+\}\}/);
  });

  test("an unfilled field degrades to a readable word, not empty braces", () => {
    const blank: Placeholders = {
      rep: "",
      contact: "",
      company: "",
      product: "",
      finding: "",
      email: "",
    };

    const line = fill(
      "Hi {{contact}}, this is {{rep}} about {{product}}",
      blank,
    );

    expect(line).not.toContain("{{");
    expect(line).toContain("there");
  });

  test("the first three blocks are open and the rest are not", () => {
    // Blocks 4 and 5 are answers to a question the prospect has not asked yet.
    expect(BLOCKS.map((block) => block.open)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  test("the don't-strip is present", () => {
    expect(DONTS.length).toBeGreaterThan(0);
    expect(DONTS.join(" ")).toContain("Don't demo");
  });
});

describe("pricing comes from one constant", () => {
  test("the merchant price objection quotes PLAN_CATALOG", () => {
    const panel = objections(values).find(
      (objection) => objection.id === "price-merchant",
    );
    const text = panel?.lines.join(" ") ?? "";

    expect(text).toContain(formatPlanPrice("compete") ?? "");
    expect(text).toContain(formatPlanPrice("scale") ?? "");
  });

  test("formatPlanPrice drops cents only when they are zero", () => {
    expect(formatPlanPrice("compete")).toBe("$14.90");
    expect(formatPlanPrice("dominate")).toBe("$149");
    expect(formatPlanPrice("scan")).toBeNull();
  });

  test("the Spanish catalog quotes the same amounts", () => {
    // `agent-api.test.ts` already pins en.json to PLAN_CATALOG; Spanish uses a
    // comma decimal and was drifting unchecked.
    const messages = JSON.parse(
      readFileSync(join(import.meta.dir, "../../../messages/es.json"), "utf8"),
    ) as { pricing: { plans: Record<string, { figure: string }> } };

    for (const key of ["compete", "scale", "dominate"] as const) {
      const figure = messages.pricing.plans[key]?.figure ?? "";
      const cents = Math.round(
        Number(figure.replace(/[^0-9,.]/g, "").replace(",", ".")) * 100,
      );
      const plan = PLAN_CATALOG.find((entry) => entry.key === key);

      expect(cents).toBe(Number(plan?.price?.amountCents));
    }
  });
});
