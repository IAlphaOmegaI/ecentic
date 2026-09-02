import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  captureGaps,
  hasProductImage,
  isBrandLogo,
  isJudgeable,
} from "@/lib/competitor-evidence";
import { countSimulations, uniformPairing } from "@/lib/scan-estimate";
import type * as Competitor from "@/server/app/competitor";
import * as Formating from "@/server/app/intelligence/formating";
import * as Judge from "@/server/app/intelligence/judge";
import type * as Product from "@/server/app/product";

const competitor = (
  overrides: Partial<Competitor.Type> = {},
): Competitor.Type => ({
  id: "competitor-1",
  userId: "user-1",
  storeId: "store-1",
  title: "Nectar Premier Memory Foam Mattress",
  description: "12-inch memory foam, medium-firm, 365-night trial.",
  price: "1099.00",
  currency: "USD",
  image: "https://cdn.example.com/nectar-premier.jpg",
  url: "https://www.nectarsleep.com/premier",
  source: "Amazon",
  brand: "Nectar",
  selected: true,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
  ...overrides,
});

const product = (overrides: Partial<Product.Type> = {}): Product.Type => ({
  id: "product-1",
  storeId: "store-1",
  userId: "user-1",
  externalId: "shopify-1",
  title: "Cloudrest Hybrid Mattress",
  description: null,
  price: null,
  compareAtPrice: null,
  currency: "USD",
  images: null,
  url: null,
  sku: null,
  status: "active",
  rawData: null,
  structuredData: null,
  syncedAt: new Date("2026-09-01T00:00:00Z"),
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
  ...overrides,
});

describe("isJudgeable", () => {
  test("keeps a priced rival", () => {
    expect(isJudgeable(competitor())).toBe(true);
  });

  test("drops a rival with no price recorded", () => {
    expect(isJudgeable(competitor({ price: null }))).toBe(false);
  });

  test("treats a blank price as no price", () => {
    expect(isJudgeable(competitor({ price: "   " }))).toBe(false);
  });
});

describe("product imagery", () => {
  const favicon = "https://www.google.com/s2/favicons?domain=nectar.com&sz=128";

  const clearbit = "https://logo.clearbit.com/nectar.com";

  test("a guessed brand favicon is not product imagery", () => {
    expect(isBrandLogo(favicon)).toBe(true);
    expect(hasProductImage(competitor({ image: favicon }))).toBe(false);
  });

  // The shape actually stored: `getBrandLogo` minted these before HubSpot shut
  // Clearbit down, and the rows were never rewritten.
  test("a legacy Clearbit brand logo is not product imagery either", () => {
    expect(isBrandLogo(clearbit)).toBe(true);
    expect(hasProductImage(competitor({ image: clearbit }))).toBe(false);
  });

  test("a real image is", () => {
    expect(hasProductImage(competitor())).toBe(true);
  });

  test("no image at all is not", () => {
    expect(hasProductImage(competitor({ image: null }))).toBe(false);
  });
});

describe("captureGaps", () => {
  test("names nothing when the listing was fully captured", () => {
    expect(captureGaps(competitor())).toEqual([]);
  });

  test("names every unobserved attribute, never the price", () => {
    const gaps = captureGaps(
      competitor({ description: null, brand: null, image: null, url: null }),
    );

    expect(gaps).toEqual([
      "description",
      "brand",
      "product imagery",
      "listing URL",
    ]);
    expect(gaps).not.toContain("price");
  });
});

describe("formatCompetitor", () => {
  // The regression this whole boundary exists for: `MISSING` lines are what
  // RUBRIC_CORE is instructed to penalize, so emitting them for a rival we
  // simply never measured handed the merchant a free win.
  test("never prints a MISSING line", () => {
    const rendered = Formating.formatCompetitor(
      competitor({ description: null, brand: null, image: null, url: null }),
    );

    expect(rendered).not.toContain("MISSING");
  });

  test("names unobserved attributes once, as unknown rather than absent", () => {
    const rendered = Formating.formatCompetitor(
      competitor({ description: null, brand: null }),
    );

    expect(rendered).toContain("Not captured about this listing:");
    expect(rendered).toContain("description, brand");
    expect(rendered).toContain("NOT confirmed absent");
  });

  test("says nothing about capture when everything was captured", () => {
    expect(Formating.formatCompetitor(competitor())).not.toContain(
      "Not captured",
    );
  });

  test("does not claim a favicon as a product image", () => {
    const rendered = Formating.formatCompetitor(
      competitor({
        image: "https://www.google.com/s2/favicons?domain=nectar.com&sz=128",
      }),
    );

    expect(rendered).not.toContain("Product image: yes");
    expect(rendered).toContain("product imagery");
  });

  test("still reports a missing price defensively", () => {
    expect(Formating.formatCompetitor(competitor({ price: null }))).toContain(
      "price",
    );
  });
});

describe("formatProduct", () => {
  // Deliberately the opposite of formatCompetitor: these fields come from the
  // merchant's own catalog, so a blank one is a defect they can go and fix.
  test("still prints MISSING for the merchant's own gaps", () => {
    const rendered = Formating.formatProduct(product());

    expect(rendered).toContain("Description: MISSING");
    expect(rendered).toContain("Price: MISSING");
  });
});

describe("capture-gap rule", () => {
  // The formatter's gap line is only safe if the prompt rendering it explains
  // what the line means. A rubric that prints the gaps and keeps its
  // penalize-everything clause is strictly worse than one that prints neither.
  test("both judge prompts carry the exception", () => {
    expect(Judge.JUDGE_SYSTEM).toContain(Judge.CAPTURE_GAP_RULE);
    expect(Judge.JUDGE_SYSTEM_AB).toContain(Judge.CAPTURE_GAP_RULE);
  });

  test("the UCP lift judge carries it too", () => {
    const source = readFileSync(
      join(import.meta.dir, "../app/intelligence/ucp/simulation.ts"),
      "utf8",
    );

    expect(source).toContain("Judge.CAPTURE_GAP_RULE");
  });
});

describe("countSimulations", () => {
  test("counts one comparison per pair per perspective", () => {
    expect(countSimulations(uniformPairing(50, 8), 3)).toBe(1200);
  });

  test("handles a non-uniform pair graph", () => {
    expect(countSimulations([8, 2, 0], 3)).toBe(30);
  });

  test("is zero when nothing is paired", () => {
    expect(countSimulations(uniformPairing(50, 0), 3)).toBe(0);
    expect(countSimulations(uniformPairing(0, 8), 3)).toBe(0);
  });
});
