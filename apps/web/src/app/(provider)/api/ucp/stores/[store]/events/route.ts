import type { NextRequest } from "next/server";
import * as Events from "@/server/app/ucp/events";
import { Environment } from "@/server/utils/environment";
import { respond } from "@/server/utils/http";

/**
 * Order lifecycle events relayed by the store's thin plugin. The plugin sends
 * `X-ecentic-Signature: hex(hmac_sha256(bridgeSecret, "{timestamp}.{body}"))`
 * plus `X-ecentic-Timestamp`; stale timestamps are rejected to stop replays.
 * Verification and fan-out live in `server/app/ucp/events` — this reads the
 * request and nothing else.
 */

export const POST = async (
  request: NextRequest,
  routeContext: { params: Promise<{ store: string }> },
) => {
  const { store } = await routeContext.params;

  const result = await Events.record(Environment.SERVER, {
    store,
    // Raw text: the bridge signature covers the bytes as sent.
    body: await request.text(),
    signature: request.headers.get("x-ecentic-signature") ?? "",
    timestamp: request.headers.get("x-ecentic-timestamp") ?? "",
  });

  // The plugin reads `received`/`relayed` off the body, so success answers go
  // back unwrapped; errors take the shared status mapping.
  return result.success ? Response.json(result.data) : respond(result);
};
