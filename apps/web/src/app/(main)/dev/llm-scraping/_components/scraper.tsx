"use client";

import { LoaderIcon } from "@zenncore/icons";
import { cn, resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@zenncore/web/components/number-field";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import { useEffect, useRef, useState } from "react";
import { SectionKicker } from "@/app/(main)/dashboard/_components/grid";
import { useDocument } from "@/hooks/use-document";
import {
  type Capture,
  type CaptureRequest,
  CREDITS_PER_CAPTURE,
  DEFAULT_COUNTRY,
  DEFAULT_PROMPT,
  ENDPOINT,
  MAX_REPEATS,
  PROMPT_LIMIT,
  SURFACES,
  type Surface,
} from "@/lib/llm-scraping";
import {
  BLANK_CAPTURE,
  CaptureColumn,
  type CaptureState,
} from "./capture-column";

const STORAGE_KEY = "ecentic:llm-scraping";

type Config = {
  prompt: string;
  country: string;
  repeats: number;
  bypassCache: boolean;
  surfaces: Surface[];
};

const DEFAULT_CONFIG: Config = {
  prompt: DEFAULT_PROMPT,
  country: DEFAULT_COUNTRY,
  repeats: 1,
  bypassCache: false,
  surfaces: ["chatgpt", "google_ai_mode"],
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

const Chip = ({
  label,
  selected,
  title,
  onToggle,
}: {
  label: string;
  selected: boolean;
  title?: string;
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    title={title}
    className={cn(
      "cursor-pointer border px-2.5 py-1 font-mono text-xs transition-colors",
      selected
        ? "border-primary bg-primary/10 text-primary"
        : "border-accent-foreground bg-background text-foreground-dimmed hover:border-foreground-dimmed",
    )}
  >
    {label}
  </button>
);

export const Scraper = () => {
  const { window } = useDocument();
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [columns, setColumns] = useState<Record<string, CaptureState>>({});
  const controller = useRef<AbortController | null>(null);

  const isRunning = Object.values(columns).some(
    (column) => column.status === "queued" || column.status === "running",
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

  const patch = (id: string, changes: Partial<CaptureState>) =>
    setColumns((previous) => {
      const current = previous[id];
      return current
        ? { ...previous, [id]: { ...current, ...changes } }
        : previous;
    });

  const toggle = (surface: Surface) =>
    update({
      surfaces: config.surfaces.includes(surface)
        ? config.surfaces.filter((selected) => selected !== surface)
        : [...config.surfaces, surface],
    });

  const tasks = config.surfaces.flatMap((surface) =>
    Array.from({ length: config.repeats }, (_, run) => ({ surface, run })),
  );

  // A cached repeat would measure ScrapeLLM's cache, not the surface's
  // stochasticity — so repeats force bypass_cache on every run of the batch.
  const bypass = config.bypassCache || config.repeats > 1;

  const execute = async (
    id: string,
    body: CaptureRequest,
    signal: AbortSignal,
  ) => {
    const started = performance.now();
    patch(id, { status: "running" });

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

    const capture = await resultify(
      () => response.data.json() as Promise<Capture>,
    );

    patch(id, {
      status: capture.success ? "done" : "error",
      capture: capture.success ? capture.data : null,
      error: capture.success ? null : describe(capture.error),
      duration: performance.now() - started,
    });
  };

  const start = async () => {
    if (isRunning || !config.prompt.trim() || tasks.length === 0) return;

    const next = new AbortController();
    controller.current?.abort();
    controller.current = next;

    setColumns(
      Object.fromEntries(
        tasks.map(({ surface, run }) => [
          `${surface}:${run}`,
          { ...BLANK_CAPTURE, surface, runIndex: run },
        ]),
      ),
    );

    await Promise.all(
      tasks.map(({ surface, run }) =>
        execute(
          `${surface}:${run}`,
          {
            surface,
            prompt: config.prompt,
            country: config.country,
            bypassCache: bypass,
            runIndex: run,
          },
          next.signal,
        ),
      ),
    );

    if (controller.current === next) controller.current = null;
  };

  const stop = () => controller.current?.abort();

  const results = Object.keys(columns);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-6 border-accent-foreground border-b p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[11px] text-foreground-dimmed">
            ≈ {tasks.length * CREDITS_PER_CAPTURE} credits per run — cache hits
            observed to bill 0
          </p>

          <div className="flex items-center gap-2">
            {isRunning && (
              <Button variant="outline" color="neutral" onClick={stop}>
                Stop
              </Button>
            )}
            <Button
              onClick={() => void start()}
              disabled={
                isRunning || !config.prompt.trim() || tasks.length === 0
              }
            >
              {isRunning && <LoaderIcon className="size-4 animate-spin" />}
              Capture {tasks.length} {tasks.length === 1 ? "run" : "runs"}
            </Button>
          </div>
        </div>

        <Field
          label="Prompt"
          hint={`${config.prompt.length}/${PROMPT_LIMIT} — ⌘↵ to run`}
        >
          <Textarea
            value={config.prompt}
            onValueChange={(value) => update({ prompt: value })}
          >
            <TextareaInput
              rows={4}
              placeholder="Ask the surfaces something a buyer would ask…"
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

        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Surfaces" hint={`${config.surfaces.length} selected`}>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(SURFACES).map(([surface, meta]) => (
                <Chip
                  key={surface}
                  label={meta.label}
                  title={meta.note}
                  selected={config.surfaces.includes(surface as Surface)}
                  onToggle={() => toggle(surface as Surface)}
                />
              ))}
            </div>
          </Field>

          <Field label="Country" hint="ISO 3166-1 alpha-2 — geo of the session">
            <TextField
              value={config.country}
              onValueChange={(value) =>
                update({ country: value.toUpperCase().slice(0, 2) })
              }
              className="w-24"
            >
              <TextFieldInput placeholder="US" className="font-mono text-sm" />
            </TextField>
          </Field>

          <Field
            label="Repeats"
            hint={
              config.repeats > 1
                ? "stochasticity is data — every repeat is its own capture"
                : undefined
            }
          >
            <NumberField
              value={config.repeats}
              onValueChange={(value) =>
                update({ repeats: value ?? DEFAULT_CONFIG.repeats })
              }
              min={1}
              max={MAX_REPEATS}
              step={1}
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
          label="Cache"
          hint={
            config.repeats > 1
              ? "forced on — cached repeats would return the same answer"
              : "ScrapeLLM caches per prompt+country; bypass to hit the live surface"
          }
        >
          <div className="flex items-center gap-2">
            <Chip
              label="bypass_cache"
              selected={bypass}
              onToggle={() => update({ bypassCache: !config.bypassCache })}
            />
          </div>
        </Field>
      </div>

      <div className="p-6">
        <SectionKicker>02 — Captures</SectionKicker>

        {results.length === 0 ? (
          <p className="mt-4 text-foreground-dimmed text-sm">
            Pick your surfaces, write a prompt, and capture. Each surface × run
            is an independent request against the real consumer product via
            ScrapeLLM, normalized into the shared envelope — answer, citations,
            search results, credits, latency.
          </p>
        ) : (
          <div className={cn("mt-4 grid gap-4", grid(results.length))}>
            {results.map((id) => {
              const state = columns[id];
              if (!state) return null;

              return <CaptureColumn key={id} state={state} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
};
