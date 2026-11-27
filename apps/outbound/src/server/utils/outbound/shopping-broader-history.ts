import "server-only";

import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { discoveryFreshnessLimit } from "@/lib/outbound-shopping-research";
import {
  aiCaptureSchema,
  aiJobSchema,
  browserResearchSchema,
  preparedQuerySchema,
} from "./live-shopping-contract";
import { validateShopperQueryReview } from "./shopper-query";
import { inspectDiscoveryPresence } from "./shopping-discovery-review";
import { inspectAnswerProductListings } from "./shopping-product-listings";
import {
  broaderSearchProblem,
  completedShoppingQuerySchema,
} from "./shopping-query-history";

/** An observed card match is not a ranked/correct receipt. Keep its complete purchase instead. */
export const presentShoppingQuerySchema = z
  .object({
    broaderBasis: z.literal("verified-product-card-presence-v1"),
    query: preparedQuerySchema,
    shoppingJob: aiJobSchema,
    answer: aiCaptureSchema,
    browser: browserResearchSchema.options[0],
    queryReservedAt: z.string().datetime(),
    requestId: z.string().uuid(),
    policyHash: z.string().regex(/^[a-f0-9]{64}$/),
    attemptMetadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/** Additive normal-pipeline history; the original ranked receipt format remains unchanged. */
export const normalShoppingQueryHistorySchema = z
  .array(z.union([completedShoppingQuerySchema, presentShoppingQuerySchema]))
  .max(1);
export type NormalShoppingQueryHistory = z.infer<
  typeof normalShoppingQueryHistorySchema
>[number];

export const normalBroaderSearchProblem = (
  previous: NormalShoppingQueryHistory | undefined,
  now = Date.now(),
  controls: { searchesPerLead?: 1 | 2; discoveryFreshnessDays?: number } = {},
): string | null => {
  if (!previous || "shoppingReceipt" in previous)
    return broaderSearchProblem(previous, now, controls);
  if (controls.searchesPerLead === 1)
    return "The Playbook allows one search per lead.";
  if (
    previous.query.intent !== "unbranded-specific" ||
    !isDeepStrictEqual(previous.query, previous.shoppingJob.query) ||
    !isDeepStrictEqual(previous.shoppingJob, previous.answer.job)
  )
    return "A broader search needs the original complete specific purchase.";
  const query = previous.query;
  if (!query.merchant || !query.review)
    return "The first search needs its bound merchant and product-fit review.";
  const days = discoveryFreshnessLimit(controls.discoveryFreshnessDays);
  const elapsed = now - Date.parse(previous.answer.executedAt);
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > days * 86400000)
    return `The first search needs to be no more than ${days} days old before a broader search.`;
  const queryProblem = validateShopperQueryReview(
    {
      product: query.product,
      category: query.category,
      merchant: query.merchant,
      browser: previous.browser,
      query,
      review: query.review,
      discoveryFreshnessDays: days,
    },
    now,
  );
  if (queryProblem) return queryProblem;
  const presence = inspectDiscoveryPresence(previous, now);
  if (presence.status === "held") return presence.reason;
  if (!presence.canBroaden || presence.discovery.merchantPresent !== true)
    return "A broader search needs the merchant in verified saved product cards.";
  const listings = inspectAnswerProductListings(previous.answer, now);
  return listings.status === "eligible" ? null : listings.reason;
};
