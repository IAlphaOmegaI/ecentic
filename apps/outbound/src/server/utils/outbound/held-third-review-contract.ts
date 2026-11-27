import { z } from "zod";
import {
  copyVerdictSchema,
  writerPartsSchema,
} from "@/lib/outbound-composition";
import {
  heldReviewInputSchema,
  heldReviewManifestSchema,
  heldReviewStateSchema,
} from "./held-review-contract";
import { queryPreparationRepairReferenceSchema } from "./held-third-query-repair-contract";
import {
  aiCaptureSchema,
  aiJobSchema,
  browserResearchSchema,
  rawCaptureSchema,
  shopperQueryReviewSchema,
} from "./live-shopping-contract";

export const HELD_THIRD_REVIEW_INSTRUCTION_HASH =
  "6ef577831d223517fb23771e51ea5fde77c72ad9de667a3d2fabbd61890e375c";
export const HELD_THIRD_REVIEW_ACTIONS: Record<
  string,
  | "broader"
  | "corrected"
  | "retry"
  | "new-product"
  | "rejudge"
  | "carry"
  | "no-brands"
  | "hold"
> = {
  "DPS Skis": "broader",
  "L.A.B. Golf": "broader",
  Spyderco: "broader",
  MakarttPro: "broader",
  "Tillamook Country Smoker": "broader",
  "LA Girl Cosmetics": "corrected",
  Teleties: "retry",
  "Good American": "new-product",
  "Pattern Beauty": "new-product",
  Obagi: "new-product",
  "Só Dança USA": "new-product",
  "Danessa Myricks Beauty": "rejudge",
  "D'IYANU": "rejudge",
  "Sunny Health & Fitness": "rejudge",
  "Alice Lane Home Collection": "carry",
  "Ema Savahl Couture": "carry",
  "Peepers by PeeperSpecs": "carry",
  "Cherry Republic": "carry",
  "Diamond Dotz": "no-brands",
  "Terrapin Ridge Farms": "no-brands",
  "ICON Vehicle Dynamics": "hold",
};
export const thirdReviewPurchaseAction = (action: string) =>
  ["broader", "corrected", "retry", "new-product"].includes(action);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const heldThirdProductSelectionsSchema = z
  .array(
    z
      .object({
        prospectId: z.string().uuid(),
        product: z
          .object({ name: z.string().trim().min(1), url: z.string().url() })
          .strict(),
        category: z.string().trim().min(1),
        evidence: z.record(z.string(), z.unknown()),
      })
      .strict(),
  )
  .length(4)
  .refine((rows) => new Set(rows.map((row) => row.prospectId)).size === 4);
export const heldThirdReviewControlSchema = z
  .object({
    operation: z.literal("heldDiscoveryRound3Batch"),
    batchId: z.string().uuid(),
    manifest: heldReviewManifestSchema,
    instructionHash: z.literal(HELD_THIRD_REVIEW_INSTRUCTION_HASH),
    requestedBy: z.string().min(1),
    initialQueriesReserved: z.literal(27),
    additionalQueries: z.literal(11),
    finalQueriesReserved: z.literal(38),
    selections: heldThirdProductSelectionsSchema,
  })
  .strict();
export const heldThirdReviewControlStateSchema = z
  .object({
    queriesReserved: z.number().int().min(0).max(11),
    paused: z.boolean(),
  })
  .strict();
export const heldThirdReviewInputSchema = heldReviewInputSchema
  .omit({
    operation: true,
    reviewRound: true,
    previousJobId: true,
    previousOutputHash: true,
    instructionHash: true,
  })
  .extend({
    operation: z.literal("heldDiscoveryRound3"),
    reviewRound: z.literal(3),
    controlId: z.string().uuid(),
    instructionHash: z.literal(HELD_THIRD_REVIEW_INSTRUCTION_HASH),
    action: z.enum([
      "broader",
      "corrected",
      "retry",
      "new-product",
      "rejudge",
      "carry",
      "no-brands",
      "hold",
    ]),
    previousJobId: z.string().uuid(),
    previousJobHash: digest,
    previousOutputHash: digest,
    parentInputHash: digest,
    originalProspectHash: digest,
    exactQuestion: z.string().min(1).optional(),
    productSelection: heldThirdProductSelectionsSchema.element.optional(),
  })
  .strict();
export const heldThirdPurchaseSchema = z
  .object({
    shoppingJob: aiJobSchema,
    queryReservedAt: z.string().datetime(),
    answer: aiCaptureSchema.optional(),
    browser: browserResearchSchema.optional(),
    queryReview: shopperQueryReviewSchema.optional(),
    status: z.enum(["captured", "failed", "uncertain"]),
    reason: z.string(),
    raw: z.array(rawCaptureSchema),
  })
  .strict();
export const heldThirdReviewStateSchema = heldReviewStateSchema
  .extend({
    stage: z.enum([
      "renderedProduct",
      "generateQuery",
      "query",
      "poll",
      "browser",
      "assess",
      "brands",
      "copyProof",
      "rejudge",
      "draft",
      "complete",
    ]),
    shoppingQueryCount: z.number().int().min(0).max(3),
    purchaseBaseline: z.number().int().min(0).max(2),
    priorPurchases: z.array(heldThirdPurchaseSchema).max(4),
    round3ReservedAt: z.string().datetime().optional(),
    queryPreparationRepair: queryPreparationRepairReferenceSchema.optional(),
    rejudgeReservedAt: z.string().datetime().optional(),
    rejudgeAudit: z
      .object({
        sourceContextHash: digest,
        sourceTextHash: digest,
        sourceReceiptHash: digest,
        originalVerdict: copyVerdictSchema.nullable(),
        verdict: copyVerdictSchema,
        judgeInputVersion: z.string().min(1),
        checkedAt: z.string().datetime(),
      })
      .strict()
      .optional(),
    suppliedParts: writerPartsSchema.optional(),
    mechanicalEdits: z
      .array(
        z
          .object({
            field: z.enum(["subject", "opening", "result", "relevance"]),
            before: z.string(),
            after: z.string(),
          })
          .strict(),
      )
      .optional(),
    draftReservedAt: z.string().datetime().optional(),
    judgeAudit: z
      .object({
        reusedExactRejudge: z.boolean(),
        newJudgmentPasses: z.union([z.literal(0), z.literal(1)]),
        judgeInputVersion: z.literal("brand-proof-judge-v3"),
      })
      .strict()
      .optional(),
  })
  .strict();
export type HeldThirdReviewInput = z.infer<typeof heldThirdReviewInputSchema>;
export type HeldThirdReviewState = z.infer<typeof heldThirdReviewStateSchema>;
export type HeldThirdProductSelections = z.infer<
  typeof heldThirdProductSelectionsSchema
>;
