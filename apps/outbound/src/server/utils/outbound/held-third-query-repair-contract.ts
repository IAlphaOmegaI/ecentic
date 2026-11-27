import { z } from "zod";

export const QUERY_PREPARATION_REPAIR_CONTROL =
  "669c6899-a5c7-4bd0-b630-438dd7e299c6";
export const QUERY_PREPARATION_REPAIR_CASES = [
  {
    sourceJobId: "a06b9bfa-ba77-428d-836b-cce0cc55de88",
    company: "LA Girl Cosmetics",
    mode: "la-grammar",
    action: "corrected",
    category: "concealer",
    intent: "unbranded-specific",
    attempts: 0,
    exactQuestion: "color correcting concealer",
  },
  {
    sourceJobId: "f5f0c085-0bbd-45ff-9f86-9a34ec0431f8",
    company: "Spyderco",
    mode: "spyderco-category",
    action: "broader",
    category: "folding knife",
    intent: "unbranded-broad",
    attempts: 2,
    exactQuestion: "knives",
  },
  {
    sourceJobId: "a5364156-48cf-4e3c-a106-da90790a6a24",
    company: "Só Dança USA",
    mode: "sodanca-product",
    action: "new-product",
    category: "ballet shoes",
    intent: "unbranded-specific",
    attempts: 2,
    exactQuestion: "leather ballet shoes",
  },
  {
    sourceJobId: "0fd92c97-343e-424e-9447-24dfdb4c80cd",
    company: "Good American",
    mode: "good-american-capture",
    action: "new-product",
    category: "wide-leg jeans",
    intent: "unbranded-specific",
    attempts: null,
    exactQuestion: "wide leg jeans",
  },
] as const;
export const QUERY_PREPARATION_REPAIR_VERSION = "round3-prepurchase-repair-v1";
export const QUERY_PREPARATION_GRAMMAR_VERSION =
  "shopper-query-v3-corrects-correcting-v1";
export const queryPreparationRepairModeSchema = z.enum([
  "la-grammar",
  "spyderco-category",
  "sodanca-product",
  "good-american-capture",
]);
export const QUERY_PREPARATION_REPAIR_REASON =
  "The category and use or occasion need exact support in the rendered product excerpts outside navigation, cart controls and promotional banners.";
export const QUERY_PREPARATION_CAPTURE_REASON =
  "The merchant product could not be verified in the rendered browser capture.";
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export type QueryPreparationRepairReference = {
  auditJobId: string;
  sourceRowHash: string;
  sourceOutputHash: string;
  fixVersion: typeof QUERY_PREPARATION_REPAIR_VERSION;
  repairedAt: string;
  mode: z.infer<typeof queryPreparationRepairModeSchema>;
  exactQuestion: string;
  grammarVersion: typeof QUERY_PREPARATION_GRAMMAR_VERSION;
  captureVersion: "product-group-color-v1" | null;
  repairedProductCaptureHash: string;
};
export const queryPreparationRepairReferenceSchema: z.ZodType<QueryPreparationRepairReference> =
  z
    .object({
      auditJobId: z.string().uuid(),
      sourceRowHash: hash,
      sourceOutputHash: hash,
      fixVersion: z.literal(QUERY_PREPARATION_REPAIR_VERSION),
      repairedAt: z.string().datetime(),
      mode: queryPreparationRepairModeSchema,
      exactQuestion: z.string().min(1),
      grammarVersion: z.literal(QUERY_PREPARATION_GRAMMAR_VERSION),
      captureVersion: z.literal("product-group-color-v1").nullable(),
      repairedProductCaptureHash: hash,
    })
    .strict();
export const queryPreparationRepairRequestSchema = z
  .object({
    sourceJobId: z.string().uuid(),
    instructionHash: hash,
    expectedSourceRowHash: hash,
    expectedOutputHash: hash,
  })
  .strict();
export const queryPreparationRepairBatchRequestSchema = z
  .array(queryPreparationRepairRequestSchema)
  .length(4)
  .refine((rows) => new Set(rows.map((row) => row.sourceJobId)).size === 4);
export const queryPreparationRepairInputSchema = z
  .object({
    operation: z.literal("heldDiscoveryRound3QueryPreparationRepair"),
    sourceJobId: z.string().uuid(),
    controlId: z.string().uuid(),
    prospectId: z.string().uuid(),
    instructionHash: hash,
    sourceRowHash: hash,
    sourceOutputHash: hash,
    fixVersion: z.literal(QUERY_PREPARATION_REPAIR_VERSION),
    requestedBy: z.string().min(1),
    repairedAt: z.string().datetime(),
    mode: queryPreparationRepairModeSchema,
    exactQuestion: z.string().min(1),
    grammarVersion: z.literal(QUERY_PREPARATION_GRAMMAR_VERSION),
    captureVersion: z.literal("product-group-color-v1").nullable(),
    repairedProductCaptureHash: hash,
  })
  .strict();
export const queryPreparationRepairOutputSchema = z
  .object({
    originalRowCanonical: z.string().min(1).max(20_000_000),
    originalOutputCanonical: z.string().min(1).max(20_000_000),
    initialRequeuedStateHash: hash,
  })
  .strict();
export type QueryPreparationRepairRequest = z.infer<
  typeof queryPreparationRepairRequestSchema
>;
