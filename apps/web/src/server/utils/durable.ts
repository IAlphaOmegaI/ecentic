import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv({
  // The client default is 5 retries with exponential backoff, which turns a
  // redis outage into ~5s of hang PER COMMAND — request pipelines that touch
  // redis several times (rate limit, caches, sessions) stack that into
  // half-minute responses. Fail fast instead; callers that can degrade
  // gracefully already catch, and the rest surface a clean error quickly.
  retry: {
    retries: 1,
    backoff: (retryCount) => 100 * 2 ** retryCount,
  },
});
