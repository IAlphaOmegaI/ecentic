import { createHash } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { z } from "zod";
import {
  type AiJob,
  type PreparedQuery,
  rawCaptureSchema,
} from "./live-shopping-contract";

// Query creation and job polling share the provider's five-request minute limit.
export const shoppingClaimInterval = 15_000;
export const shoppingRetryLimit = 3;
export const shoppingPollLimit = 40;

export const shoppingQueryUrl = (query: PreparedQuery) => {
  const parameters = new URLSearchParams({
    prompt: query.prompt,
    country: query.country,
    bypass_cache: "true",
    timeout: "180",
  });
  return `https://api.scrapellm.com/scrapers/${query.surface}/jobs?${parameters}`;
};
export const shoppingPollUrl = (job: AiJob) =>
  `https://api.scrapellm.com/jobs/${job.id}`;

export const shoppingRateLimitSchema = z.object({
  response: rawCaptureSchema,
  retryAfterSeconds: z.number().int().min(0).max(3600),
  retryAt: z.string().datetime(),
});

/** Unknown 429s, accepted jobs, quotas and mismatched captures cannot authorize replay. */
export const shoppingMinuteRateLimit = (
  receipt: unknown,
  expectedUrl: string,
  headerDelay: number | null = null,
  now = Date.now(),
) => {
  const parsed = z
    .object({
      response: rawCaptureSchema,
      retryAfterSeconds: z
        .number()
        .finite()
        .min(0)
        .max(3600)
        .nullable()
        .optional(),
    })
    .safeParse(receipt);
  if (!parsed.success) return null;
  const response = parsed.data.response;
  if (
    response.url !== expectedUrl ||
    response.status !== 429 ||
    Date.parse(response.receivedAt) > now ||
    createHash("sha256").update(response.body).digest("hex") !==
      response.sha256 ||
    (headerDelay !== null &&
      (!Number.isFinite(headerDelay) || headerDelay < 0 || headerDelay > 3600))
  )
    return null;
  const json = resultify(() => JSON.parse(response.body) as unknown);
  if (
    !json.success ||
    !z
      .object({
        error: z.literal("Rate limit exceeded: max 5 request(s) per minute"),
      })
      .strict()
      .safeParse(json.data).success
  )
    return null;
  const retryAfterSeconds = Math.ceil(
    Math.max(headerDelay ?? 0, parsed.data.retryAfterSeconds ?? 0),
  );
  return shoppingRateLimitSchema.parse({
    response,
    retryAfterSeconds,
    retryAt: new Date(
      now + Math.max(60_000, retryAfterSeconds * 1000),
    ).toISOString(),
  });
};
