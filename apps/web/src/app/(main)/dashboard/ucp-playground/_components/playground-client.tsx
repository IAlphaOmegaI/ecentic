"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import { cn } from "@zenncore/utils";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useCallback, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ui/ai/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ui/ai/message";
import type { PromptInputMessage } from "@/components/ui/ai/prompt-input";
import {
  PromptInput,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ui/ai/prompt-input";
import { Suggestion, Suggestions } from "@/components/ui/ai/suggestion";
import {
  chatPlayground,
  type PlaygroundChatMessage,
  type PlaygroundEvent,
} from "@/server/app/intelligence/ucp-playground";
import { StatusPill } from "../../_components/grid";

// ─── Types ───────────────────────────────────────────────────────────────────

type ToolState = "running" | "done" | "error";

type MessagePart =
  | { type: "text"; text: string }
  | { type: "error"; message: string }
  | {
      type: "tool";
      id: string;
      tool: string;
      args: unknown;
      result?: unknown;
      error?: string;
      state: ToolState;
    }
  | {
      type: "profile";
      transport: "mcp" | "rest";
      endpoint: string;
      profileUrl: string;
      agentProfileUrl: string;
    };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
};

type ChatStatus = "submitted" | "streaming" | "ready" | "error";

type Connection = { transport: "mcp" | "rest"; endpoint: string };

const starterSuggestions = [
  "Search the catalog for coffee",
  "Show me details for the first product",
  "Add the first product to a new cart",
  "Start a checkout for the cart",
];

// ─── Event reducer ────────────────────────────────────────────────────────────

const formatJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

// UCP tools resolve to `{ error: "..." }` instead of throwing on failure.
const extractToolError = (result: unknown): string | undefined => {
  if (
    result !== null &&
    typeof result === "object" &&
    "error" in result &&
    typeof (result as { error: unknown }).error === "string"
  ) {
    return (result as { error: string }).error;
  }
  return undefined;
};

const applyEvent = (
  parts: MessagePart[],
  event: PlaygroundEvent,
): MessagePart[] => {
  switch (event.kind) {
    case "profile":
      return [
        {
          type: "profile",
          transport: event.transport,
          endpoint: event.endpoint,
          profileUrl: event.profileUrl,
          agentProfileUrl: event.agentProfileUrl,
        },
        ...parts,
      ];
    case "text": {
      const last = parts.at(-1);
      if (last?.type === "text") {
        return [
          ...parts.slice(0, -1),
          { type: "text", text: last.text + event.text },
        ];
      }
      return [...parts, { type: "text", text: event.text }];
    }
    case "tool_call":
      return [
        ...parts,
        {
          type: "tool",
          id: event.id,
          tool: event.tool,
          args: event.args,
          state: "running",
        },
      ];
    case "tool_result": {
      const error = extractToolError(event.result);
      return parts.map((part) =>
        part.type === "tool" && part.id === event.id
          ? {
              ...part,
              result: event.result,
              error,
              state: error ? "error" : "done",
            }
          : part,
      );
    }
    case "error":
      return [...parts, { type: "error", message: event.message }];
    default:
      return parts;
  }
};

// Flatten a message into the `{ role, content }` shape the agent receives as
// history. Tool I/O is serialized into the assistant text so IDs (cart, variant,
// checkout) survive across turns even though the server itself stays stateless.
const serializeMessage = (message: ChatMessage): PlaygroundChatMessage => {
  if (message.role === "user") {
    return {
      role: "user",
      content: message.parts
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("\n")
        .trim(),
    };
  }

  const content = message.parts
    .map((part) => {
      switch (part.type) {
        case "text":
          return part.text;
        case "tool": {
          const outcome = part.error
            ? `error: ${part.error}`
            : `result: ${formatJson(part.result)}`;
          return `[tool ${part.tool} called with ${formatJson(part.args)} → ${outcome}]`;
        }
        case "error":
          return `[error: ${part.message}]`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return { role: "assistant", content };
};

// ─── Part renderers ───────────────────────────────────────────────────────────

const ToolView = ({
  part,
}: {
  part: Extract<MessagePart, { type: "tool" }>;
}) => {
  const tone =
    part.state === "error"
      ? "error"
      : part.state === "running"
        ? "primary"
        : "success";
  const label =
    part.state === "error"
      ? "Failed"
      : part.state === "running"
        ? "Running"
        : "Done";

  return (
    <div className="overflow-hidden rounded-lg border border-accent-foreground bg-background-dimmed font-mono text-xs">
      <div className="flex items-center gap-2 border-accent-foreground border-b px-3 py-2">
        <span className="text-foreground-dimmed">▶</span>
        <span className="font-semibold text-foreground-rich">{part.tool}</span>
        <StatusPill className="ml-auto" tone={tone}>
          {label}
        </StatusPill>
      </div>
      <div className="space-y-3 p-3">
        <div>
          <p className="mb-1 font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            Arguments
          </p>
          <pre className="overflow-x-auto text-foreground/80">
            {formatJson(part.args)}
          </pre>
        </div>
        {part.error ? (
          <div>
            <p className="mb-1 font-medium text-[10px] text-error uppercase tracking-[0.08em]">
              Error
            </p>
            <p className="wrap-break-word text-error">{part.error}</p>
          </div>
        ) : part.result !== undefined ? (
          <div>
            <p className="mb-1 font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
              Result
            </p>
            <pre className="max-h-64 overflow-auto text-foreground/80">
              {formatJson(part.result)}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const ProfileView = ({
  part,
}: {
  part: Extract<MessagePart, { type: "profile" }>;
}) => (
  <div className="rounded-lg border border-accent-foreground bg-background-dimmed p-3 font-mono text-xs">
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-medium text-foreground-rich">Profile resolved</span>
      <StatusPill tone={part.transport === "mcp" ? "primary" : "warning"}>
        {part.transport}
      </StatusPill>
      <span className="break-all text-foreground-dimmed">{part.endpoint}</span>
    </div>
    <p className="mt-1 break-all text-foreground-dimmed/70">
      Store profile: {part.profileUrl}
    </p>
    <p className="break-all text-foreground-dimmed/70">
      Agent profile: {part.agentProfileUrl}
    </p>
  </div>
);

const ErrorView = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/5 p-3 text-error text-xs">
    <span className="shrink-0">✕</span>
    <span className="font-mono">{message}</span>
  </div>
);

const Thinking = () => (
  <div className="flex items-center gap-1.5 py-1.5">
    <span className="size-1.5 animate-bounce rounded-full bg-foreground-dimmed [animation-delay:-0.2s]" />
    <span className="size-1.5 animate-bounce rounded-full bg-foreground-dimmed [animation-delay:-0.1s]" />
    <span className="size-1.5 animate-bounce rounded-full bg-foreground-dimmed" />
  </div>
);

const MessageParts = ({ message }: { message: ChatMessage }) => (
  <>
    {message.parts.map((part, index) => {
      const key = `${message.id}-${index}`;
      switch (part.type) {
        case "text":
          return part.text ? (
            <MessageResponse key={key}>{part.text}</MessageResponse>
          ) : null;
        case "tool":
          return <ToolView key={key} part={part} />;
        case "profile":
          return <ProfileView key={key} part={part} />;
        case "error":
          return <ErrorView key={key} message={part.message} />;
        default:
          return null;
      }
    })}
    {message.role === "assistant" && message.parts.length === 0 && <Thinking />}
  </>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const PlaygroundClient = () => {
  const [storeUrl, setStoreUrl] = useState("");
  const [connection, setConnection] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<ChatStatus>("ready");

  const isBusy = status === "submitted" || status === "streaming";
  const hasStore = storeUrl.trim().length > 0;
  const canSend = hasStore && text.trim().length > 0 && !isBusy;

  const handleStoreUrlChange = useCallback((value: string) => {
    setStoreUrl(value);
    setConnection(null);
  }, []);

  const send = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim();

      if (!trimmed || !storeUrl.trim() || isBusy) return;

      const stamp = `${Date.now()}`;
      const userMessage: ChatMessage = {
        id: `user-${stamp}`,
        role: "user",
        parts: [{ type: "text", text: trimmed }],
      };
      const assistantId = `assistant-${stamp}`;
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        parts: [],
      };

      // History includes the new user turn but not the empty placeholder we
      // stream the reply into; drop any message that flattens to nothing.
      const history = [...messages, userMessage]
        .map(serializeMessage)
        .filter((message) => message.content.length > 0);

      setMessages((previous) => [...previous, userMessage, assistantMessage]);
      setText("");
      setStatus("submitted");

      const updateAssistant = (
        updater: (parts: MessagePart[]) => MessagePart[],
      ) =>
        setMessages((previous) =>
          previous.map((message) =>
            message.id === assistantId
              ? { ...message, parts: updater(message.parts) }
              : message,
          ),
        );

      try {
        const { stream } = await chatPlayground({
          storeUrl: storeUrl.trim(),
          messages: history,
        });

        setStatus("streaming");

        for await (const event of readStreamableValue(stream)) {
          if (!event) continue;

          if (event.kind === "profile") {
            setConnection({
              transport: event.transport,
              endpoint: event.endpoint,
            });
          }
          if (event.kind === "error") setStatus("error");

          updateAssistant((parts) => applyEvent(parts, event));
        }

        setStatus((current) => (current === "error" ? "error" : "ready"));
      } catch (error) {
        updateAssistant((parts) => [
          ...parts,
          {
            type: "error",
            message: error instanceof Error ? error.message : "Request failed",
          },
        ]);
        setStatus("error");
      }
    },
    [messages, storeUrl, isBusy],
  );

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      send(message.text ?? "");
    },
    [send],
  );

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    [],
  );

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex size-full max-h-[560px] min-h-40 flex-col divide-y divide-accent-foreground">
      {/* Store endpoint */}
      <div className="flex shrink-0 flex-col gap-2 p-4 sm:flex-row sm:items-center">
        <TextField
          className="h-9 flex-1 border border-accent-foreground bg-background-dimmed"
          onValueChange={handleStoreUrlChange}
          value={storeUrl}
        >
          <TextFieldInput
            className="px-3 font-mono text-sm"
            placeholder="https://store.example.com"
          />
        </TextField>
        {connection ? (
          <StatusPill
            tone={connection.transport === "mcp" ? "primary" : "warning"}
          >
            Connected · {connection.transport}
          </StatusPill>
        ) : (
          <span className="shrink-0 text-foreground-dimmed text-xs">
            Enter a UCP store URL to begin
          </span>
        )}
      </div>

      {/* Conversation */}
      <Conversation className="min-h-0">
        <ConversationContent>
          {isEmpty ? (
            <ConversationEmptyState
              description="Connect a store above, then ask the agent to search the catalog, inspect a product, build a cart, or run checkout — one step at a time."
              title="Start a UCP session"
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  <MessageParts message={message} />
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <div className="shrink-0 space-y-3 p-4">
        {isEmpty && (
          <Suggestions>
            {starterSuggestions.map((suggestion) => (
              <Suggestion
                disabled={!hasStore}
                key={suggestion}
                onClick={send}
                suggestion={suggestion}
              />
            ))}
          </Suggestions>
        )}
        <PromptInput
          className={cn("flex flex-row", !hasStore && "opacity-60")}
          onSubmit={handleSubmit}
        >
          <PromptInputBody className="flex items-center px-4 py-2">
            <PromptInputTextarea
              className="flex-1 p-0"
              disabled={!hasStore || isBusy}
              onChange={handleTextChange}
              placeholder={
                hasStore
                  ? "Ask the agent to run a UCP action…"
                  : "Enter a store URL above first…"
              }
              value={text}
            />
            <PromptInputSubmit disabled={!canSend} status={status} />
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
};
