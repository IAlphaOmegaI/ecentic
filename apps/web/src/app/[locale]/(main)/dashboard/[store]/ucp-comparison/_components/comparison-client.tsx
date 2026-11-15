"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import { AlertCircleIcon, GlobeIcon, SearchIcon } from "@zenncore/icons";
import { cn, resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@zenncore/web/components/collapsible";
import { useToastManager } from "@zenncore/web/components/toast";
import { useLocale, useTranslations } from "next-intl";
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
import { type ComparisonRequest, ComparisonSetup } from "./comparison-setup";

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
const formatMoney = (
  money: z.infer<typeof priceSchema>,
  locale: string,
): string => {
  const value = money.amount / 100;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: money.currency,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${money.currency}`;
  }
};

const productPrice = (
  product: z.infer<typeof productSchema>,
  locale: string,
): string => {
  const money = product.variants[0]?.price ?? product.price_range.min;
  return formatMoney(money, locale);
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
          <span className="font-medium text-foreground-dimmed text-sm">
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
  const locale = useLocale();

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
          <GlobeIcon
            aria-hidden
            className="size-4 shrink-0 text-foreground-dimmed"
          />
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
          <div className="flex items-start gap-3 p-4 text-sm">
            <AlertCircleIcon
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-error"
            />
            <p className="text-foreground-dimmed">
              {translate("workbench.failure.store")}
            </p>
          </div>
        )}

        {!store.error &&
          store.products.length === 0 &&
          store.status === "done" && (
            <p className="px-4 py-4 font-normal text-foreground-dimmed text-sm">
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
                <span className="w-5 shrink-0 text-foreground-dimmed text-xs tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="min-w-0 flex-1 truncate font-medium text-foreground text-sm">
                  {product.title}
                </p>
                <span className="shrink-0 text-foreground-dimmed text-xs tabular-nums">
                  {productPrice(product, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {store.products.length > 8 && (
          <p className="border-accent-foreground border-t px-4 py-2 text-foreground-dimmed text-xs">
            {translate("results.moreHidden", {
              count: String(store.products.length - 8),
            })}
          </p>
        )}

        {isLoading && (
          <div className="space-y-2 px-4 py-4 motion-reduce:[&_*]:animate-none">
            <div className="h-3 w-3/4 animate-pulse bg-accent-foreground/40 motion-reduce:animate-none" />
            <div className="h-3 w-1/2 animate-pulse bg-accent-foreground/30 motion-reduce:animate-none" />
            <div className="h-3 w-2/3 animate-pulse bg-accent-foreground/20 motion-reduce:animate-none" />
          </div>
        )}
      </div>
    </div>
  );
};

export const ComparisonClient = ({
  initialSourceStore = "",
}: {
  initialSourceStore?: string;
}) => {
  const translate = useTranslations("dashboard.ucpComparison");
  const toast = useToastManager();
  const [lines, setLines] = useState<ComparisonLine[]>([]);
  const [stores, setStores] = useState<StoreState[]>([]);
  const [searchParams, setSearchParams] = useState<unknown>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  });

  const [handleRun, isRunning] = useAsyncAction(
    async ({
      sourceStoreUrl: source,
      competitorStoreUrls: competitors,
      query,
    }: ComparisonRequest) => {
      setLines([]);
      setSearchParams(null);
      setPhase("running");
      setLogOpen(false);
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

      const execution = await resultify(() =>
        runStoreComparison({
          sourceStoreUrl: source,
          competitorStoreUrls: competitors,
          query,
          agentProfileUrl: "https://ecentic.ai/ucp/agent-profile",
        }),
      );
      if (!execution.success) {
        setPhase("error");
        setStores((previous) =>
          previous.map((store) => ({
            ...store,
            status: "error",
            error: "connection",
          })),
        );
        toast.add({
          type: "error",
          title: translate("workbench.failure.title"),
          description: translate("workbench.failure.description"),
        });
        return;
      }
      const { stream } = execution.data;

      const progress = { complete: false, failed: false, textBuffer: "" };
      const pendingStores = new Set([source, ...competitors]);

      const streamed = await resultify(async () => {
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
              pendingStores.delete(event.storeUrl);
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
              pendingStores.delete(event.storeUrl);
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
              progress.textBuffer += event.text;
              if (/[.\n]/.test(event.text)) {
                const captured = progress.textBuffer;
                progress.textBuffer = "";
                flushText(captured, setLines);
              }
              break;
            }
            case "error": {
              progress.failed = true;
              if (progress.textBuffer) {
                const captured = progress.textBuffer;
                progress.textBuffer = "";
                flushText(captured, setLines);
              }
              setLines((previous) => [...previous, event as ComparisonLine]);
              setPhase("error");
              toast.add({
                type: "error",
                title: translate("workbench.failure.title"),
                description: translate("workbench.failure.description"),
              });
              break;
            }
            case "done": {
              progress.complete = true;
              if (progress.textBuffer) {
                const captured = progress.textBuffer;
                progress.textBuffer = "";
                flushText(captured, setLines);
              }
              setLines((previous) => [...previous, { kind: "done" }]);
              setPhase((previous) => (previous === "error" ? "error" : "done"));
              break;
            }
          }
        }
      });
      const interrupted =
        !streamed.success || !progress.complete || pendingStores.size > 0;
      if (interrupted) {
        setPhase("error");
        setStores((previous) =>
          previous.map((store) =>
            store.status === "discovering" || store.status === "searching"
              ? { ...store, status: "error", error: "connection" }
              : store,
          ),
        );
        if (!progress.failed)
          toast.add({
            type: "error",
            title: translate("workbench.failure.title"),
            description: translate("workbench.failure.description"),
          });
      }
      if (progress.textBuffer) {
        flushText(progress.textBuffer, setLines);
      }
    },
  );

  const summaryText = lines
    .filter(
      (line): line is Extract<ComparisonLine, { kind: "text" }> =>
        line.kind === "text",
    )
    .map((line) => line.text)
    .join("");

  return (
    <div className="flex flex-col">
      <ComparisonSetup
        initialSourceStore={initialSourceStore}
        isRunning={isRunning}
        onRun={handleRun}
      />

      {searchParams !== null && (
        <div className="border-accent-foreground border-t">
          <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3 sm:px-6">
            <p className="font-medium text-foreground-dimmed text-sm">
              {translate("searchParams.title")}
            </p>
            <p className="mt-1 font-normal text-foreground-dimmed text-xs">
              {translate("searchParams.description")}
            </p>
          </div>
          <div className="space-y-3 px-4 py-4 sm:px-6">
            <ParamChips params={searchParams} />
            <Collapsible className="group w-full min-w-0">
              <CollapsibleTrigger className="w-fit font-medium text-foreground-dimmed text-xs hover:text-foreground">
                {translate("searchParams.showRaw")}
              </CollapsibleTrigger>
              <CollapsiblePanel className="bg-transparent duration-200 motion-reduce:transition-none">
                <pre className="mt-2 overflow-auto border border-accent-foreground bg-background-dimmed p-4 font-mono text-foreground text-xs leading-relaxed">
                  {JSON.stringify(searchParams, null, 2)}
                </pre>
              </CollapsiblePanel>
            </Collapsible>
          </div>
        </div>
      )}

      {/* Side-by-side results — one gap-px grid, your store first */}
      {stores.length > 0 && (
        <div className="border-accent-foreground border-t">
          <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3 sm:px-6">
            <h2 className="flex items-center gap-2 font-medium text-foreground-rich text-lg">
              <SearchIcon aria-hidden className="size-4" />
              {translate("results.title")}
            </h2>
            <p className="mt-1 font-normal text-foreground-dimmed text-xs">
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

      {summaryText && (
        <div className="border-accent-foreground border-t">
          <div className="flex flex-wrap items-center gap-3 border-accent-foreground border-b bg-background-dimmed px-4 py-3 sm:px-6">
            <p className="font-medium text-foreground-dimmed text-sm">
              {translate("summary.title")}
            </p>
            {phase === "running" && (
              <StatusPill tone="primary">
                {translate("summary.generating")}
              </StatusPill>
            )}
          </div>
          <div className="max-w-3xl whitespace-pre-wrap px-6 py-5 text-foreground text-sm leading-relaxed sm:px-6">
            {summaryText}
          </div>
        </div>
      )}

      {/* Keep diagnostic detail available without repeating the result panels. */}
      {(lines.length > 0 || phase !== "idle") && (
        <Collapsible
          open={logOpen}
          onOpenChange={setLogOpen}
          className="group border-accent-foreground border-t"
        >
          <div className="flex items-center justify-between border-accent-foreground border-b bg-background px-4 py-3 sm:px-6">
            <CollapsibleTrigger className="flex flex-1 items-center text-left">
              <div className="flex items-center gap-3">
                <p className="font-medium text-foreground-dimmed text-sm">
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
            </CollapsibleTrigger>
            {lines.length > 0 && (
              <Button
                variant="soft"
                color="neutral"
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
              </Button>
            )}
          </div>
          <CollapsiblePanel className="bg-transparent duration-200 motion-reduce:transition-none">
            <div
              ref={logRef}
              className="max-h-80 min-h-40 overflow-y-auto px-6 py-4 font-mono text-xs sm:px-6"
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
                          {translate("workbench.log.parameters")} →{" "}
                          {summarise(line.params)}
                        </p>
                      );
                    case "store_profile":
                      return (
                        <p key={lineKey} className="text-primary">
                          {translate("workbench.log.profile")} →{" "}
                          {line.discovery.domain} ({line.discovery.transport})
                        </p>
                      );
                    case "store_searching":
                      return (
                        <p key={lineKey} className="text-warning">
                          {translate("workbench.log.searching")} →{" "}
                          {line.storeUrl}
                        </p>
                      );
                    case "store_result":
                      return (
                        <p key={lineKey} className="text-success">
                          {translate("workbench.log.results", {
                            count: (
                              line.result as z.infer<typeof productSchema>[]
                            ).length,
                          })}{" "}
                          → {line.storeUrl}
                        </p>
                      );
                    case "store_error":
                      return (
                        <p key={lineKey} className="text-error">
                          {line.storeUrl}:{" "}
                          {translate("workbench.failure.store")}
                        </p>
                      );
                    case "text":
                      return null;
                    case "error":
                      return (
                        <p key={lineKey} className="text-error">
                          {translate("workbench.failure.description")}
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
          </CollapsiblePanel>
        </Collapsible>
      )}
    </div>
  );
};
