import { z } from "zod";
import { locales } from "@/i18n/locales";

export const businessTypes = [
  "brand",
  "retailer",
  "enterprise",
  "agency",
] as const;
export const catalogSizes = [
  "under-1000",
  "1000-10000",
  "10000-100000",
  "over-100000",
] as const;
export const partnerTracks = ["agency", "technology", "creator"] as const;
export const aiChannels = [
  "chatgpt",
  "claude",
  "gemini",
  "copilot",
  "perplexity",
  "amazon",
  "unsure",
] as const;

export const websiteSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => {
    const parsed = URL.parse(
      value.includes("://") ? value : `https://${value}`,
    );
    return (
      !!parsed &&
      ["http:", "https:"].includes(parsed.protocol) &&
      parsed.hostname.includes(".") &&
      !parsed.username &&
      !parsed.password
    );
  });

const contact = {
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().toLowerCase().max(254),
  company: z.string().trim().min(1).max(180),
};
const context = {
  locale: z.enum(locales),
  topic: z.string().trim().min(1).max(180),
};

export const demoAboutSchema = z.object({
  ...contact,
  website: websiteSchema,
  businessType: z.enum(businessTypes),
  catalogSize: z.enum(catalogSizes),
  markets: z.string().trim().min(1).max(500),
});
export const demoGoalsSchema = z.object({
  goals: z.string().trim().min(1).max(3000),
  aiChannel: z.enum(aiChannels),
});

export const marketingLeadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("interest"),
    ...context,
    ...contact,
    catalogSize: z.enum(catalogSizes),
  }),
  z.object({
    kind: z.literal("integration"),
    ...context,
    ...contact,
    tool: z.string().trim().min(1).max(180),
    catalogSize: z.enum(catalogSizes),
  }),
  z.object({
    kind: z.literal("partner"),
    ...context,
    ...contact,
    website: websiteSchema,
    track: z.enum(partnerTracks),
    stores: z.string().trim().min(1).max(120),
    note: z.string().trim().max(3000),
  }),
  demoAboutSchema.extend({
    kind: z.literal("demo"),
    ...context,
    ...demoGoalsSchema.shape,
  }),
]);

export type MarketingLeadInput = z.infer<typeof marketingLeadSchema>;
export type DemoAbout = z.infer<typeof demoAboutSchema>;
export type DemoGoals = z.infer<typeof demoGoalsSchema>;
