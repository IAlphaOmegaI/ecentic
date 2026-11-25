import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  shoppingMinuteRateLimit,
  shoppingPollUrl,
  shoppingQueryUrl,
} from "@/server/utils/outbound/scrapellm-cooldown";
import { preparedQuerySchema } from "@/server/utils/outbound/live-shopping-contract";

const now = Date.parse("2026-11-25T12:00:00.000Z");
const query = preparedQuerySchema.parse({
  surface: "google_ai_mode",
  product: { name: "Trail tote", url: "https://merchant.test/products/tote" },
  country: "US",
  category: "totes",
  prompt: "Where can I buy the Trail tote and what does it cost?",
});
const url = shoppingQueryUrl(query);
const rejection = { error: "Rate limit exceeded: max 5 request(s) per minute" };
const receipt = (body: unknown, sourceUrl = url, status = 429) => {
  const text = JSON.stringify(body);
  return {
    response: {
      url: sourceUrl,
      status,
      receivedAt: new Date(now).toISOString(),
      body: text,
      sha256: createHash("sha256").update(text).digest("hex"),
    },
  };
};

test("only the exact minute rejection permits a cooldown of at least sixty seconds", () => {
  const saved = receipt(rejection);
  const result = shoppingMinuteRateLimit(saved, url, null, now);
  expect(result?.response).toEqual(saved.response);
  expect(result?.retryAt).toBe(new Date(now + 60_000).toISOString());
  expect(
    shoppingMinuteRateLimit({ ...saved, retryAfterSeconds: 180 }, url, 30, now)
      ?.retryAt,
  ).toBe(new Date(now + 180_000).toISOString());
  expect(shoppingMinuteRateLimit(saved, url, 240, now)?.retryAt).toBe(
    new Date(now + 240_000).toISOString(),
  );
  const pollUrl = shoppingPollUrl({
    id: "ce1da6e5-1249-4bd4-8463-1937688c63d3",
    query,
    submittedAt: new Date(now).toISOString(),
  });
  expect(
    shoppingMinuteRateLimit(receipt(rejection, pollUrl), pollUrl, null, now),
  ).not.toBeNull();
  expect(
    shoppingMinuteRateLimit(receipt(rejection, pollUrl), url, null, now),
  ).toBeNull();
});

test("unknown quotas, accepted jobs, wrong queries, future and modified captures never authorize a query replay", () => {
  for (const input of [
    receipt({ error: "Rate limit exceeded" }),
    receipt({ error: "Daily limit reached" }),
    receipt({ error: "Insufficient credits" }),
    receipt({ ...rejection, job_id: "ce1da6e5-1249-4bd4-8463-1937688c63d3" }),
    receipt(
      rejection,
      shoppingQueryUrl({ ...query, prompt: "Another product entirely?" }),
    ),
    receipt(rejection, "https://unrelated.test/jobs"),
    receipt(rejection, url, 202),
    receipt(rejection, url, 402),
    receipt(rejection, url, 503),
    { ...receipt(rejection), retryAfterSeconds: 86400 },
    { response: { ...receipt(rejection).response, sha256: "0".repeat(64) } },
    {
      response: {
        ...receipt(rejection).response,
        receivedAt: new Date(now + 1).toISOString(),
      },
    },
    null,
  ])
    expect(shoppingMinuteRateLimit(input, url, null, now)).toBeNull();
  expect(
    shoppingMinuteRateLimit(receipt(rejection), url, 86400, now),
  ).toBeNull();
});
