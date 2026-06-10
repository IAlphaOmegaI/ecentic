"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { runPlayground } from "@/server/app/intelligence/ucp-playground";
import { StatusPill } from "../../_components/grid";

// ─── Types ───────────────────────────────────────────────────────────────────

type LogLine =
  | {
      kind: "profile";
      transport: string;
      endpoint: string;
      profileUrl: string;
      agentProfileUrl: string;
    }
  | { kind: "text"; text: string }
  | { kind: "tool_call"; id: string; tool: string; args: unknown }
  | { kind: "tool_result"; id: string; tool: string; result: unknown }
  | { kind: "error"; message: string }
  | { kind: "done" };

// ─── JSON collapse util ───────────────────────────────────────────────────────

const summarise = (value: unknown, maxLen = 160): string => {
  if (value === null || value === undefined) return "null";
  const raw = JSON.stringify(value);
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen)}…`;
};

// ─── Log line renderers ───────────────────────────────────────────────────────

const ProfileLine = ({
  line,
}: {
  line: Extract<LogLine, { kind: "profile" }>;
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="font-medium text-primary">Profile resolved</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 font-semibold text-[11px] uppercase tracking-[0.05em]",
          line.transport === "mcp"
            ? "bg-primary/10 text-primary"
            : "bg-warning/10 text-warning",
        )}
      >
        {line.transport}
      </span>
      <span className="font-mono text-foreground-dimmed/70 text-xs">
        {line.endpoint}
      </span>
    </div>
    <div className="font-mono text-foreground-dimmed/60 text-xs">
      Agent profile: {line.agentProfileUrl}
    </div>
    <span className="font-mono text-foreground-dimmed/60 text-xs">
      Store profile: {line.profileUrl}
    </span>
  </div>
);

const ToolCallLine = ({
  line,
}: {
  line: Extract<LogLine, { kind: "tool_call" }>;
}) => (
  <div className="flex flex-col gap-0.5">
    <div className="flex items-center gap-2">
      <span className="text-foreground-dimmed/50">▶</span>
      <span className="font-mono font-semibold text-sm text-warning">
        {line.tool}
      </span>
      <span className="font-mono text-foreground-dimmed/60 text-xs">
        {summarise(line.args)}
      </span>
    </div>
  </div>
);

const ToolResultLine = ({
  line,
}: {
  line: Extract<LogLine, { kind: "tool_result" }>;
}) => (
  <div className="ml-4 flex items-start gap-2 border-foreground-dimmed/10 border-l-2 pl-3">
    <span className="mt-0.5 shrink-0 text-foreground-dimmed/40">└</span>
    <span className="font-mono text-foreground-dimmed/70 text-xs leading-relaxed">
      {summarise(line.result)}
    </span>
  </div>
);

const TextSegment = ({ text }: { text: string }) => (
  <span className="font-mono text-foreground/80 text-xs">{text}</span>
);

const ErrorLine = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 text-error">
    <span className="shrink-0">✕</span>
    <span className="font-mono text-xs">{message}</span>
  </div>
);

const DoneLine = () => (
  <div className="flex items-center gap-2 border-accent-foreground/30 border-t pt-2 text-success">
    <span>✓</span>
    <span className="font-mono text-xs">Run complete</span>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const PlaygroundClient = () => {
  const [storeUrl, setStoreUrl] = useState("");
  const [query, setQuery] = useState("");

  const [lines, setLines] = useState<LogLine[]>([]);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const logRef = useRef<HTMLDivElement>(null);

  // auto-scroll
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  });

  const flushText = (
    buffer: string,
    setter: Dispatch<SetStateAction<LogLine[]>>,
  ) => {
    if (!buffer) return;
    setter((prev) => {
      const last = prev[prev.length - 1];
      if (last?.kind === "text") {
        return [
          ...prev.slice(0, -1),
          { kind: "text", text: last.text + buffer } as LogLine,
        ];
      }
      return [...prev, { kind: "text", text: buffer } as LogLine];
    });
  };

  const [handleRun, isRunning] = useAsyncAction(async () => {
    if (!storeUrl.trim()) return;

    setLines([]);
    setPhase("running");

    const { stream } = await runPlayground({
      storeUrl: storeUrl.trim(),
      query: query.trim() || undefined,
      agentProfileUrl: "https://ecentic.ai/ucp/agent-profile",
    });

    let localBuffer = "";

    for await (const event of readStreamableValue(stream)) {
      if (!event) continue;

      switch (event.kind) {
        case "text": {
          localBuffer += event.text;
          // flush on sentence boundaries to reduce re-renders
          if (/[.\n]/.test(event.text)) {
            const captured = localBuffer;
            localBuffer = "";
            setLines((prev) => {
              const last = prev[prev.length - 1];
              if (last?.kind === "text") {
                return [
                  ...prev.slice(0, -1),
                  { kind: "text", text: last.text + captured } as LogLine,
                ];
              }
              return [...prev, { kind: "text", text: captured } as LogLine];
            });
          }
          break;
        }
        case "tool_call":
        case "tool_result":
        case "profile": {
          // flush any pending text first
          if (localBuffer) {
            const captured = localBuffer;
            localBuffer = "";
            setLines((prev) => {
              const last = prev[prev.length - 1];
              if (last?.kind === "text") {
                return [
                  ...prev.slice(0, -1),
                  { kind: "text", text: last.text + captured } as LogLine,
                ];
              }
              return [...prev, { kind: "text", text: captured } as LogLine];
            });
          }
          setLines((prev) => [...prev, event as LogLine]);
          break;
        }
        case "error": {
          if (localBuffer) {
            const captured = localBuffer;
            localBuffer = "";
            flushText(captured, setLines);
          }
          setLines((prev) => [...prev, event as LogLine]);
          setPhase("error");
          break;
        }
        case "done": {
          if (localBuffer) {
            const captured = localBuffer;
            localBuffer = "";
            setLines((prev) => {
              const last = prev[prev.length - 1];
              if (last?.kind === "text") {
                return [
                  ...prev.slice(0, -1),
                  { kind: "text", text: last.text + captured } as LogLine,
                ];
              }
              return [...prev, { kind: "text", text: captured } as LogLine];
            });
          }
          setLines((prev) => [...prev, { kind: "done" } as LogLine]);
          setPhase("done");
          break;
        }
      }
    }

    // flush any remaining buffer
    if (localBuffer) {
      flushText(localBuffer, setLines);
    }
  });

  const isEmpty = lines.length === 0 && phase === "idle";

  return (
    <div className="space-y-4">
      {/* Input panel */}
      <div className="rounded-lg border border-accent-foreground bg-background-rich">
        <div className="border-accent-foreground border-b px-4 py-2.5">
          <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            Store endpoint
          </p>
          <p className="mt-1 text-foreground-dimmed text-xs">
            Enter the base URL of a UCP-compliant store. A{" "}
            <span className="font-mono">/.well-known/ucp</span> profile will be
            resolved automatically to detect MCP or REST transport.
          </p>
        </div>
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
          <TextField
            value={storeUrl}
            onValueChange={setStoreUrl}
            className="h-8 flex-1 border border-accent-foreground bg-background-dimmed"
          >
            <TextFieldInput
              placeholder="https://store.example.com"
              className="px-3 font-mono text-sm"
            />
          </TextField>
          <TextField
            value={query}
            onValueChange={setQuery}
            className="h-8 w-full border border-accent-foreground bg-background-dimmed sm:w-48"
          >
            <TextFieldInput
              placeholder='Search query (e.g. "coffee")'
              className="px-3 text-sm"
            />
          </TextField>
          <Button
            color="primary"
            onClick={handleRun}
            disabled={isRunning || !storeUrl.trim()}
            className="shrink-0 px-5 py-1.5 text-sm"
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <span className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Running…
              </span>
            ) : (
              "Run"
            )}
          </Button>
        </div>
        <div className="border-accent-foreground border-t px-4 py-3">
          <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            Agent profile fixture
          </p>
          <p className="mt-1 text-foreground-dimmed text-xs">
            Used as <span className="font-mono">meta.ucp-agent.profile</span> in
            tool calls to test negotiation outcomes.
          </p>
        </div>
      </div>

      {/* Terminal output */}
      <div className="rounded-lg border border-accent-foreground bg-background-rich">
        <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-2.5">
          <div className="flex items-center gap-2">
            <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
              Output
            </p>
            {phase === "running" && (
              <StatusPill tone="primary">Live</StatusPill>
            )}
            {phase === "done" && <StatusPill tone="success">Done</StatusPill>}
            {phase === "error" && <StatusPill tone="error">Error</StatusPill>}
          </div>
          {!isEmpty && (
            <button
              type="button"
              onClick={() => {
                setLines([]);
                setPhase("idle");
              }}
              className="font-medium text-foreground-dimmed text-xs hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        <div
          ref={logRef}
          className="m-4 max-h-[520px] min-h-40 overflow-y-auto rounded-md bg-background-dimmed p-4 font-mono text-xs"
        >
          {isEmpty ? (
            <p className="font-light text-foreground-dimmed/50 text-xs">
              Enter a store URL above and press{" "}
              <span className="font-medium text-foreground-dimmed">Run</span> to
              start the UCP flow test.
            </p>
          ) : (
            <div className="space-y-2">
              {lines.map((line, index) => {
                const key = index;
                switch (line.kind) {
                  case "profile":
                    return <ProfileLine key={key} line={line} />;
                  case "tool_call":
                    return <ToolCallLine key={key} line={line} />;
                  case "tool_result":
                    return <ToolResultLine key={key} line={line} />;
                  case "text":
                    return <TextSegment key={key} text={line.text} />;
                  case "error":
                    return <ErrorLine key={key} message={line.message} />;
                  case "done":
                    return <DoneLine key={key} />;
                  default:
                    return null;
                }
              })}
              {isRunning && phase !== "done" && phase !== "error" && (
                <span className="inline-block h-3 w-1.5 animate-pulse bg-primary/60" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cart result */}
      <CartResult lines={lines} />
    </div>
  );
};

// ─── Cart result panel ────────────────────────────────────────────────────────

const CartResult = ({ lines }: { lines: LogLine[] }) => {
  const cartResult = [...lines]
    .reverse()
    .find(
      (l): l is Extract<LogLine, { kind: "tool_result" }> =>
        l.kind === "tool_result" && l.tool === "get_cart",
    );

  if (!cartResult) return null;

  const raw = cartResult.result;
  const json = JSON.stringify(raw, null, 2);

  return (
    <div className="rounded-lg border border-accent-foreground bg-background-rich">
      <div className="border-accent-foreground border-b px-4 py-2.5">
        <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
          Cart state
        </p>
        <p className="mt-1 text-foreground-dimmed text-xs">
          Last <span className="font-mono">get_cart</span> response
        </p>
      </div>
      <pre className="m-4 max-h-72 overflow-auto rounded-md bg-background-dimmed p-4 font-mono text-foreground/80 text-xs leading-relaxed">
        {json}
      </pre>
    </div>
  );
};
