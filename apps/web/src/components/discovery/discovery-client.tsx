"use client";

import { LoaderIcon, PlusIcon, XCircleIcon } from "@zenncore/icons";
import { cn, resultify, unwrapResult } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useFormatter, useMessages, useTranslations } from "next-intl";
import { useState } from "react";
import {
  Crosshair,
  StatusPill,
} from "@/app/[locale]/(main)/dashboard/_components/grid";
import { AnalysisText } from "@/components/analysis-text";
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
  const format = useFormatter();
  const tone = rankTone(rank, total);
  return (
    <StatusPill tone={tone}>
      {rank === null
        ? translate("notSuggested")
        : translate("ranked", {
            rank: format.number(rank),
            total: format.number(total),
          })}
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
        "flex gap-4 border-accent-foreground border-t px-4 py-4 first:border-t-0 sm:px-6",
        store.isTarget && "bg-primary/5",
      )}
    >
      <span
        className={cn(
          "mt-px w-6 shrink-0 text-right font-semibold text-primary text-sm tabular-nums",
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
            <span className="font-mono text-foreground-dimmed text-xs lowercase">
              {store.domain}
            </span>
          )}
          {store.isTarget && (
            <StatusPill tone="primary">
              {translate("targetStore.yourStore")}
            </StatusPill>
          )}
        </div>
        <p className="mt-1 text-foreground-dimmed text-sm leading-6">
          <AnalysisText text={store.reason} terms={[store.name]} />
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

  if (result.status === "error") {
    return (
      <div className="flex items-start gap-3 px-4 py-6 sm:px-6" role="status">
        <StatusPill tone="error">{translate("failed")}</StatusPill>
        <p className="wrap-anywhere max-w-2xl text-foreground-dimmed text-sm leading-6">
          {translate("unreachable")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-w-0 lg:grid-cols-3">
      <div className="min-w-0 border-accent-foreground border-b px-4 py-6 sm:px-6 lg:border-r lg:border-b-0">
        <RankBadge rank={result.targetRank} total={result.stores.length} />
        <h3 className="mt-4 font-semibold text-base text-foreground-rich">
          {result.targetIncluded
            ? translate("whyRanked")
            : translate("whyLeftOut")}
        </h3>
        <p className="wrap-anywhere mt-2 text-foreground-dimmed text-sm leading-6">
          <AnalysisText
            text={result.targetReason || translate("noExplanation")}
            terms={result.stores.map((store) => store.name)}
          />
        </p>
      </div>
      <div className="min-w-0 lg:col-span-2">
        {result.stores.length > 0 ? (
          <ol>
            {result.stores.map((store, index) => (
              <StoreRow
                // biome-ignore lint/suspicious/noArrayIndexKey: ranked response is immutable
                key={`${store.name}-${index}`}
                rank={index + 1}
                store={store}
              />
            ))}
          </ol>
        ) : (
          <p className="px-4 py-6 text-foreground-dimmed text-sm sm:px-6">
            {translate("noStores")}
          </p>
        )}
      </div>
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
      <span className="tabular-nums">{value}</span>
    </StatusPill>
  );
};

const QuerySection = ({
  result,
}: {
  result: Discovery.DiscoveryQueryResult;
}) => (
  <section className="min-w-0 border-accent-foreground border-t">
    <div className="px-4 py-5 sm:px-6">
      <h2 className="wrap-anywhere font-semibold text-foreground-rich text-xl leading-7">
        “{result.query}”
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {result.models.map((model) => (
          <QuerySummaryChip key={model.model} result={model} />
        ))}
      </div>
    </div>
    <Tabs defaultValue={result.models[0]?.model}>
      <div className="overflow-x-auto border-accent-foreground border-y px-4 py-3 sm:px-6">
        <TabsList className="w-max" aria-label={result.query}>
          <TabsIndicator className="motion-reduce:transition-none" />
          {result.models.map((model) => (
            <Tab key={model.model} value={model.model}>
              {model.modelLabel}
            </Tab>
          ))}
        </TabsList>
      </div>
      {result.models.map((model) => (
        <TabsPanel
          key={model.model}
          value={model.model}
          className="m-0 border-0 p-0"
        >
          <ModelColumn result={model} />
        </TabsPanel>
      ))}
    </Tabs>
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
  const format = useFormatter();
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
      setError(translate("errors.generic"));
      return;
    }

    setResult(response.data);
  });

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-col gap-3 border-accent-foreground border-b px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
        <div className="min-w-0 sm:w-72 sm:shrink-0">
          <p className="font-medium text-foreground-dimmed text-sm">
            {translate("targetStore.label")}
          </p>
          {lockStore ? (
            <p className="mt-1 truncate font-medium text-foreground-rich text-sm">
              {defaultTargetStore}
            </p>
          ) : (
            <TextField
              value={targetStore}
              onValueChange={setTargetStore}
              className="mt-2"
            >
              <TextFieldInput
                id="discovery-target"
                aria-label={translate("targetStore.label")}
                placeholder={translate("targetStore.placeholder")}
                disabled={isRunning}
              />
            </TextField>
          )}
        </div>
        <p className="max-w-xl text-foreground-dimmed text-sm leading-6">
          {translate("targetStore.description")}
        </p>
        {lockStore && (
          <div className="sm:ml-auto">
            <StatusPill tone="primary">
              {translate("targetStore.yourStore")}
            </StatusPill>
          </div>
        )}
      </div>

      <section className="relative">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <div className="flex items-start justify-between gap-4 px-4 pt-6 pb-5 sm:px-6">
          <div>
            <h2 className="font-semibold text-foreground-rich text-xl">
              {translate("queries.label")}
            </h2>
            <p className="mt-2 max-w-2xl text-foreground-dimmed text-sm leading-6">
              {translate("queries.description")}
            </p>
          </div>
          <p className="shrink-0 text-foreground-dimmed text-sm tabular-nums">
            {validQueryCount}/{MAX_QUERIES}
          </p>
        </div>
        <div className="divide-y divide-accent-foreground border-accent-foreground border-y">
          {queryInputs.map((input, index) => (
            <div
              key={input.id}
              className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6"
            >
              <span
                aria-hidden
                className="w-6 shrink-0 font-semibold text-primary text-sm tabular-nums"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <TextField
                value={input.value}
                onValueChange={(value) => updateQuery(input.id, value)}
                className="min-w-0 flex-1"
              >
                <TextFieldInput
                  aria-label={`${translate("queries.label")} ${index + 1}`}
                  placeholder={
                    queryPlaceholders[index] ??
                    translate("queries.anotherPlaceholder")
                  }
                  disabled={isRunning}
                />
              </TextField>
              <Button
                variant="soft"
                color="neutral"
                size="icon"
                onClick={() => removeQuery(input.id)}
                disabled={queryInputs.length <= 1 || isRunning}
                aria-label={translate("queries.removeAriaLabel", {
                  index: format.number(index + 1),
                })}
              >
                <XCircleIcon aria-hidden className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button
            variant="soft"
            color="neutral"
            onClick={addQuery}
            disabled={isRunning || queryInputs.length >= MAX_QUERIES}
            className="w-fit"
          >
            <PlusIcon aria-hidden className="size-4" />
            {translate("queries.add")}
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-foreground-dimmed text-xs leading-5">
              {canRun
                ? translate("hint.ready", { count: validQueryCount })
                : translate(
                    lockStore ? "errors.queryRequired" : "hint.notReady",
                  )}
            </p>
            <Button
              color="primary"
              onClick={run}
              disabled={isRunning || !canRun}
              className="shrink-0"
            >
              {isRunning && (
                <LoaderIcon
                  aria-hidden
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
              )}
              {translate(isRunning ? "action.running" : "action.primary")}
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="wrap-anywhere border-accent-foreground border-t px-4 py-4 text-error text-sm leading-6 sm:px-6"
        >
          {error}
        </div>
      )}

      <p className="border-accent-foreground border-t px-4 py-4 text-foreground-dimmed text-xs leading-5 sm:px-6">
        {translate("method")}
      </p>

      <section
        className="relative border-accent-foreground border-t"
        aria-busy={isRunning}
      >
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        {isRunning && (
          <p
            role="status"
            className="flex items-center gap-3 px-4 py-5 text-foreground-dimmed text-sm sm:px-6"
          >
            <LoaderIcon
              aria-hidden
              className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
            />
            {translate("loading")}
          </p>
        )}
        {result === null ? (
          !isRunning && (
            <div className="px-4 py-8 sm:px-6">
              <p className="font-medium text-foreground-dimmed text-sm">
                {translate("empty.status")}
              </p>
              <p className="mt-3 max-w-2xl text-foreground-dimmed text-sm leading-6">
                {translate("empty.description")}
              </p>
            </div>
          )
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-4 sm:px-6">
              <p className="font-medium text-foreground-dimmed text-sm">
                {translate("results.targetStore")}
              </p>
              <p className="wrap-anywhere font-medium text-foreground-rich text-sm">
                {result.targetStore}
              </p>
            </div>
            {result.queries.map((query, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a response may contain duplicate query text
              <QuerySection key={`${query.query}-${index}`} result={query} />
            ))}
          </>
        )}
      </section>
    </div>
  );
};
