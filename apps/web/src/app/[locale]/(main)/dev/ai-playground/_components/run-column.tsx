"use client";

import { CheckIcon, CopyIcon, LoaderIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { useState } from "react";
import { StatusPill } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { MessageResponse } from "@/components/ui/ai/message";
import { useDocument } from "@/hooks/use-document";
import {
  labelOf,
  type PlaygroundMode,
  type PlaygroundUsage,
  PROVIDERS,
  providerOf,
} from "@/lib/ai-playground";

export type RunStatus = "queued" | "streaming" | "done" | "error" | "stopped";

export type RunState = {
  status: RunStatus;
  // Captured per run, so flipping the mode tab afterwards does not re-render a
  // finished result in the wrong shape.
  mode: PlaygroundMode;
  text: string;
  reasoning: string;
  object: unknown;
  usage: PlaygroundUsage | null;
  finish: string | null;
  error: string | null;
  // Time to first token and total wall clock, both in ms, measured client-side.
  ttft: number | null;
  duration: number | null;
};

export const BLANK_RUN: RunState = {
  status: "queued",
  mode: "text",
  text: "",
  reasoning: "",
  object: null,
  usage: null,
  finish: null,
  error: null,
  ttft: null,
  duration: null,
};

const tones = {
  queued: "neutral",
  streaming: "primary",
  done: "success",
  error: "error",
  stopped: "warning",
} as const satisfies Record<
  RunStatus,
  "neutral" | "primary" | "success" | "error" | "warning"
>;

const seconds = (ms: number | null): string =>
  ms === null
    ? "—"
    : ms < 1000
      ? `${Math.round(ms)}ms`
      : `${(ms / 1000).toFixed(2)}s`;

const tokens = (value: number | undefined): string =>
  value === undefined ? "—" : value.toLocaleString();

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.05em]">
      {label}
    </span>
    <span className="font-mono text-foreground-rich text-xs tabular-nums">
      {value}
    </span>
  </div>
);

const CopyButton = ({ value }: { value: string }) => {
  const { window } = useDocument();
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  return (
    <Button
      size="icon"
      variant="ghost"
      color="accent"
      className="size-7 text-foreground-dimmed"
      onClick={() => {
        if (!window) return;
        void window.navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </Button>
  );
};

// Object mode streams raw deltas so a truncated or fenced response stays visible;
// the validated object only exists once the schema parses.
const ObjectOutput = ({ state }: { state: RunState }) => {
  const validated =
    state.object === null ? null : JSON.stringify(state.object, null, 2);

  return (
    <div className="flex flex-col gap-3">
      <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-foreground-dimmed text-xs">
        {state.text || (state.status === "streaming" ? "…" : "")}
      </pre>
      {validated && (
        <div className="border-success/30 border-l-2 pl-3">
          <p className="mb-1 font-medium text-[10px] text-success uppercase tracking-[0.05em]">
            Schema valid
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-foreground-rich text-xs">
            {validated}
          </pre>
        </div>
      )}
    </div>
  );
};

export const RunColumn = ({ id, state }: { id: string; state: RunState }) => {
  const provider = PROVIDERS[providerOf(id)];
  const copyable =
    state.mode === "object" && state.object !== null
      ? JSON.stringify(state.object, null, 2)
      : state.text;

  return (
    <div className="flex min-w-0 flex-col border border-accent-foreground bg-background">
      <div className="flex items-start justify-between gap-2 border-accent-foreground border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground-rich text-sm">
            {labelOf(id)}
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-foreground-dimmed">
            <span className={provider.accent}>{provider.label}</span>
            <span className="mx-1.5 opacity-40">/</span>
            {id}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CopyButton value={copyable} />
          <StatusPill tone={tones[state.status]}>
            {state.status === "streaming" && (
              <LoaderIcon className="size-3 animate-spin" />
            )}
            {state.status}
          </StatusPill>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 border-accent-foreground border-b bg-background-rich px-4 py-2.5">
        <Metric label="First token" value={seconds(state.ttft)} />
        <Metric label="Total" value={seconds(state.duration)} />
        <Metric label="In" value={tokens(state.usage?.input)} />
        <Metric label="Out" value={tokens(state.usage?.output)} />
      </div>

      <div className="min-w-0 flex-1 p-4">
        {state.error && (
          <div className="mb-3 border-error/30 border-l-2 bg-error/5 px-3 py-2">
            <p className="font-medium text-[10px] text-error uppercase tracking-[0.05em]">
              Error
            </p>
            <p className="mt-1 break-words font-mono text-error text-xs">
              {state.error}
            </p>
          </div>
        )}

        {state.reasoning && (
          <details className="mb-3 border-accent-foreground border-l-2 pl-3">
            <summary className="cursor-pointer font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.05em]">
              Reasoning
            </summary>
            <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] text-foreground-dimmed">
              {state.reasoning}
            </pre>
          </details>
        )}

        {state.mode === "object" ? (
          <ObjectOutput state={state} />
        ) : (
          <div
            className={cn(
              "prose-sm min-w-0 text-foreground text-sm",
              !state.text && "text-foreground-dimmed",
            )}
          >
            {state.text ? (
              <MessageResponse>{state.text}</MessageResponse>
            ) : (
              state.status === "streaming" && "Waiting for first token…"
            )}
          </div>
        )}
      </div>

      {state.finish && state.finish !== "stop" && (
        <p className="border-accent-foreground border-t px-4 py-2 font-mono text-[11px] text-warning">
          finish reason: {state.finish}
        </p>
      )}
    </div>
  );
};
