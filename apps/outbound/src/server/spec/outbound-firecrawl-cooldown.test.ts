import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { sessionCreationRateLimit } from "@/server/utils/outbound/firecrawl-cooldown";

const now = Date.parse("2026-11-25T12:00:00.000Z");
const receipt = (
  body: unknown,
  url = "https://api.firecrawl.dev/v2/interact",
  status = 429,
) => {
  const text = JSON.stringify(body);
  return {
    response: {
      url,
      status,
      receivedAt: new Date(now).toISOString(),
      body: text,
      sha256: createHash("sha256").update(text).digest("hex"),
    },
  };
};
const rejection = {
  success: false,
  error:
    "Rate limit exceeded. Consumed (req/min): 3, Remaining (req/min): 0. Retry after 1s.",
  retry_after_seconds: 1,
};

test("a definitive creation rejection retains the original receipt and respects a bounded cooldown", () => {
  const saved = receipt(rejection);
  const result = sessionCreationRateLimit(saved, null, 0, now);
  expect(result?.response).toEqual(saved.response);
  expect(result?.retryAfterSeconds).toBe(1);
  expect(result?.retryAt).toBe(new Date(now + 60_000).toISOString());
  expect(sessionCreationRateLimit(saved, 180, 1, now)?.retryAt).toBe(
    new Date(now + 180_000).toISOString(),
  );
  expect(sessionCreationRateLimit(saved, null, 2, now)?.retryAt).toBe(
    new Date(now + 240_000).toISOString(),
  );
});

test("accepted, execute, uncertain, quota and tampered responses cannot authorize another browser", () => {
  for (const input of [
    receipt({ ...rejection, success: true }),
    receipt({ ...rejection, id: "accepted-session" }),
    receipt(rejection, "https://api.firecrawl.dev/v2/interact/session/execute"),
    receipt(rejection, "https://unrelated.test/v2/interact"),
    receipt(rejection, undefined, 503),
    receipt({ ...rejection, error: "Account credits exhausted" }),
    receipt({ ...rejection, retry_after_seconds: 86400 }),
    { response: { ...receipt(rejection).response, sha256: "0".repeat(64) } },
    {
      response: {
        ...receipt(rejection).response,
        receivedAt: new Date(now + 1).toISOString(),
      },
    },
    null,
  ])
    expect(sessionCreationRateLimit(input, null, 0, now)).toBeNull();
});
