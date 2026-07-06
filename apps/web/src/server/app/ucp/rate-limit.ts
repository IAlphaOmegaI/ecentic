/**
 * Per-minute request rate limiting for hosted UCP endpoints, scoped per store
 * and client identity (agent profile URL when present, else IP). Redis
 * INCR/EXPIRE fixed window, mirroring the tracking endpoint's limiter.
 */

import { createHash } from "node:crypto";
import { redis } from "@/server/utils/durable";

const WINDOW_SECONDS = 60;
const DEFAULT_MAX_PER_MINUTE = 120;

export const clientIdentity = (headers: Headers): string => {
  const agent = headers.get("ucp-agent");
  if (agent) return `a:${agent}`;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return `ip:${forwarded.split(",")[0]?.trim()}`;
  return "ip:unknown";
};

/** Returns true when the request is over the limit and must be rejected. */
export const isRateLimited = async ({
  store,
  headers,
  maxPerMinute = DEFAULT_MAX_PER_MINUTE,
}: {
  store: string;
  headers: Headers;
  maxPerMinute?: number;
}): Promise<boolean> => {
  if (maxPerMinute <= 0) return false; // disabled

  const identity = createHash("md5")
    .update(clientIdentity(headers))
    .digest("hex");
  const key = `ucp:rl:${store}:${identity}`;

  const attempt = await (async () => {
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, WINDOW_SECONDS);
      return count > maxPerMinute;
    } catch {
      return false; // fail open — availability over strictness for reads
    }
  })();

  return attempt;
};
