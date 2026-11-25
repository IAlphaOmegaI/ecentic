import { resultify } from "@zenncore/utils";
import { after } from "next/server";
import { drain } from "@/server/app/integration/loop/jobs";
import {
  LoopLifecycleError,
  safeError,
} from "@/server/app/integration/loop/types";
import { acceptWebhook } from "@/server/app/integration/loop/webhooks";
export const maxDuration = 300;
export const POST = async (request: Request) => {
  const deadline = Promise.withResolvers<never>();
  const timer = setTimeout(
    () => deadline.reject(new LoopLifecycleError("retry_later")),
    8000,
  );
  const operation = async () => {
    const reader = request.body?.getReader();
    if (!reader) throw new LoopLifecycleError("invalid_payload");
    const chunks: Uint8Array[] = [];
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      chunks.push(next.value);
      if (
        chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0) > 2_000_000
      ) {
        await reader.cancel();
        throw new LoopLifecycleError("payload_too_large");
      }
    }
    return acceptWebhook({
      url: new URL(request.url),
      body: Buffer.concat(chunks),
      headers: request.headers,
    });
  };
  const result = await resultify(() =>
    Promise.race([operation(), deadline.promise]),
  );
  clearTimeout(timer);
  if (!result.success) {
    const reason = safeError(result.error);
    return Response.json(
      { error: reason },
      {
        status:
          reason === "invalid_signature"
            ? 401
            : reason === "payload_too_large"
              ? 413
              : reason === "invalid_payload"
                ? 400
                : 503,
      },
    );
  }
  after(() => drain({ store: result.data.store, limit: 5 }));
  return Response.json({ received: true });
};
