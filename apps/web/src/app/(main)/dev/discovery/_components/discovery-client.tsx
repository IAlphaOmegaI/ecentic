"use client";

import { LoaderIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  type FormEntries,
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useState } from "react";
import { z } from "zod";
import * as Discovery from "@/server/app/intelligence/discovery";
import {
  Crosshair,
  SectionKicker,
  StatusPill,
} from "../../../dashboard/_components/grid";

const formConfig = {
  targetStore: field({
    shape: "text",
    validator: z.string().min(1, "Enter a target store domain"),
    label: "Target store domain",
    placeholder: "yourstore.com",
  }),
  queries: field({
    shape: "text",
    validator: z.string().min(1, "Enter at least one query"),
    label: "Shopping queries — comma separated",
    placeholder:
      "blue trainers under $80, waterproof hiking boots, gifts for runners",
  }),
} satisfies GenericForm;

const MAX_QUERIES = 8;

type RankTone = "success" | "warning" | "error";

const rankTone = (rank: number | null, total: number): RankTone => {
  switch (true) {
    case rank === null:
      return "error";
    case rank <= 3:
      return "success";
    case total > 0 && rank <= Math.ceil(total / 2):
      return "warning";
    default:
      return "warning";
  }
};

const RankBadge = ({ rank, total }: { rank: number | null; total: number }) => {
  const tone = rankTone(rank, total);
  return (
    <StatusPill tone={tone}>
      {rank === null ? "Not suggested" : `Ranked #${rank} of ${total}`}
    </StatusPill>
  );
};

const StoreRow = ({
  store,
  rank,
}: {
  store: Discovery.DiscoveryStore;
  rank: number;
}) => (
  <li
    className={cn(
      "flex gap-3 border-accent-foreground border-t px-3 py-2.5 first:border-t-0",
      store.isTarget && "bg-primary/5",
    )}
  >
    <span
      className={cn(
        "mt-px w-5 shrink-0 text-right font-mono font-semibold text-xs tabular-nums",
        store.isTarget ? "text-primary" : "text-foreground-dimmed",
      )}
    >
      {rank}
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span
          className={cn(
            "font-medium text-sm",
            store.isTarget ? "text-primary" : "text-foreground-rich",
          )}
        >
          {store.name}
        </span>
        {store.domain && (
          <span className="font-mono text-[11px] text-foreground-dimmed lowercase">
            {store.domain}
          </span>
        )}
        {store.isTarget && <StatusPill tone="primary">Your store</StatusPill>}
      </div>
      <p className="mt-0.5 text-foreground-dimmed text-xs leading-snug">
        {store.reason}
      </p>
    </div>
  </li>
);

const ModelColumn = ({
  result,
}: {
  result: Discovery.DiscoveryModelResult;
}) => (
  <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-accent-foreground bg-background-rich">
    <div className="flex items-center justify-between gap-2 border-accent-foreground border-b bg-background-dimmed px-3 py-2">
      <span className="font-semibold text-foreground-rich text-sm">
        {result.modelLabel}
      </span>
      {result.status === "error" ? (
        <StatusPill tone="error">Failed</StatusPill>
      ) : (
        <RankBadge rank={result.targetRank} total={result.stores.length} />
      )}
    </div>

    {result.status === "error" ? (
      <div className="flex items-start gap-2 p-3 text-error text-xs">
        <span className="shrink-0">✕</span>
        <span className="wrap-break-word font-mono">
          {result.error ?? "This model could not be reached."}
        </span>
      </div>
    ) : (
      <>
        <div
          className={cn(
            "border-accent-foreground border-b px-3 py-2.5",
            result.targetIncluded ? "bg-success/5" : "bg-error/5",
          )}
        >
          <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            {result.targetIncluded
              ? "Why your store ranked here"
              : "Why your store was left out"}
          </p>
          <p className="mt-1 text-foreground text-xs leading-snug">
            {result.targetReason || "No explanation returned."}
          </p>
        </div>
        {result.stores.length > 0 ? (
          <ol className="flex-1">
            {result.stores.map((store, index) => (
              <StoreRow
                // biome-ignore lint/suspicious/noArrayIndexKey: static ranked list, never reordered after render
                key={`${store.name}-${index}`}
                rank={index + 1}
                store={store}
              />
            ))}
          </ol>
        ) : (
          <p className="px-3 py-4 text-center text-foreground-dimmed text-xs">
            No stores returned.
          </p>
        )}
      </>
    )}
  </div>
);

const QuerySummaryChip = ({
  result,
}: {
  result: Discovery.DiscoveryModelResult;
}) => {
  const tone =
    result.status === "error"
      ? "neutral"
      : rankTone(result.targetRank, result.stores.length);
  const value =
    result.status === "error"
      ? "—"
      : result.targetRank === null
        ? "Not suggested"
        : `#${result.targetRank}`;
  return (
    <StatusPill tone={tone}>
      <span className="text-foreground-dimmed">{result.modelLabel}</span>
      <span className="font-mono">{value}</span>
    </StatusPill>
  );
};

const QuerySection = ({
  result,
}: {
  result: Discovery.DiscoveryQueryResult;
}) => (
  <section className="space-y-3">
    <div className="space-y-2">
      <SectionKicker>
        <span className="text-foreground-rich text-sm normal-case">
          “{result.query}”
        </span>
      </SectionKicker>
      <div className="flex flex-wrap gap-1.5">
        {result.models.map((model) => (
          <QuerySummaryChip key={model.model} result={model} />
        ))}
      </div>
    </div>
    <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
      {result.models.map((model) => (
        <ModelColumn key={model.model} result={model} />
      ))}
    </div>
  </section>
);

export const DiscoveryClient = () => {
  const [result, setResult] = useState<Discovery.DiscoveryRunResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const [run, isRunning] = useAsyncAction(
    async ({ targetStore, queries }: FormEntries<typeof formConfig>) => {
      setError(null);

      const parsed = queries
        .split(",")
        .map((query) => query.trim())
        .filter((query) => query.length > 0);

      if (parsed.length === 0) {
        setError("Enter at least one shopping query.");
        return;
      }

      const response = await Discovery.runDiscovery({
        targetStore,
        queries: parsed,
      });

      if (!response.success) {
        setError(response.error.message || "Something went wrong.");
        return;
      }

      setResult(response.data);
    },
  );

  return (
    <div className="relative flex flex-col divide-y divide-accent-foreground">
      {/* Form */}
      <div className="p-6">
        <InferredForm
          className="flex flex-col gap-4 md:flex-row md:items-end"
          config={formConfig}
          onSubmit={run}
        >
          <Button
            className="shrink-0 md:w-40"
            color="primary"
            disabled={isRunning}
            type="submit"
          >
            {isRunning && <LoaderIcon className="size-4 animate-spin" />}
            {isRunning ? "Asking AI…" : "Run discovery"}
          </Button>
        </InferredForm>
        <p className="mt-2 text-foreground-dimmed text-xs">
          Each query is sent to GPT-4o, Claude, Gemini and Perplexity. We rank
          the stores each model suggests and show where your store landed — or
          why it didn’t. Up to {MAX_QUERIES} queries per run.
        </p>
        {error && (
          <div className="mt-3 flex w-fit items-start gap-2 rounded-lg border border-error/30 bg-error/5 p-3 text-error text-xs">
            <span className="shrink-0">✕</span>
            <span className="font-mono">{error}</span>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="p-6">
        {(() => {
          switch (true) {
            case isRunning && result === null:
              return (
                <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 text-foreground-dimmed">
                  <LoaderIcon className="size-6 animate-spin" />
                  <p className="text-sm">
                    Querying GPT-4o, Claude, Gemini and Perplexity…
                  </p>
                </div>
              );
            case result === null:
              return (
                <div className="relative flex min-h-[24rem] flex-col items-center justify-center gap-2 text-center">
                  <Crosshair className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  <StatusPill tone="neutral">No run yet</StatusPill>
                  <p className="max-w-md text-foreground-dimmed text-sm">
                    Enter your store domain and a comma-separated list of
                    shopping queries, then run discovery to see which stores AI
                    agents recommend — and how your store compares.
                  </p>
                </div>
              );
            default:
              return (
                <div className="space-y-8">
                  <div className="flex items-center gap-2">
                    <SectionKicker>Target store</SectionKicker>
                    <span className="font-mono font-semibold text-primary text-sm">
                      {result.targetStore}
                    </span>
                  </div>
                  {result.queries.map((query) => (
                    <QuerySection key={query.query} result={query} />
                  ))}
                </div>
              );
          }
        })()}
      </div>
    </div>
  );
};
