import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  type CaptureRequest,
  isSurface,
  PROMPT_LIMIT,
} from "@/lib/llm-scraping";
import { isInternalStaff } from "@/server/database/validators";
import * as ScrapeLlm from "@/server/utils/scrapellm";

// A capture holds the connection until the surface finishes answering —
// ChatGPT with browsing routinely runs past a minute.
export const maxDuration = 300;

export const POST = async (request: Request) => {
  // The proxy matcher skips /api entirely, so this route guards itself. It
  // spends ScrapeLLM credits on arbitrary prompts, so it holds the same bar as
  // the /dev page that calls it — ecentic staff only — once deployed. Local
  // development stays open so the sandbox needs no staff account to iterate on.
  if (process.env.NODE_ENV === "production") {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!isInternalStaff(session?.user.role))
      return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as CaptureRequest;

  if (typeof body.surface !== "string" || !isSurface(body.surface))
    return new Response("Unknown surface", { status: 400 });

  const prompt = body.prompt?.trim();
  if (!prompt) return new Response("Missing prompt", { status: 400 });
  if (prompt.length > PROMPT_LIMIT)
    return new Response(`Prompt exceeds ${PROMPT_LIMIT} characters`, {
      status: 400,
    });

  const country = body.country?.trim().toUpperCase() || "US";
  if (!/^[A-Z]{2}$/.test(country))
    return new Response("Country must be an ISO 3166-1 alpha-2 code", {
      status: 400,
    });

  const capture = await ScrapeLlm.execute({
    surface: body.surface,
    prompt,
    country,
    bypassCache: body.bypassCache === true,
    runIndex: typeof body.runIndex === "number" ? body.runIndex : 0,
  });

  // Failures answer with the provider's message and a status the client can
  // read as transient (503 — worth re-running) or terminal (502).
  if (!capture.success)
    return new Response(capture.error.message, {
      status: ScrapeLlm.isRetryable(capture.error) ? 503 : 502,
    });

  return Response.json(capture.data);
};
