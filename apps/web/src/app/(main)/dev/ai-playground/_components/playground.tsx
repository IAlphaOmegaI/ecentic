"use client";

import { LoaderIcon, PlusIcon, XIcon } from "@zenncore/icons";
import { cn, resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@zenncore/web/components/number-field";
import { Slider } from "@zenncore/web/components/slider";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
} from "@zenncore/web/components/tabs";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import { useEffect, useRef, useState } from "react";
import { SectionKicker } from "@/app/(main)/dashboard/_components/grid";
import { useDocument } from "@/hooks/use-document";
import {
  DEFAULT_INSTRUCTIONS,
  DEFAULT_PROMPT,
  DEFAULT_SCHEMA,
  ENDPOINT,
  MODELS,
  type PlaygroundMode,
  type PlaygroundRun,
  PROVIDERS,
  providerOf,
  readEvents,
} from "@/lib/ai-playground";
import { BLANK_RUN, RunColumn, type RunState } from "./run-column";

const STORAGE_KEY = "ecentic:ai-playground";

// Streamdown re-parses the whole markdown string on every render, so pushing each
// token into state across four live columns is O(n²). Buffer deltas and flush at
// most this often.
const FLUSH_MS = 90;

type Config = {
  mode: PlaygroundMode;
  instructions: string;
  prompt: string;
  schema: string;
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  models: string[];
  // Ids typed into the custom box — any deployment or provider/model string the
  // resolver in server/utils/ai can route.
  custom: string[];
};

const DEFAULT_CONFIG: Config = {
  mode: "text",
  instructions: DEFAULT_INSTRUCTIONS,
  prompt: DEFAULT_PROMPT,
  schema: DEFAULT_SCHEMA,
  temperature: 0.7,
  topP: 1,
  maxOutputTokens: 1024,
  models: ["gpt", "claude-sonnet-4.6"],
  custom: [],
};

const grid = (count: number): string => {
  switch (true) {
    case count <= 1:
      return "grid-cols-1";
    case count === 2:
      return "grid-cols-1 lg:grid-cols-2";
    case count === 3:
      return "grid-cols-1 lg:grid-cols-3";
    default:
      return "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4";
  }
};

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-medium text-[11px] text-foreground-dimmed uppercase tracking-[0.05em]">
        {label}
      </span>
      {hint && (
        <span className="font-mono text-[11px] text-foreground-dimmed">
          {hint}
        </span>
      )}
    </div>
    {children}
  </div>
);

const ModelChip = ({
  id,
  label,
  selected,
  onToggle,
  onRemove,
}: {
  id: string;
  label: string;
  selected: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 border transition-colors",
      selected
        ? "border-primary bg-primary/10 text-primary"
        : "border-accent-foreground bg-background text-foreground-dimmed hover:border-foreground-dimmed",
    )}
  >
    <button
      type="button"
      onClick={onToggle}
      className="cursor-pointer px-2.5 py-1 font-mono text-xs"
      title={id}
    >
      {label}
    </button>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="cursor-pointer pr-1.5 opacity-60 hover:opacity-100"
        aria-label={`Remove ${id}`}
      >
        <XIcon className="size-3" />
      </button>
    )}
  </span>
);

export const Playground = () => {
  const { window } = useDocument();
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [runs, setRuns] = useState<Record<string, RunState>>({});
  const [custom, setCustom] = useState("");
  const controller = useRef<AbortController | null>(null);

  const isRunning = Object.values(runs).some(
    (run) => run.status === "queued" || run.status === "streaming",
  );

  useEffect(() => {
    if (!window) return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const parsed = resultify(() => JSON.parse(stored) as Partial<Config>);
    if (parsed.success)
      setConfig((previous) => ({ ...previous, ...parsed.data }));
  }, [window]);

  useEffect(() => {
    if (!window) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [window, config]);

  const update = (changes: Partial<Config>) =>
    setConfig((previous) => ({ ...previous, ...changes }));

  const patch = (id: string, changes: Partial<RunState>) =>
    setRuns((previous) => {
      const current = previous[id];
      return current
        ? { ...previous, [id]: { ...current, ...changes } }
        : previous;
    });

  const toggle = (id: string) =>
    update({
      models: config.models.includes(id)
        ? config.models.filter((model) => model !== id)
        : [...config.models, id],
    });

  const add = () => {
    const id = custom.trim();
    if (!id || config.custom.includes(id) || MODELS.some((m) => m.id === id))
      return;

    update({ custom: [...config.custom, id], models: [...config.models, id] });
    setCustom("");
  };

  const remove = (id: string) =>
    update({
      custom: config.custom.filter((model) => model !== id),
      models: config.models.filter((model) => model !== id),
    });

  const execute = async (id: string, signal: AbortSignal) => {
    const started = performance.now();
    const buffer = {
      text: "",
      reasoning: "",
      first: 0,
      flushed: 0,
      failed: false,
    };

    const flush = (force: boolean) => {
      const now = performance.now();
      if (!force && now - buffer.flushed < FLUSH_MS) return;

      buffer.flushed = now;
      patch(id, {
        status: "streaming",
        text: buffer.text,
        reasoning: buffer.reasoning,
        ttft: buffer.first ? buffer.first - started : null,
        duration: now - started,
      });
    };

    const body: PlaygroundRun = {
      model: id,
      mode: config.mode,
      prompt: config.prompt,
      instructions: config.instructions,
      schema: config.mode === "object" ? config.schema : undefined,
      temperature: config.temperature,
      topP: config.topP,
      maxOutputTokens: config.maxOutputTokens,
    };

    const response = await resultify(() =>
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      }),
    );

    if (!response.success) {
      patch(id, {
        status: signal.aborted ? "stopped" : "error",
        error: signal.aborted ? null : describe(response.error),
        duration: performance.now() - started,
      });
      return;
    }

    if (!response.data.ok) {
      const detail = await resultify(() => response.data.text());
      patch(id, {
        status: "error",
        error:
          detail.success && detail.data
            ? detail.data
            : `HTTP ${response.data.status}`,
        duration: performance.now() - started,
      });
      return;
    }

    const consumed = await resultify(async () => {
      for await (const event of readEvents(response.data)) {
        switch (event.kind) {
          case "text":
            buffer.text += event.delta;
            buffer.first ||= performance.now();
            flush(false);
            break;
          case "reasoning":
            buffer.reasoning += event.delta;
            buffer.first ||= performance.now();
            flush(false);
            break;
          case "object":
            patch(id, { object: event.value });
            break;
          case "usage":
            patch(id, { usage: event.usage });
            break;
          case "finish":
            patch(id, { finish: event.reason });
            break;
          case "error":
            buffer.failed = true;
            patch(id, { error: event.message });
            break;
        }
      }
    });

    flush(true);

    patch(id, {
      status: (() => {
        switch (true) {
          case signal.aborted:
            return "stopped";
          case buffer.failed || !consumed.success:
            return "error";
          default:
            return "done";
        }
      })(),
      duration: performance.now() - started,
      // Spread only on failure — a plain `error: undefined` would wipe the
      // message an earlier error event already put on the column.
      ...(consumed.success ? {} : { error: describe(consumed.error) }),
    });
  };

  const start = async () => {
    if (isRunning || !config.prompt.trim() || config.models.length === 0)
      return;

    const next = new AbortController();
    controller.current?.abort();
    controller.current = next;

    setRuns(
      Object.fromEntries(
        config.models.map((id) => [id, { ...BLANK_RUN, mode: config.mode }]),
      ),
    );

    await Promise.all(config.models.map((id) => execute(id, next.signal)));

    if (controller.current === next) controller.current = null;
  };

  const stop = () => controller.current?.abort();

  const columns = Object.keys(runs);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-6 border-accent-foreground border-b p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={config.mode}
            onValueChange={(value) => update({ mode: value as PlaygroundMode })}
          >
            <TabsList>
              <Tab value="text">Text</Tab>
              <Tab value="object">Structured output</Tab>
              <TabsIndicator />
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            {isRunning && (
              <Button variant="outline" color="neutral" onClick={stop}>
                Stop
              </Button>
            )}
            <Button
              onClick={() => void start()}
              disabled={
                isRunning || !config.prompt.trim() || config.models.length === 0
              }
            >
              {isRunning && <LoaderIcon className="size-4 animate-spin" />}
              Run on {config.models.length}{" "}
              {config.models.length === 1 ? "model" : "models"}
            </Button>
          </div>
        </div>

        <Field label="Instructions" hint="system prompt">
          <Textarea
            value={config.instructions}
            onValueChange={(value) => update({ instructions: value })}
          >
            <TextareaInput
              rows={3}
              placeholder="You are a helpful assistant…"
              className="font-mono text-sm"
            />
          </Textarea>
        </Field>

        <Field label="Prompt" hint="⌘↵ to run">
          <Textarea
            value={config.prompt}
            onValueChange={(value) => update({ prompt: value })}
          >
            <TextareaInput
              rows={6}
              placeholder="Ask the models something…"
              className="font-mono text-sm"
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                if (!event.metaKey && !event.ctrlKey) return;
                event.preventDefault();
                void start();
              }}
            />
          </Textarea>
        </Field>

        {config.mode === "object" && (
          <Field label="JSON Schema" hint="generateObject / streamObject">
            <Textarea
              value={config.schema}
              onValueChange={(value) => update({ schema: value })}
            >
              <TextareaInput rows={10} className="font-mono text-xs" />
            </Textarea>
          </Field>
        )}

        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Temperature" hint={config.temperature.toFixed(2)}>
            <Slider
              value={config.temperature}
              onValueChange={(value) =>
                update({ temperature: Array.isArray(value) ? value[0] : value })
              }
              min={0}
              max={2}
              step={0.05}
            />
          </Field>

          <Field label="Top P" hint={config.topP.toFixed(2)}>
            <Slider
              value={config.topP}
              onValueChange={(value) =>
                update({ topP: Array.isArray(value) ? value[0] : value })
              }
              min={0}
              max={1}
              step={0.05}
            />
          </Field>

          <Field label="Max output tokens">
            <NumberField
              value={config.maxOutputTokens}
              onValueChange={(value) =>
                update({
                  maxOutputTokens: value ?? DEFAULT_CONFIG.maxOutputTokens,
                })
              }
              min={1}
              max={32000}
              step={128}
            >
              <NumberFieldGroup>
                <NumberFieldDecrement className="size-10" />
                <NumberFieldInput className="h-10 w-full" />
                <NumberFieldIncrement className="size-10" />
              </NumberFieldGroup>
            </NumberField>
          </Field>
        </div>

        <Field
          label="Models"
          hint={`${config.models.length} selected — every id routes through model() in server/utils/ai`}
        >
          <div className="flex flex-col gap-3">
            {Object.entries(PROVIDERS).map(([provider, meta]) => {
              const options = MODELS.filter(
                (model) => model.provider === provider,
              );
              if (options.length === 0) return null;

              return (
                <div
                  key={provider}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span
                    className={cn(
                      "w-24 shrink-0 font-medium text-[11px] uppercase tracking-[0.05em]",
                      meta.accent,
                    )}
                  >
                    {meta.label}
                  </span>
                  {options.map((model) => (
                    <ModelChip
                      key={model.id}
                      id={model.id}
                      label={model.label}
                      selected={config.models.includes(model.id)}
                      onToggle={() => toggle(model.id)}
                    />
                  ))}
                </div>
              );
            })}

            <div className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0 font-medium text-[11px] text-foreground-dimmed uppercase tracking-[0.05em]">
                Custom
              </span>
              {config.custom.map((id) => (
                <ModelChip
                  key={id}
                  id={id}
                  label={id}
                  selected={config.models.includes(id)}
                  onToggle={() => toggle(id)}
                  onRemove={() => remove(id)}
                />
              ))}
              <TextField
                value={custom}
                onValueChange={setCustom}
                className="w-64"
              >
                <TextFieldInput
                  placeholder="my-azure-deployment or anthropic/claude-…"
                  className="font-mono text-xs"
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    add();
                  }}
                />
              </TextField>
              <Button variant="outline" color="neutral" onClick={add}>
                <PlusIcon className="size-3.5" />
                Add
              </Button>
            </div>

            {custom.trim() && (
              <p className="font-mono text-[11px] text-foreground-dimmed">
                {custom.trim()} → {PROVIDERS[providerOf(custom.trim())].label}
              </p>
            )}
          </div>
        </Field>
      </div>

      <div className="p-6">
        <SectionKicker>02 — Output</SectionKicker>

        {columns.length === 0 ? (
          <p className="mt-4 text-foreground-dimmed text-sm">
            Pick your models, write a prompt, and run. Every column streams
            independently — first-token latency, total time, and token usage are
            measured per model.
          </p>
        ) : (
          <div className={cn("mt-4 grid gap-4", grid(columns.length))}>
            {columns.map((id) => {
              const state = runs[id];
              if (!state) return null;

              return <RunColumn key={id} id={id} state={state} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
};
