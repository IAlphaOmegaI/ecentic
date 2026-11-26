import "server-only";

import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import {
  discoveryFreshnessLimit,
  shoppingResearchSchema,
} from "@/lib/outbound-shopping-research";
import {
  aiCaptureSchema,
  aiJobSchema,
  browserResearchSchema,
  preparedQuerySchema,
} from "./live-shopping-contract";
import * as Assessment from "./shopping-assessment";

/** The first completed purchase remains intact before the second reservation. */
export const completedShoppingQuerySchema = z
  .object({
    query: preparedQuerySchema,
    shoppingJob: aiJobSchema,
    answer: aiCaptureSchema,
    browser: browserResearchSchema,
    shoppingReceipt: shoppingResearchSchema,
    queryReservedAt: z.string().datetime().optional(),
    requestId: z.string().uuid().optional(),
    policyHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    attemptMetadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .refine(
    (entry) => Boolean(entry.queryReservedAt || entry.requestId),
    "The completed query needs its original reservation.",
  );
export const shoppingQueryHistorySchema = z
  .array(completedShoppingQuerySchema)
  .max(1);
export type CompletedShoppingQuery = z.infer<
  typeof completedShoppingQuerySchema
>;

/** Pure guard used before generating, reserving and starting the broader query. */
export const broaderSearchProblem = (
  previous: CompletedShoppingQuery | undefined,
  now = Date.now(),
  controls: { searchesPerLead?: 1 | 2; discoveryFreshnessDays?: number } = {},
): string | null => {
  if (controls.searchesPerLead === 1)
    return "The Playbook allows one search per lead. Keep this lead for another product or season.";
  const days = discoveryFreshnessLimit(controls.discoveryFreshnessDays);
  const discovery = previous?.shoppingReceipt.discovery;
  const receiptQuery =
    previous?.shoppingReceipt.queries[
      previous.shoppingReceipt.selected.queryIndex
    ];
  if (
    !previous ||
    previous.query.intent !== "unbranded-specific" ||
    previous.shoppingReceipt.selected.kind !== "no-gap" ||
    discovery?.queryIndex !== previous.shoppingReceipt.selected.queryIndex ||
    discovery?.merchantPresent !== true ||
    discovery.merchantPosition !== 1 ||
    discovery.completeness.status !== "complete" ||
    discovery.correctness !== "correct" ||
    previous.answer.completeness?.status !== "complete" ||
    previous.browser.status !== "captured" ||
    receiptQuery?.intent !== "unbranded-specific" ||
    receiptQuery.query !== previous.query.prompt ||
    !isDeepStrictEqual(previous.query, previous.shoppingJob.query) ||
    !isDeepStrictEqual(previous.shoppingJob, previous.answer.job)
  )
    return "A broader search requires a complete first search with the store first and correct.";
  if (
    [receiptQuery.executedAt, discovery.checkedAt].some((timestamp) => {
      const elapsed = now - Date.parse(timestamp);
      return (
        !Number.isFinite(elapsed) || elapsed < 0 || elapsed > days * 86400000
      );
    })
  )
    return `The first search needs to be no more than ${days} days old before a broader search.`;
  return Assessment.validateAutomaticResearch(
    { answer: previous.answer, browser: previous.browser },
    previous.shoppingReceipt,
    7,
    { discoveryFreshnessDays: days },
  );
};
