import * as Sentry from "@sentry/nextjs";
import { resultify } from "@zenncore/utils";
import { after, type NextRequest, NextResponse as Response } from "next/server";
import * as Blog from "@/server/app/blog";
import { Environment } from "@/server/utils/environment";

export const POST = async (request: NextRequest) => {
  const authorization = request.headers.get("authorization");
  const auth = Blog.authorizeWebhook(authorization);
  if (!auth.success) {
    const status = auth.error.name === "unauthenticated-error" ? 401 : 500;
    return Response.json({ error: auth.error.message }, { status });
  }

  const raw = await resultify(() => request.text());
  if (!raw.success)
    return Response.json({ error: "Unable to read body" }, { status: 400 });

  const content = raw.data.trim();
  if (content.length === 0)
    return Response.json({ received: true }, { status: 200 });

  const body = resultify(() => JSON.parse(content) as unknown);
  if (!body.success)
    return Response.json({ error: "Invalid JSON" }, { status: 400 });

  const payload = Blog.parsePublishPayload(body.data);
  if (!payload.success)
    return Response.json({ error: payload.error.message }, { status: 400 });

  // BLG expects HTTP 200 within ~5s — translate on Azure after acknowledging.
  after(async () => {
    const result = await Blog.ingestPublish(Environment.SERVER, payload.data);
    if (!result.success) {
      Sentry.captureException(result.error, {
        tags: { integration: "babylovegrowth-webhook" },
        extra: { slug: payload.data.slug, id: payload.data.id },
      });
    }
  });

  return Response.json(
    { received: true, slug: payload.data.slug },
    { status: 200 },
  );
};
