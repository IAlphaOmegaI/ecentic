import { z } from "zod";
import {
  exceedsSandboxBody,
  SANDBOX_ASSISTANTS,
  SANDBOX_LIMITS,
  type SandboxSimulationInput,
  sandboxSimulation,
} from "@/lib/agent-api";
import { preflight, refused, served } from "@/server/utils/public-api";

/**
 * The sandbox is unauthenticated, so its schema is the whole perimeter. Every
 * field is bounded, unknown keys are rejected rather than stored, and the reply
 * echoes the *parsed* value — never the raw body — so the endpoint cannot be
 * used as a reflector.
 */
const item = z
  .object({
    title: z.string().min(1).max(SANDBOX_LIMITS.titleChars),
    description: z.string().max(SANDBOX_LIMITS.descriptionChars).optional(),
    priceCents: z.number().int().min(0).max(100_000_000).optional(),
  })
  .strict();

const payload = z
  .object({
    product: item,
    competitors: z.array(item).min(1).max(SANDBOX_LIMITS.competitors),
    assistants: z.array(z.enum(SANDBOX_ASSISTANTS)).min(1).optional(),
  })
  .strict();

export const POST = async (request: Request) => {
  // Checked before the body is read, so an oversized upload is refused at the
  // header rather than buffered first.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > SANDBOX_LIMITS.bodyBytes)
    return refused(
      request,
      "invalid-request",
      `Request body exceeds the sandbox limit of ${SANDBOX_LIMITS.bodyBytes} bytes.`,
      { status: 413 },
    );

  const raw = await request.text();
  // Content-Length is a claim, not a fact — and it is absent entirely on a
  // chunked upload. Measure the bytes that actually arrived.
  if (exceedsSandboxBody(raw))
    return refused(
      request,
      "invalid-request",
      `Request body exceeds the sandbox limit of ${SANDBOX_LIMITS.bodyBytes} bytes.`,
      { status: 413 },
    );

  const json = ((): unknown => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return undefined;
    }
  })();

  if (json === undefined)
    return refused(
      request,
      "invalid-request",
      "Request body is not valid JSON.",
    );

  const parsed = payload.safeParse(json);
  if (!parsed.success)
    return refused(
      request,
      "validation-failed",
      parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; "),
    );

  const input: SandboxSimulationInput = {
    product: parsed.data.product,
    competitors: parsed.data.competitors,
    assistants: parsed.data.assistants ?? SANDBOX_ASSISTANTS,
  };

  return served(request, sandboxSimulation(input));
};

export const OPTIONS = preflight;
