"use client";

import { useChat } from "@ai-sdk/react";
import { cn } from "@zenncore/utils";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import {
  DefaultChatTransport,
  type DynamicToolUIPart,
  getToolOrDynamicToolName,
  isToolOrDynamicToolUIPart,
  type ToolUIPart,
} from "ai";
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
import type {
  PlaygroundDataParts,
  PlaygroundUIMessage,
} from "@/server/app/intelligence/ucp-playground";
import { SectionKicker, StatusPill } from "../../_components/grid";

const starterSuggestions = [
  "Search the catalog for coffee",
  "Show me details for the first product",
  "Add the first product to a new cart",
  "Start a checkout for the cart",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

// UCP tools resolve to `{ error: "..." }` (output-available) instead of throwing,
// so a successful tool call can still represent a UCP-level failure.
const extractToolError = (output: unknown): string | undefined => {
  if (
    output !== null &&
    typeof output === "object" &&
    "error" in output &&
    typeof (output as { error: unknown }).error === "string"
  ) {
    return (output as { error: string }).error;
  }
  return undefined;
};

// ─── Part renderers ───────────────────────────────────────────────────────────

const ToolView = ({ part }: { part: ToolUIPart | DynamicToolUIPart }) => {
  const name = getToolOrDynamicToolName(part);
  const output = part.state === "output-available" ? part.output : undefined;
  const sdkError = part.state === "output-error" ? part.errorText : undefined;
  const error = sdkError ?? extractToolError(output);
  const pending =
    part.state === "input-streaming" || part.state === "input-available";
  const tone = error ? "error" : pending ? "primary" : "success";
  const label = error ? "Failed" : pending ? "Running" : "Done";

  return (
    <div className="overflow-hidden rounded-lg border border-accent-foreground bg-background-dimmed font-mono text-xs">
      <div className="flex items-center gap-2 border-accent-foreground border-b px-3 py-2">
        <span className="text-foreground-dimmed">▶</span>
        <span className="font-semibold text-foreground-rich">{name}</span>
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
            {formatJson(part.input)}
          </pre>
        </div>
        {error ? (
          <div>
            <p className="mb-1 font-medium text-[10px] text-error uppercase tracking-[0.08em]">
              Error
            </p>
            <p className="wrap-break-word text-error">{error}</p>
          </div>
        ) : output !== undefined ? (
          <div>
            <p className="mb-1 font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
              Result
            </p>
            <pre className="max-h-64 overflow-auto text-foreground/80">
              {formatJson(output)}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const ProfileView = ({ data }: { data: PlaygroundDataParts["profile"] }) => (
  <div className="rounded-lg border border-accent-foreground bg-background-dimmed p-3 font-mono text-xs">
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-medium text-foreground-rich">Profile resolved</span>
      <StatusPill tone={data.transport === "mcp" ? "primary" : "warning"}>
        {data.transport}
      </StatusPill>
      <span className="break-all text-foreground-dimmed">{data.endpoint}</span>
    </div>
    <p className="mt-1 break-all text-foreground-dimmed/70">
      Store profile: {data.profileUrl}
    </p>
    <p className="break-all text-foreground-dimmed/70">
      Agent profile: {data.agentProfileUrl}
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

const MessageParts = ({ message }: { message: PlaygroundUIMessage }) => {
  const hasVisibleContent = message.parts.some(
    (part) => part.type !== "step-start",
  );

  return (
    <>
      {message.parts.map((part, index) => {
        const key = `${message.id}-${index}`;

        if (part.type === "text") {
          return part.text ? (
            <MessageResponse key={key}>{part.text}</MessageResponse>
          ) : null;
        }
        if (part.type === "data-profile") {
          return <ProfileView data={part.data} key={key} />;
        }
        if (part.type === "data-error") {
          return <ErrorView key={key} message={part.data.message} />;
        }
        if (isToolOrDynamicToolUIPart(part)) {
          return <ToolView key={key} part={part} />;
        }
        return null;
      })}
      {message.role === "assistant" && !hasVisibleContent && <Thinking />}
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const transport = new DefaultChatTransport<PlaygroundUIMessage>({
  api: "/api/ucp-playground",
});

export const PlaygroundClient = () => {
  const [storeUrl, setStoreUrl] = useState("");
  const [text, setText] = useState("");

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    setMessages,
    clearError,
  } =
    // Throttle UI updates so streaming large tool-result JSON doesn't re-render
    // the transcript on every token.
    useChat<PlaygroundUIMessage>({
      transport,
      // experimental_throttle: 50
    });

  const isGenerating = status === "submitted" || status === "streaming";
  const hasStore = storeUrl.trim().length > 0;
  const canSend = hasStore && text.trim().length > 0;

  // Latest resolved profile (data-profile part), shown in the section header.
  const profile = (() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (part.type === "data-profile") return part.data;
      }
    }
    return null;
  })();

  const hostOf = (value: string): string => {
    try {
      return new URL(value.startsWith("http") ? value : `https://${value}`).host;
    } catch {
      return value;
    }
  };

  const connectedHost = profile ? hostOf(profile.profileUrl) : null;
  const typedHost = hasStore ? hostOf(storeUrl.trim()) : null;

  const handleStoreUrlChange = useCallback(
    (value: string) => {
      setStoreUrl(value);
      // Changing the target store starts a fresh session.
      setMessages([]);
      clearError();
    },
    [setMessages, clearError],
  );

  const submit = useCallback(
    (raw: string) => {
      const value = raw.trim();
      if (!value || !storeUrl.trim() || isGenerating) return;
      sendMessage({ text: value }, { body: { storeUrl: storeUrl.trim() } });
      setText("");
    },
    [sendMessage, storeUrl, isGenerating],
  );

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => submit(message.text ?? ""),
    [submit],
  );

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    [],
  );

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex min-h-40 flex-1 flex-col divide-y divide-accent-foreground">
      {/* Connected store + transport */}
      <div className="flex shrink-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionKicker>
          {profile ? (
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 normal-case">
              <span className="font-mono font-semibold text-primary">
                {connectedHost}
              </span>
              <StatusPill
                tone={profile.transport === "mcp" ? "primary" : "warning"}
              >
                {profile.transport}
              </StatusPill>
              <span className="min-w-0 truncate font-mono text-[11px] text-foreground-dimmed lowercase">
                {profile.endpoint}
              </span>
            </span>
          ) : (
            (typedHost ?? "store.com")
          )}
        </SectionKicker>
        <TextField
          className="h-9 w-full border border-accent-foreground bg-background-dimmed sm:w-80"
          onValueChange={handleStoreUrlChange}
          value={storeUrl}
        >
          <TextFieldInput
            className="px-3 font-mono text-sm"
            placeholder="store.example.com"
          />
        </TextField>
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
        {error && (
          <ErrorView message={error.message || "Something went wrong"} />
        )}
        {isEmpty && (
          <Suggestions>
            {starterSuggestions.map((suggestion) => (
              <Suggestion
                disabled={!hasStore}
                key={suggestion}
                onClick={submit}
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
              disabled={!hasStore || isGenerating}
              onChange={handleTextChange}
              placeholder={
                hasStore
                  ? "Ask the agent to run a UCP action…"
                  : "Enter a store URL above first…"
              }
              value={text}
            />
            <PromptInputSubmit
              disabled={isGenerating ? false : !canSend}
              onStop={stop}
              status={status}
            />
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
};
