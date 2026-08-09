"use client";

import { LoaderIcon, PlusIcon, XCircleIcon } from "@zenncore/icons";
import { cn, resultify, unwrapResult } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useMessages, useTranslations } from "next-intl";
import { useState } from "react";
import {
  Crosshair,
  SectionKicker,
  StatusPill,
} from "@/app/[locale]/(main)/dashboard/_components/grid";
import * as Discovery from "@/server/app/intelligence/discovery";

const MAX_QUERIES = 8;

type QueryInput = {
  id: string;
  value: string;
};

const createQueryInput = (value = ""): QueryInput => ({
  id: crypto.randomUUID(),
  value,
});

type RankTone = "success" | "warning" | "error";

const rankTone = (rank: number | null, total: number): RankTone => {
  switch (true) {
    case rank === null:
      return "error";
    case rank !== null && rank <= 3:
      return "success";
    case rank !== null && total > 0 && rank <= Math.ceil(total / 2):
      return "warning";
    default:
      return "warning";
  }
};

const RankBadge = ({ rank, total }: { rank: number | null; total: number }) => {
  const translate = useTranslations("dashboard.discovery.model");
  const tone = rankTone(rank, total);
  return (
    <StatusPill tone={tone}>
      {rank === null
        ? translate("notSuggested")
        : translate("ranked", { rank, total })}
    </StatusPill>
  );
};

const StoreRow = ({
  store,
  rank,
}: {
  store: Discovery.DiscoveryStore;
  rank: number;
}) => {
  const translate = useTranslations("dashboard.discovery");

  return (
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
        {store.isTarget && (
          <StatusPill tone="primary">{translate("targetStore.yourStore")}</StatusPill>
        )}
      </div>
      <p className="mt-0.5 text-foreground-dimmed text-xs leading-snug">
        {store.reason}
      </p>
    </div>
  </li>
  );
};

const ModelColumn = ({
  result,
}: {
  result: Discovery.DiscoveryModelResult;
}) => {
  const translate = useTranslations("dashboard.discovery.model");

  return (
  <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-accent-foreground bg-background-rich">
    <div className="flex items-center justify-between gap-2 border-accent-foreground border-b bg-background-dimmed px-3 py-2">
      <span className="font-semibold text-foreground-rich text-sm">
        {result.modelLabel}
      </span>
      {result.status === "error" ? (
        <StatusPill tone="error">{translate("failed")}</StatusPill>
      ) : (
        <RankBadge rank={result.targetRank} total={result.stores.length} />
      )}
    </div>

    {result.status === "error" ? (
      <div className="flex items-start gap-2 p-3 text-error text-xs">
        <span className="shrink-0">✕</span>
        <span className="wrap-break-word font-mono">
          {result.error ?? translate("unreachable")}
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
              ? translate("whyRanked")
              : translate("whyLeftOut")}
          </p>
          <p className="mt-1 text-foreground text-xs leading-snug">
            {result.targetReason || translate("noExplanation")}
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
            {translate("noStores")}
          </p>
        )}
      </>
    )}
  </div>
  );
};

const QuerySummaryChip = ({
  result,
}: {
  result: Discovery.DiscoveryModelResult;
}) => {
  const translate = useTranslations("dashboard.discovery.model");
  const tone =
    result.status === "error"
      ? "neutral"
      : rankTone(result.targetRank, result.stores.length);
  const value =
    result.status === "error"
      ? "—"
      : result.targetRank === null
        ? translate("notSuggested")
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

type DiscoveryClientProps = {
  /** Prefill the target store domain (and, with `lockStore`, fix it). */
  defaultTargetStore?: string;
  /**
   * Hide the target store field and always evaluate against
   * `defaultTargetStore` — used when the tool is scoped to one store's
   * dashboard, so the merchant never retypes their own domain.
   */
  lockStore?: boolean;
};

export const DiscoveryClient = ({
  defaultTargetStore = "",
  lockStore = false,
}: DiscoveryClientProps = {}) => {
  const translate = useTranslations("dashboard.discovery");
  const messages = useMessages();
  const queryPlaceholders = messages.dashboard.discovery.queries.placeholders;

  const [result, setResult] = useState<Discovery.DiscoveryRunResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [targetStore, setTargetStore] = useState(defaultTargetStore);
  const [queryInputs, setQueryInputs] = useState<QueryInput[]>([
    createQueryInput(),
  ]);

  const updateQuery = (id: string, value: string) => {
    setQueryInputs((previous) =>
      previous.map((input) => (input.id === id ? { ...input, value } : input)),
    );
  };

  const addQuery = () => {
    setQueryInputs((previous) =>
      previous.length >= MAX_QUERIES
        ? previous
        : [...previous, createQueryInput()],
    );
  };

  const removeQuery = (id: string) => {
    setQueryInputs((previous) =>
      previous.length <= 1
        ? previous
        : previous.filter((input) => input.id !== id),
    );
  };

  const effectiveTargetStore = lockStore ? defaultTargetStore : targetStore;
  const validQueryCount = queryInputs.filter((input) =>
    input.value.trim(),
  ).length;
  const canRun = effectiveTargetStore.trim().length > 0 && validQueryCount >= 1;

  const [run, isRunning] = useAsyncAction(async () => {
    setError(null);

    const target = effectiveTargetStore.trim();
    const parsed = queryInputs
      .map((input) => input.value.trim())
      .filter((value) => value.length > 0);

    if (!target) {
      setError(translate("errors.targetRequired"));
      return;
    }

    if (parsed.length === 0) {
      setError(translate("errors.queryRequired"));
      return;
    }

    // unwrapResult throws on an action-level error and the request itself can
    // reject on a network blip — resultify folds both into one failure branch
    // instead of letting the rejection escape as an unhandled crash.
    const response = await resultify(() =>
      unwrapResult(
        Discovery.runDiscovery({
          targetStore: target,
          queries: parsed,
        }),
      ),
    );

    if (!response.success) {
      setError(response.error.message || translate("errors.generic"));
      return;
    }

    setResult(response.data);
  });

  return (
    <div className="flex flex-col">
      {/* Setup — target store left, queries right, like the comparison header */}
      <div className="grid lg:grid-cols-2">
        <div className="flex flex-col gap-6 px-6 py-6 sm:px-8 sm:py-8">
          <div>
            <label
              htmlFor="discovery-target"
              className="block font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]"
            >
              {translate("targetStore.label")}
            </label>
            {lockStore ? (
              <div className="mt-2 flex items-center gap-2 border border-accent-foreground bg-background-dimmed px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-medium font-mono text-foreground text-sm">
                  {defaultTargetStore}
                </span>
                <StatusPill tone="primary">
                  {translate("targetStore.yourStore")}
                </StatusPill>
              </div>
            ) : (
              <TextField
                value={targetStore}
                onValueChange={setTargetStore}
                className="mt-2"
              >
                <TextFieldInput
                  id="discovery-target"
                  placeholder={translate("targetStore.placeholder")}
                  className="font-mono"
                />
              </TextField>
            )}
            <p className="mt-2 font-light text-foreground-dimmed text-sm">
              {translate("targetStore.description")}
            </p>
          </div>
        </div>

        <div className="border-accent-foreground border-t px-6 py-6 sm:px-8 sm:py-8 lg:border-t-0 lg:border-l">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
              {translate("queries.label")}
            </span>
            <span className="font-mono text-[11px] text-foreground-dimmed tabular-nums">
              {validQueryCount}/{MAX_QUERIES}
            </span>
          </div>

          <div className="mt-2 space-y-2">
            {queryInputs.map((input, index) => (
              <div key={input.id} className="flex items-stretch gap-2">
                <TextField
                  value={input.value}
                  onValueChange={(value) => updateQuery(input.id, value)}
                  className="flex-1"
                >
                  <TextFieldInput
                    placeholder={
                      queryPlaceholders[index] ??
                      translate("queries.anotherPlaceholder")
                    }
                  />
                </TextField>
                <Button
                  variant="outline"
                  color="accent"
                  size="icon"
                  onClick={() => removeQuery(input.id)}
                  disabled={queryInputs.length <= 1 || isRunning}
                  className="h-auto shrink-0"
                  aria-label={translate("queries.removeAriaLabel", {
                    index: index + 1,
                  })}
                >
                  <XCircleIcon className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            color="accent"
            onClick={addQuery}
            disabled={isRunning || queryInputs.length >= MAX_QUERIES}
            className="mt-2 w-full"
          >
            <PlusIcon className="size-4" />
            {translate("queries.add")}
          </Button>
          <p className="mt-2 font-light text-foreground-dimmed text-sm">
            {translate("queries.description")}
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-col gap-3 border-accent-foreground border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="font-light text-foreground-dimmed text-sm">
          {canRun
            ? translate("hint.ready", { count: validQueryCount })
            : translate("hint.notReady")}
        </p>
        <Button
          color="primary"
          onClick={run}
          disabled={isRunning || !canRun}
          className="w-full shrink-0 sm:w-auto"
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <LoaderIcon className="size-4 animate-spin" />
              {translate("action.running")}
            </span>
          ) : (
            translate("action.primary")
          )}
        </Button>
      </div>

      {error && (
        <div className="border-accent-foreground border-t bg-error/5 px-6 py-4 sm:px-8">
          <div className="flex w-fit items-start gap-2 text-error text-xs">
            <span className="shrink-0">✕</span>
            <span className="font-mono">{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="border-accent-foreground border-t px-6 py-6 sm:px-8">
        {(() => {
          switch (true) {
            case isRunning && result === null:
              return (
                <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 text-foreground-dimmed">
                  <LoaderIcon className="size-6 animate-spin" />
                  <p className="text-sm">{translate("loading")}</p>
                </div>
              );
            case result === null:
              return (
                <div className="relative flex min-h-[24rem] flex-col items-center justify-center gap-2 text-center">
                  <Crosshair className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  <StatusPill tone="neutral">{translate("empty.status")}</StatusPill>
                  <p className="max-w-md text-foreground-dimmed text-sm">
                    {translate("empty.description")}
                  </p>
                </div>
              );
            default:
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <SectionKicker>{translate("results.targetStore")}</SectionKicker>
                    <span className="font-mono font-semibold text-primary text-sm">
                      {result.targetStore}
                    </span>
                  </div>

                  <div className="space-y-8">
                    {result.queries.map((query) => (
                      <QuerySection key={query.query} result={query} />
                    ))}
                  </div>
                </div>
              );
          }
        })()}
      </div>
    </div>
  );
};
