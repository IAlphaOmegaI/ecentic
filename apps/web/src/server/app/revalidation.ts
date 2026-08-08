import { revalidateTag } from "next/cache";
import { withCron } from "../utils/cron";

// Keep in sync with `BLOG_CACHE_TAG` in `./blog` and `./babylovegrowth`.
// Do not import from `./blog` — that module is large and pulling a constant
// from it previously created a circular graph under Turbopack.
const BLOG_CACHE_TAG = "blog";

/**
 * On-demand cache purges for content written outside the running app — blog
 * posts land via scripts or direct DB writes, which cannot reach the Next.js
 * cache themselves. Guarded by the same shared secret as the scheduled jobs,
 * and deliberately not a `"use server"` module for the same reason as
 * `cron.ts`: an RPC surface would be a second door on the purge.
 */

export const revalidateBlog = withCron(async () => {
  // `{ expire: 0 }` expires the entries outright instead of marking them
  // stale-while-revalidate, so a publish — or a takedown — is visible on the
  // very next request rather than one request later.
  revalidateTag(BLOG_CACHE_TAG, { expire: 0 });

  return { success: true as const, data: { revalidated: BLOG_CACHE_TAG } };
}, "Revalidation.revalidateBlog");
