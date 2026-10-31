/**
 * Abuse guards for the public UCP playground (`/ucp-playground`). Signed-in
 * users are unmetered; anonymous visitors get a per-minute burst limit plus a
 * hard lifetime cap on how many messages they can send, since every message
 * drives a multi-step model loop against a live store.
 */

import { createHash } from "node:crypto";
import { redis } from "@/server/utils/durable";
import { reportFailOpen } from "@/server/utils/fail-open";

/** Hard cap on messages an anonymous visitor may send, ever. */
export const ANONYMOUS_MESSAGE_LIMIT = 10;

/** Burst guard on top of the lifetime cap. */
export const ANONYMOUS_MESSAGES_PER_MINUTE = 5;

/**
 * The lifetime counter is keyed on IP, so it must expire eventually — carrier
 * NAT and office egress recycle addresses. 30 days is long enough that the cap
 * is not trivially reset, short enough that the keyspace stays bounded.
 */
const QUOTA_TTL_SECONDS = 60 * 60 * 24 * 30;

const anonymousIdentity = (headers: Headers): string => {
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";

  return createHash("md5").update(ip).digest("hex");
};

export type QuotaVerdict =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: 0 };

/**
 * Records one anonymous message against the lifetime cap and reports whether it
 * was allowed. Fails open on a redis outage — availability over strictness, as
 * with the hosted UCP limiter.
 */
export const consumeAnonymousMessage = async (
  headers: Headers,
): Promise<QuotaVerdict> => {
  const key = `ucp:playground:quota:${anonymousIdentity(headers)}`;

  try {
    const used = await redis.incr(key);
    if (used === 1) await redis.expire(key, QUOTA_TTL_SECONDS);

    if (used > ANONYMOUS_MESSAGE_LIMIT) return { allowed: false, remaining: 0 };

    return { allowed: true, remaining: ANONYMOUS_MESSAGE_LIMIT - used };
  } catch (error) {
    reportFailOpen("ucp-playground-quota", error);
    return { allowed: true, remaining: ANONYMOUS_MESSAGE_LIMIT };
  }
};
