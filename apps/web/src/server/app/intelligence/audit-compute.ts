import { resultify } from "@zenncore/utils";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import * as AI from "../../utils/ai";
import type { StructuredDataStatus } from "./page-schema";

export const fieldKeys = [
  "title",
  "description",
  "price",
  "sku",
  "structuredData",
  "images",
] as const;

const schema = z.object({
  overall: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Overall listing quality 0-100, weighted toward the content fields an AI shopping agent actually reads",
    ),
  fields: z.array(
    z.object({
      key: z.enum(fieldKeys),
      score: z
        .number()
        .min(0)
        .max(100)
        .describe("Content quality 0-100 for this field — NOT mere presence"),
      verdict: z
        .string()
        .describe("One short phrase on the field's current state"),
      suggestion: z
        .string()
        .describe("One concrete, product-specific improvement for this field"),
    }),
  ),
  positioning: z.object({
    score: z
      .number()
      .min(0)
      .max(100)
      .describe(
        "How clearly and competitively this listing is positioned for its target audience",
      ),
    audience: z
      .string()
      .describe("The specific target customer this listing actually speaks to"),
    position: z
      .string()
      .describe("Its market position — e.g. premium, value, niche specialist"),
    reasoning: z.string().describe("Why this positioning score"),
    suggestion: z.string().describe("One way to sharpen the positioning"),
  }),
});

export type Type = z.infer<typeof schema>;

export type Input = {
  title: string;
  description: string | null;
  price: string | null;
  currency: string | null;
  sku: string | null;
  structuredData: string | null;
  /** Single live verdict for the product page's structured data. */
  structuredDataStatus: StructuredDataStatus;
  images: string | null;
  // Part of the cache key so the audit refreshes whenever the listing changes.
  product: string;
  updatedAt: string;
};

const instructions = `You are a senior e-commerce listing auditor. You judge how a product listing performs when AI shopping agents (GPT-4, Claude, Gemini, Perplexity) compare it against competitors.

Infer the product's category from its content and judge each field by what matters FOR THAT category — a mattress needs firmness, dimensions, and materials; a laptop needs CPU, RAM, and battery; a supplement needs ingredients and dosage. A field that is present but vague or generic scores LOW. Score content QUALITY, not presence.

Be specific to THIS product — never give generic advice that could apply to any listing.

Also assess positioning: who the listing actually targets (audience), its market position, and how clearly and competitively it is positioned.

Score harshly. Most real-world listings are mediocre (40-60). Reserve 80+ for genuinely excellent, category-leading content. Output only the structured fields.`;

const countImages = (images: string | null) => {
  if (!images || images === "[]") return 0;
  const parsed = resultify(() => JSON.parse(images) as unknown);
  if (!parsed.success || !Array.isArray(parsed.data)) return 0;
  return parsed.data.length;
};

// Cached: the same listing content yields the same audit until it changes (the
// `updatedAt` + content args bust the cache), so the AI runs at most once per
// listing revision instead of on every page view.
export const computeProductAudit = async (input: Input): Promise<Type> => {
  "use cache";
  cacheLife("days");
  cacheTag(`product-audit-${input.product}`);

  const images = countImages(input.images);

  const pageSchemaDetail = {
    "ecentic-optimized":
      "the ecentic app embed renders the published AI-optimized JSON-LD on the live page",
    "ecentic-standard":
      "the ecentic app embed renders default JSON-LD from live product data; no optimized version published yet",
    "store-default":
      "only the theme's own (usually thin) Product markup is on the live page — the ecentic app embed is off",
    "ecentic-optimized_embed-off":
      "optimized JSON-LD exists but the ecentic app embed is off, so NO ecentic markup reaches the live page",
    missing:
      "NO schema.org Product markup on the live product page — agents reading the rendered HTML see no machine-readable product data",
    unreachable: "the live product page could not be fetched to verify markup",
  }[input.structuredDataStatus];

  const prompt = `Audit this product listing.

TITLE: ${input.title}
DESCRIPTION: ${input.description ? input.description.slice(0, 1500) : "(missing)"}
PRICE: ${input.price ? `${input.price} ${input.currency ?? ""}`.trim() : "(missing)"}
SKU: ${input.sku ?? "(missing)"}
STRUCTURED DATA (JSON-LD): ${input.structuredData ? "present in synced data" : "(missing in synced data)"}; ${pageSchemaDetail}
IMAGES: ${images} image${images === 1 ? "" : "s"}

Score each field (${fieldKeys.join(", ")}) 0-100 on content quality for this product's category, each with a verdict and a specific suggestion. Then assess the listing's target audience and market positioning.`;

  return AI.generate({
    instructions,
    prompt,
    output: schema,
    schemaName: "ListingAudit",
    schemaDescription:
      "Category-aware content-quality audit of a product listing with a positioning assessment",
  });
};
