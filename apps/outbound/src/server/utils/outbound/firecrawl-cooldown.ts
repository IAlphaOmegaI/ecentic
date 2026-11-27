import { createHash } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { z } from "zod";
import { rawCaptureSchema } from "./live-shopping-contract";

export const browserClaimInterval = 60_000;
export const browserRetryLimit = 3;

export const browserRateLimitSchema = z.object({
  response: rawCaptureSchema,
  retryAfterSeconds: z.number().int().min(0).max(3600),
  retryAt: z.string().datetime(),
});

/** Only a rejected session creation can be replayed without an accepted browser. */
export const sessionCreationRateLimit = (
  receipt: unknown,
  headerDelay: number | null = null,
  retries = 0,
  now = Date.now(),
) => {
  if (!Number.isInteger(retries) || retries < 0 || retries > browserRetryLimit)
    return null;
  const parsed = z.object({ response: rawCaptureSchema }).safeParse(receipt);
  if (!parsed.success) return null;
  const response = parsed.data.response;
  if (
    response.url !== "https://api.firecrawl.dev/v2/interact" ||
    response.status !== 429 ||
    Date.parse(response.receivedAt) > now ||
    createHash("sha256").update(response.body).digest("hex") !== response.sha256
  )
    return null;
  const json = resultify(() => JSON.parse(response.body) as unknown);
  if (!json.success) return null;
  const rejection = z
    .object({
      success: z.literal(false),
      error: z.string(),
      retry_after_seconds: z.number().finite().min(0).max(3600).optional(),
    })
    .strict()
    .safeParse(json.data);
  if (
    !rejection.success ||
    !/rate limit exceeded/i.test(rejection.data.error) ||
    !/Consumed \(req\/min\): \d+, Remaining \(req\/min\): 0/i.test(
      rejection.data.error,
    ) ||
    (headerDelay !== null &&
      (!Number.isFinite(headerDelay) || headerDelay < 0 || headerDelay > 3600))
  )
    return null;
  const retryAfterSeconds = Math.ceil(
    Math.max(headerDelay ?? 0, rejection.data.retry_after_seconds ?? 0),
  );
  return browserRateLimitSchema.parse({
    response,
    retryAfterSeconds,
    retryAt: new Date(
      now +
        Math.max(
          browserClaimInterval * 2 ** Math.min(retries, browserRetryLimit),
          retryAfterSeconds * 1000,
        ),
    ).toISOString(),
  });
};

/** Readiness may shorten only a fully saved, hash-checked rejected session creation. */
export const confirmedBrowserCooldown = (
  receipt: unknown,
  now = Date.now(),
) => {
  const parsed = z
    .object({
      response: rawCaptureSchema,
      retryAfterSeconds: z.number().nullable().optional(),
    })
    .safeParse(receipt);
  if (!parsed.success) return null;
  const receivedAt = Date.parse(parsed.data.response.receivedAt);
  if (!Number.isFinite(receivedAt) || receivedAt > now) return null;
  return (
    sessionCreationRateLimit(
      parsed.data,
      parsed.data.retryAfterSeconds ?? null,
      0,
      receivedAt,
    )?.retryAt ?? null
  );
};
