import * as Sentry from "@sentry/nextjs";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
} from "ai";
import { headers } from "next/headers";
import * as z from "zod";
import { auth } from "@/lib/auth";
import {
  AGENT_PROFILE,
  buildChatSystemPrompt,
  buildMcpTools,
  buildRestTools,
  isNonRetryableToolError,
  normalizePlaygroundStoreDomain,
  PLAYGROUND_MODEL,
  type PlaygroundUIMessage,
  resolveShoppingService,
} from "@/server/app/intelligence/ucp/playground";
import {
  ANONYMOUS_MESSAGE_LIMIT,
  ANONYMOUS_MESSAGES_PER_MINUTE,
  consumeAnonymousMessage,
} from "@/server/app/intelligence/ucp/playground-limit";
import { isRateLimited } from "@/server/app/ucp/rate-limit";

// Gemini multi-step tool loops against a live store can take a while.
export const maxDuration = 60;

const formatStreamError = (error: unknown): string => {
  console.log("error", error);

  if (error instanceof z.ZodError) return z.prettifyError(error);
  return error instanceof Error ? error.message : "Unexpected error";
};

type ChatRequestBody = {
  messages: PlaygroundUIMessage[];
  storeUrl?: string;
  agentProfileUrl?: string;
};

export const POST = async (request: Request) => {
  const session = await auth.api.getSession({ headers: await headers() });

  // Anonymous visitors reach this from the public /ucp-playground page. Every
  // message drives a multi-step model loop against a live store, so meter them:
  // a per-minute burst guard plus a hard lifetime cap. Signed-in users pass
  // through unmetered.
  if (!session) {
    const throttled = await isRateLimited({
      store: "playground",
      headers: request.headers,
      maxPerMinute: ANONYMOUS_MESSAGES_PER_MINUTE,
    });

    if (throttled) {
      return new Response("Too many messages — slow down and try again.", {
        status: 429,
      });
    }

    const quota = await consumeAnonymousMessage(request.headers);

    if (!quota.allowed) {
      return new Response(
        `You've used all ${ANONYMOUS_MESSAGE_LIMIT} free playground messages. Sign in to keep going.`,
        { status: 429 },
      );
    }
  }

  const {
    messages,
    storeUrl,
    agentProfileUrl = AGENT_PROFILE,
  } = (await request.json()) as ChatRequestBody;

  if (!storeUrl?.trim()) {
    return new Response("Missing storeUrl", { status: 400 });
  }

  const domain = normalizePlaygroundStoreDomain(storeUrl);
  const service = await resolveShoppingService(storeUrl);

  // Tag every Sentry event raised while handling this request (e.g. a UCP tool
  // schema mismatch reported from playground.ts) with the merchant domain so
  // failures can be traced back to the specific store. Debug-only — not shown
  // in the UI.
  Sentry.getCurrentScope().setContext("ucp_store", {
    domain,
    endpoint: service.success ? service.endpoint : undefined,
    transport: service.success ? service.transport : undefined,
  });

  const stream = createUIMessageStream<PlaygroundUIMessage>({
    onError: formatStreamError,
    execute: async ({ writer }) => {
      if (!service.success) {
        writer.write({ type: "data-error", data: { message: service.error } });
        return;
      }

      // Confirm the resolved transport/endpoint once, on the first user turn.
      const isFirstTurn =
        messages.filter((message) => message.role === "user").length <= 1;

      if (isFirstTurn) {
        writer.write({
          type: "data-profile",
          id: "profile",
          data: {
            transport: service.transport,
            endpoint: service.endpoint,
            profileUrl: service.profileUrl,
            agentProfileUrl,
          },
        });
      }

      const tools =
        service.transport === "mcp"
          ? buildMcpTools(service.endpoint, agentProfileUrl)
          : buildRestTools(service.endpoint, agentProfileUrl);

      const result = streamText({
        model: PLAYGROUND_MODEL,
        instructions: buildChatSystemPrompt(
          service.transport,
          service.endpoint,
          domain,
        ),
        // compactToolHistory shrinks bulky tool outputs from earlier turns;
        // convertToModelMessages then rebuilds prior tool calls/results as model
        // messages, so IDs (cart, variant, checkout) carry across turns natively.
        // Data parts (data-profile/data-error) are dropped by default.
        messages: await convertToModelMessages(messages),
        tools,
        // A parse/format error from the store is deterministic — re-calling the
        // same tool can never succeed. When the previous step hit one, force a
        // text-only step so the model explains the failure and the loop ends,
        // instead of burning up to the step cap re-calling the failing tool.
        prepareStep: ({ steps }) => {
          const hitNonRetryable = steps
            .at(-1)
            ?.toolResults.some((toolResult) =>
              isNonRetryableToolError(toolResult.output),
            );

          return hitNonRetryable ? { toolChoice: "none" } : {};
        },
        stopWhen: isStepCount(20),
      });

      writer.merge(result.toUIMessageStream({ onError: formatStreamError }));
    },
  });

  return createUIMessageStreamResponse({ stream });
};
