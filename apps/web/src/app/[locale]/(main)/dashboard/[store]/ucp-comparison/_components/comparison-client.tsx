"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import { PlusIcon, XCircleIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useTranslations } from "next-intl";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import type z from "zod";
import {
  runStoreComparison,
  type StoreDiscovery,
} from "@/server/app/intelligence/product-comparison";
import type {
  priceSchema,
  productSchema,
} from "@/server/app/intelligence/ucp/advanced-validator";
import { StatusPill } from "../../../_components/grid";

type ComparisonLine =
  | { kind: "search_params"; params: unknown }
  | { kind: "store_profile"; storeUrl: string; discovery: StoreDiscovery }
  | { kind: "store_searching"; storeUrl: string }
  | { kind: "store_result"; storeUrl: string; result: unknown }
  | { kind: "store_error"; storeUrl: string; message: string }
  | { kind: "text"; text: string }
  | { kind: "error"; message: string }
  | { kind: "done" };

type StoreRole = "source" | "competitor";

type StoreState = {
  url: string;
  role: StoreRole;
  status: "idle" | "discovering" | "searching" | "done" | "error";
  discovery: StoreDiscovery | null;
  products: z.infer<typeof productSchema>[];
  error: string | null;
};

const summarise = (value: unknown, maxLen = 120): string => {
  if (value === null || value === undefined) return "null";
  const raw = JSON.stringify(value);
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen)}…`;
};

// UCP money amounts are ISO 4217 minor units (e.g. 24750 = $247.50).
const formatMoney = (money: z.infer<typeof priceSchema>): string => {
  const value = money.amount / 100;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: money.currency,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${money.currency}`;
  }
};

const productPrice = (product: z.infer<typeof productSchema>): string => {
  const money = product.variants[0]?.price ?? product.price_range.min;
  return formatMoney(money);
};

const flushText = (
  buffer: string,
  setter: Dispatch<SetStateAction<ComparisonLine[]>>,
) => {
  if (!buffer) return;
  setter((previous) => {
    const last = previous[previous.length - 1];
    if (last?.kind === "text") {
      return [
        ...previous.slice(0, -1),
        { kind: "text", text: last.text + buffer },
      ];
    }
    return [...previous, { kind: "text", text: buffer }];
  });
};

// Renders the derived search params as readable chips (query / price / …)
// instead of a raw JSON wall; nested/object values fall through to the
// collapsed "Raw JSON" disclosure.
const ParamChips = ({ params }: { params: unknown }) => {
  if (typeof params !== "object" || params === null) return null;

  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, value]) => value != null && typeof value !== "object",
  );

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 border border-accent-foreground bg-background px-2.5 py-1 text-xs"
        >
          <span className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.06em]">
            {key}
          </span>
          <span className="font-medium text-foreground tabular-nums">
            {String(value)}
          </span>
        </span>
      ))}
    </div>
  );
};

const storeStatusTone: Record<
  StoreState["status"],
  "success" | "error" | "primary" | "neutral"
> = {
  idle: "neutral",
  discovering: "primary",
  searching: "primary",
  done: "success",
  error: "error",
};

// One column in the side-by-side gap-px grid — the source store leads with a
// primary-tinted header so "your" column reads at a glance.
const StoreCard = ({ store }: { store: StoreState }) => {
  const translate = useTranslations("dashboard.ucpComparison");
  const isLoading =
    store.status === "discovering" || store.status === "searching";
  const shownProducts = store.products.slice(0, 8);

  const statusLabel = (() => {
    switch (store.status) {
      case "idle":
        return translate("storeStatus.idle");
      case "discovering":
        return translate("storeStatus.discovering");
      case "searching":
        return translate("storeStatus.searching");
      case "done":
        return translate("storeStatus.done");
      case "error":
        return translate("storeStatus.error");
      default: {
        const exhaustive: never = store.status;
        return exhaustive;
      }
    }
  })();

  return (
    <div className="flex flex-col bg-background-rich">
      <div
        className={cn(
          "border-accent-foreground border-b px-4 py-3",
          store.role === "source" ? "bg-primary/5" : "bg-background-dimmed",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={store.role === "source" ? "primary" : "neutral"}>
            {store.role === "source"
              ? translate("results.yourStore")
              : translate("results.competitor")}
          </StatusPill>
          <p className="min-w-0 flex-1 truncate font-medium text-foreground text-sm">
            {store.discovery?.domain ?? store.url}
          </p>
          {store.discovery && (
            <StatusPill
              tone={store.discovery.transport === "mcp" ? "primary" : "warning"}
            >
              {store.discovery.transport}
            </StatusPill>
          )}
          <StatusPill tone={storeStatusTone[store.status]}>
            {statusLabel}
          </StatusPill>
        </div>
        {store.discovery?.endpoint && (
          <p className="mt-1 truncate font-mono text-foreground-dimmed text-xs">
            {store.discovery.endpoint}
          </p>
        )}
      </div>

      <div className="flex-1">
        {store.error && (
          <p className="px-4 py-4 font-mono text-error text-xs">
            {store.error}
          </p>
        )}

        {!store.error &&
          store.products.length === 0 &&
          store.status === "done" && (
            <p className="px-4 py-4 font-light text-foreground-dimmed text-sm">
              {translate("results.noProducts")}
            </p>
          )}

        {shownProducts.length > 0 && (
          <ul className="divide-y divide-accent-foreground">
            {shownProducts.map((product, index) => (
              <li
                key={product.id}
                className="flex items-baseline gap-3 px-4 py-2.5"
              >
                <span className="w-5 shrink-0 font-mono text-[11px] text-foreground-dimmed tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="min-w-0 flex-1 truncate font-medium text-foreground text-sm">
                  {product.title}
                </p>
                <span className="shrink-0 font-mono text-foreground-dimmed text-xs tabular-nums">
                  {productPrice(product)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {store.products.length > 8 && (
          <p className="border-accent-foreground border-t px-4 py-2 text-[11px] text-foreground-dimmed">
            {translate("results.moreHidden", {
              count: store.products.length - 8,
            })}
          </p>
        )}

        {isLoading && (
          <div className="space-y-2 px-4 py-4">
            <div className="h-3 w-3/4 animate-pulse bg-accent-foreground/40" />
            <div className="h-3 w-1/2 animate-pulse bg-accent-foreground/30" />
            <div className="h-3 w-2/3 animate-pulse bg-accent-foreground/20" />
          </div>
        )}
      </div>
    </div>
  );
};

type CompetitorInput = {
  id: string;
  url: string;
};

const createCompetitorInput = (url = ""): CompetitorInput => ({
  id: crypto.randomUUID(),
  url,
});

export const ComparisonClient = () => {
  const translate = useTranslations("dashboard.ucpComparison");
  const [sourceStoreUrl, setSourceStoreUrl] = useState("");
  const [competitorInputs, setCompetitorInputs] = useState<CompetitorInput[]>([
    createCompetitorInput(),
  ]);
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<ComparisonLine[]>([]);
  const [stores, setStores] = useState<StoreState[]>([]);
  const [searchParams, setSearchParams] = useState<unknown>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  });

  const updateCompetitorUrl = (id: string, value: string) => {
    setCompetitorInputs((previous) =>
      previous.map((input) =>
        input.id === id ? { ...input, url: value } : input,
      ),
    );
  };

  const addCompetitor = () => {
    setCompetitorInputs((previous) => [...previous, createCompetitorInput()]);
  };

  const removeCompetitor = (id: string) => {
    setCompetitorInputs((previous) =>
      previous.length <= 1
        ? previous
        : previous.filter((input) => input.id !== id),
    );
  };

  const validCompetitorCount = competitorInputs.filter((input) =>
    input.url.trim(),
  ).length;
  const canCompare =
    sourceStoreUrl.trim().length > 0 && validCompetitorCount >= 1;

  const [handleRun, isRunning] = useAsyncAction(async () => {
    const source = sourceStoreUrl.trim();
    const competitors = competitorInputs
      .map((input) => input.url.trim())
      .filter(Boolean);

    if (!source || competitors.length < 1) return;

    setLines([]);
    setSearchParams(null);
    setPhase("running");
    setStores([
      {
        url: source,
        role: "source",
        status: "discovering",
        discovery: null,
        products: [],
        error: null,
      },
      ...competitors.map((url) => ({
        url,
        role: "competitor" as const,
        status: "discovering" as const,
        discovery: null,
        products: [] as z.infer<typeof productSchema>[],
        error: null,
      })),
    ]);

    const { stream } = await runStoreComparison({
      sourceStoreUrl: source,
      competitorStoreUrls: competitors,
      query: query.trim() || undefined,
      agentProfileUrl: "https://ecentic.ai/ucp/agent-profile",
    });

    let textBuffer = "";

    for await (const event of readStreamableValue(stream)) {
      if (!event) continue;

      switch (event.kind) {
        case "search_params": {
          setSearchParams(event.params);
          setLines((previous) => [...previous, event as ComparisonLine]);
          break;
        }
        case "store_profile": {
          setStores((previous) =>
            previous.map((store) =>
              store.url === event.storeUrl
                ? {
                    ...store,
                    status: "searching",
                    discovery: event.discovery,
                  }
                : store,
            ),
          );
          setLines((previous) => [...previous, event as ComparisonLine]);
          break;
        }
        case "store_searching": {
          setLines((previous) => [...previous, event as ComparisonLine]);
          break;
        }
        case "store_result": {
          const products = (event.result ?? []) as z.infer<
            typeof productSchema
          >[];
          setStores((previous) =>
            previous.map((store) =>
              store.url === event.storeUrl
                ? {
                    ...store,
                    status: "done",
                    products,
                  }
                : store,
            ),
          );
          setLines((previous) => [...previous, event as ComparisonLine]);
          break;
        }
        case "store_error": {
          setStores((previous) =>
            previous.map((store) =>
              store.url === event.storeUrl
                ? {
                    ...store,
                    status: "error",
                    error: event.message,
                  }
                : store,
            ),
          );
          setLines((previous) => [...previous, event as ComparisonLine]);
          break;
        }
        case "text": {
          textBuffer += event.text;
          if (/[.\n]/.test(event.text)) {
            const captured = textBuffer;
            textBuffer = "";
            flushText(captured, setLines);
          }
          break;
        }
        case "error": {
          if (textBuffer) {
            const captured = textBuffer;
            textBuffer = "";
            flushText(captured, setLines);
          }
          setLines((previous) => [...previous, event as ComparisonLine]);
          setPhase("error");
          break;
        }
        case "done": {
          if (textBuffer) {
            const captured = textBuffer;
            textBuffer = "";
            flushText(captured, setLines);
          }
          setLines((previous) => [...previous, { kind: "done" }]);
          setPhase("done");
          break;
        }
      }
    }

    if (textBuffer) {
      flushText(textBuffer, setLines);
    }
  });

  const summaryText = lines
    .filter(
      (line): line is Extract<ComparisonLine, { kind: "text" }> =>
        line.kind === "text",
    )
    .map((line) => line.text)
    .join("");

  return (
    <div className="flex flex-col">
      {/* Setup — inputs left, competitor list right, like the validator header */}
      <div className="grid lg:grid-cols-2">
        <div className="flex flex-col gap-6 px-6 py-6 sm:px-8 sm:py-8">
          <div>
            <label
              htmlFor="comparison-source"
              className="block font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]"
            >
              {translate("sourceStore.label")}
            </label>
            <TextField
              value={sourceStoreUrl}
              onValueChange={setSourceStoreUrl}
              className="mt-2"
            >
              <TextFieldInput
                id="comparison-source"
                placeholder={translate("sourceStore.placeholder")}
                className="font-mono"
              />
            </TextField>
            <p className="mt-2 font-light text-foreground-dimmed text-sm">
              {translate("sourceStore.description")}
            </p>
          </div>

          <div>
            <label
              htmlFor="comparison-query"
              className="block font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]"
            >
              {translate("buyerRequest.label")}
            </label>
            <TextField value={query} onValueChange={setQuery} className="mt-2">
              <TextFieldInput
                id="comparison-query"
                placeholder={translate("buyerRequest.placeholder")}
              />
            </TextField>
            <p className="mt-2 font-light text-foreground-dimmed text-sm">
              {translate("buyerRequest.description")}
            </p>
          </div>
        </div>

        <div className="border-accent-foreground border-t px-6 py-6 sm:px-8 sm:py-8 lg:border-t-0 lg:border-l">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
              {translate("competitors.label")}
            </span>
            <span className="font-mono text-[11px] text-foreground-dimmed tabular-nums">
              {validCompetitorCount}/5
            </span>
          </div>

          <div className="mt-2 space-y-2">
            {competitorInputs.map((input, index) => (
              <div key={input.id} className="flex items-center gap-2">
                <TextField
                  value={input.url}
                  onValueChange={(value) =>
                    updateCompetitorUrl(input.id, value)
                  }
                  className="flex-1"
                >
                  <TextFieldInput
                    placeholder={translate("competitors.placeholder", {
                      index: index + 1,
                    })}
                    className="font-mono"
                  />
                </TextField>
                <Button
                  variant="outline"
                  color="accent"
                  size="icon"
                  onClick={() => removeCompetitor(input.id)}
                  disabled={competitorInputs.length <= 1 || isRunning}
                  className="size-10 shrink-0"
                  aria-label={translate("competitors.removeAriaLabel", {
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
            onClick={addCompetitor}
            disabled={isRunning || competitorInputs.length >= 5}
            className="mt-2 w-full"
          >
            <PlusIcon className="size-4" />
            {translate("competitors.add")}
          </Button>
          <p className="mt-2 font-light text-foreground-dimmed text-sm">
            {translate("competitors.description")}
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-col gap-3 border-accent-foreground border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="font-light text-foreground-dimmed text-sm">
          {canCompare
            ? translate("hint.ready", {
                count: validCompetitorCount + 1,
              })
            : translate("hint.notReady")}
        </p>
        <Button
          color="primary"
          onClick={handleRun}
          disabled={isRunning || !canCompare}
          className="w-full shrink-0 sm:w-auto"
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <span className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {translate("action.running")}
            </span>
          ) : (
            translate("action.primary")
          )}
        </Button>
      </div>

      {searchParams !== null && (
        <div className="border-accent-foreground border-t">
          <div className="border-accent-foreground border-b bg-background-dimmed px-6 py-3 sm:px-8">
            <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
              {translate("searchParams.title")}
            </p>
            <p className="mt-1 font-light text-foreground-dimmed text-xs">
              {translate("searchParams.description")}
            </p>
          </div>
          <div className="space-y-3 px-6 py-4 sm:px-8">
            <ParamChips params={searchParams} />
            <details className="group">
              <summary className="w-fit cursor-pointer list-none font-medium text-foreground-dimmed text-xs hover:text-foreground [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">
                  {translate("searchParams.showRaw")}
                </span>
                <span className="hidden group-open:inline">
                  {translate("searchParams.hideRaw")}
                </span>
              </summary>
              <pre className="mt-2 overflow-auto border border-accent-foreground bg-background-dimmed p-4 font-mono text-foreground text-xs leading-relaxed">
                {JSON.stringify(searchParams, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}

      {/* Side-by-side results — one gap-px grid, your store first */}
      {stores.length > 0 && (
        <div className="border-accent-foreground border-t">
          <div className="border-accent-foreground border-b bg-background-dimmed px-6 py-3 sm:px-8">
            <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
              {translate("results.title")}
            </p>
            <p className="mt-1 font-light text-foreground-dimmed text-xs">
              {translate("results.description")}
            </p>
          </div>
          <div className="grid gap-px bg-accent-foreground md:grid-cols-2">
            {stores.map((store) => (
              <StoreCard key={store.url} store={store} />
            ))}
            {stores.length % 2 === 1 && (
              <div className="hidden bg-grid-stripes opacity-60 md:block" />
            )}
          </div>
        </div>
      )}

      {(summaryText || phase === "running") && (
        <div className="border-accent-foreground border-t">
          <div className="flex flex-wrap items-center gap-3 border-accent-foreground border-b bg-background-dimmed px-6 py-3 sm:px-8">
            <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
              {translate("summary.title")}
            </p>
            {phase === "running" && !summaryText && (
              <StatusPill tone="primary">
                {translate("summary.generating")}
              </StatusPill>
            )}
          </div>
          <div className="max-w-3xl whitespace-pre-wrap px-6 py-5 text-foreground text-sm leading-relaxed sm:px-8">
            {summaryText || (
              <span className="inline-block h-3 w-1.5 animate-pulse bg-primary/60" />
            )}
          </div>
        </div>
      )}

      {/* The event log re-narrates what the StoreCards already show, so it
          stays hidden until a run starts, collapses by default, and only
          auto-opens while a run streams. */}
      {(lines.length > 0 || phase !== "idle") && (
        <details
          open={phase === "running"}
          className="group border-accent-foreground border-t"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between bg-background-dimmed px-6 py-3 sm:px-8 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3">
              <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                {translate("eventLog.title")}
              </p>
              {phase === "running" && (
                <StatusPill tone="primary">
                  {translate("eventLog.live")}
                </StatusPill>
              )}
              {phase === "done" && (
                <StatusPill tone="success">
                  {translate("eventLog.done")}
                </StatusPill>
              )}
              {phase === "error" && (
                <StatusPill tone="error">
                  {translate("eventLog.error")}
                </StatusPill>
              )}
              <span className="text-foreground-dimmed text-xs tabular-nums">
                {translate("eventLog.events", { count: lines.length })}
              </span>
            </div>
            {lines.length > 0 && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setLines([]);
                  setStores([]);
                  setSearchParams(null);
                  setPhase("idle");
                }}
                className="font-medium text-foreground-dimmed text-xs hover:text-foreground"
              >
                {translate("eventLog.clear")}
              </button>
            )}
          </summary>

          <div
            ref={logRef}
            className="max-h-80 min-h-40 overflow-y-auto border-accent-foreground border-t px-6 py-4 font-mono text-xs sm:px-8"
          >
            <div className="space-y-1.5 text-xs">
              {lines.map((line) => {
                const lineKey = (() => {
                  switch (line.kind) {
                    case "search_params":
                      return "search-params";
                    case "store_profile":
                      return `profile-${line.storeUrl}`;
                    case "store_searching":
                      return `searching-${line.storeUrl}`;
                    case "store_result":
                      return `result-${line.storeUrl}`;
                    case "store_error":
                      return `error-${line.storeUrl}`;
                    case "error":
                      return `fatal-${line.message}`;
                    case "done":
                      return "done";
                    default:
                      return null;
                  }
                })();

                if (!lineKey) return null;

                switch (line.kind) {
                  case "search_params":
                    return (
                      <p key={lineKey} className="text-info">
                        search params → {summarise(line.params)}
                      </p>
                    );
                  case "store_profile":
                    return (
                      <p key={lineKey} className="text-primary">
                        profile resolved → {line.discovery.domain} (
                        {line.discovery.transport})
                      </p>
                    );
                  case "store_searching":
                    return (
                      <p key={lineKey} className="text-warning">
                        searching → {line.storeUrl}
                      </p>
                    );
                  case "store_result":
                    return (
                      <p key={lineKey} className="text-success">
                        results → {line.storeUrl} (
                        {
                          (line.result as z.infer<typeof productSchema>[])
                            .length
                        }{" "}
                        products)
                      </p>
                    );
                  case "store_error":
                    return (
                      <p key={lineKey} className="text-error">
                        error → {line.storeUrl}: {line.message}
                      </p>
                    );
                  case "text":
                    return null;
                  case "error":
                    return (
                      <p key={lineKey} className="text-error">
                        {line.message}
                      </p>
                    );
                  case "done":
                    return (
                      <p key={lineKey} className="text-primary">
                        {translate("eventLog.complete")}
                      </p>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          </div>
        </details>
      )}
    </div>
  );
};
