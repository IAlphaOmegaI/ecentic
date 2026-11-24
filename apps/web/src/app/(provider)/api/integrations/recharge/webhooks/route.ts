import { resultify } from "@zenncore/utils";
import { after } from "next/server";
import { drain } from "@/server/app/integration/recharge/jobs";
import {
  RechargeLifecycleError,
  safeError,
} from "@/server/app/integration/recharge/types";
import { acceptWebhook } from "@/server/app/integration/recharge/webhooks";

export const maxDuration = 300;

const rawBody = async (request: Request) => {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    chunks.push(next.value);
    if (chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0) > 2_000_000) {
      await reader.cancel();
      throw new RechargeLifecycleError("payload_too_large");
    }
  }
  return Buffer.concat(chunks);
};

export const POST = async (request: Request) => {
  const deadline = Promise.withResolvers<never>();
  const timer = setTimeout(
    () => deadline.reject(new RechargeLifecycleError("retry_later")),
    4000,
  );
  const operation = async () => {
    const body = await rawBody(request);
    await acceptWebhook({
      url: new URL(request.url),
      body,
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
  // Only acknowledge after durable sanitized persistence. Cron recovers if this
  // post-response process dies; no provider call is on the acknowledgement path.
  after(() => drain({ limit: 5 }));
  return Response.json({ received: true });
};
