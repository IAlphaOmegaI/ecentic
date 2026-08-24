import { healthIndex } from "@/lib/agent-api";
import { preflight, served } from "@/server/utils/public-api";

/**
 * Reads the wall clock, so the response is never cached — `no-store` is the
 * whole configuration it needs. A `dynamic = "force-dynamic"` segment export
 * would be rejected outright under `cacheComponents`.
 */
export const GET = (request: Request) =>
  served(request, healthIndex(new Date().toISOString()), {
    cacheControl: "no-store",
  });

export const OPTIONS = preflight;
