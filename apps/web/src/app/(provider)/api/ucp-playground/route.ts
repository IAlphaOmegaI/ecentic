import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from "ai";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  AGENT_PROFILE,
  buildChatSystemPrompt,
  buildMcpTools,
  buildRestTools,
  compactToolHistory,
  gatewayOptions,
  normalizePlaygroundStoreDomain,
  PLAYGROUND_MODEL,
  type PlaygroundUIMessage,
  resolveShoppingService,
} from "@/server/app/intelligence/ucp-playground";

// Gemini multi-step tool loops against a live store can take a while.
export const maxDuration = 60;

type ChatRequestBody = {
  messages: PlaygroundUIMessage[];
  storeUrl?: string;
  agentProfileUrl?: string;
};

export const POST = async (request: Request) => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
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

  const stream = createUIMessageStream<PlaygroundUIMessage>({
    // Surface real error messages to the client instead of the masked default.
    onError: (error) =>
      error instanceof Error ? error.message : "Unexpected error",
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
        system: buildChatSystemPrompt(
          service.transport,
          service.endpoint,
          domain,
        ),
        // compactToolHistory shrinks bulky tool outputs from earlier turns;
        // convertToModelMessages then rebuilds prior tool calls/results as model
        // messages, so IDs (cart, variant, checkout) carry across turns natively.
        // Data parts (data-profile/data-error) are dropped by default.
        messages: await convertToModelMessages(compactToolHistory(messages)),
        tools,
        stopWhen: stepCountIs(20),
        providerOptions: gatewayOptions(),
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
};
