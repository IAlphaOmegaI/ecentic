"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import { PlusIcon, XCircleIcon } from "@zenncore/icons";
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
import type z from "zod";
import {
  runStoreComparison,
  type StoreDiscovery,
} from "@/server/app/intelligence/product-comparison";
import type { productSchema } from "@/server/app/intelligence/ucp/advanced-validator";
import { StatusPill } from "../../_components/grid";

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

const productPrice = (product: z.infer<typeof productSchema>) => {
  if (product.variants.length > 0) {
    return product.variants[0]?.price.amount;
  }

  return product.price_range.min;
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

const StoreCard = ({ store }: { store: StoreState }) => (
  <div
    className={cn(
      "rounded-lg border bg-background-rich",
      store.role === "source"
        ? "border-primary/40"
        : "border-accent-foreground",
    )}
  >
    <div className="border-accent-foreground border-b px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-semibold text-[11px] uppercase tracking-[0.05em]",
            store.role === "source"
              ? "bg-primary/10 text-primary"
              : "bg-background-dimmed text-foreground-dimmed",
          )}
        >
          {store.role === "source" ? "Your store" : "Competitor"}
        </span>
        <p className="font-medium text-foreground text-sm">
          {store.discovery?.domain ?? store.url}
        </p>
        {store.discovery && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-semibold text-[11px] uppercase tracking-[0.05em]",
              store.discovery.transport === "mcp"
                ? "bg-primary/10 text-primary"
                : "bg-warning/10 text-warning",
            )}
          >
            {store.discovery.transport}
          </span>
        )}
        <StatusPill
          tone={(() => {
            switch (true) {
              case store.status === "done":
                return "success";
              case store.status === "error":
                return "error";
              case store.status === "discovering" ||
                store.status === "searching":
                return "primary";
              default:
                return "neutral";
            }
          })()}
        >
          {store.status}
        </StatusPill>
      </div>
      {store.discovery?.endpoint && (
        <p className="mt-1 font-mono text-foreground-dimmed text-xs">
          {store.discovery.endpoint}
        </p>
      )}
    </div>

    <div className="p-4">
      {store.error && (
        <p className="font-mono text-error text-xs">{store.error}</p>
      )}

      {!store.error &&
        store.products.length === 0 &&
        store.status === "done" && (
          <p className="font-light text-foreground-dimmed text-xs">
            No products returned for this search.
          </p>
        )}

      {store.products.length > 0 && (
        <ul className="space-y-2">
          {store.products.slice(0, 8).map((product) => (
            <li
              key={product.id}
              className="border-accent-foreground/40 border-b pb-2 last:border-0 last:pb-0"
            >
              <p className="font-medium text-foreground text-sm">
                {product.title}
              </p>
              {productPrice(product) && (
                <p className="mt-0.5 font-mono text-foreground-dimmed text-xs">
                  {productPrice(product)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {(store.status === "discovering" || store.status === "searching") && (
        <span className="inline-block h-3 w-1.5 animate-pulse bg-primary/60" />
      )}
    </div>
  </div>
);

type CompetitorInput = {
  id: string;
  url: string;
};

const createCompetitorInput = (url = ""): CompetitorInput => ({
  id: crypto.randomUUID(),
  url,
});

export const ComparisonClient = () => {
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

  const sourceStore = stores.find((store) => store.role === "source");
  const competitorStores = stores.filter(
    (store) => store.role === "competitor",
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-accent-foreground bg-background-rich">
        <div className="border-accent-foreground border-b px-4 py-3">
          <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            Your store
          </p>
          <p className="mt-1.5 text-foreground-dimmed text-sm">
            The merchant catalog you want to evaluate against competitors.
          </p>
        </div>
        <div className="px-4 py-3">
          <TextField
            value={sourceStoreUrl}
            onValueChange={setSourceStoreUrl}
            className="h-9 border-primary/30 bg-background-dimmed"
          >
            <TextFieldInput
              placeholder="https://your-store.example.com"
              className="px-3 font-mono text-sm"
            />
          </TextField>
        </div>
      </div>

      <div className="rounded-lg border border-accent-foreground bg-background-rich">
        <div className="border-accent-foreground border-b px-4 py-3">
          <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            Competitor stores
          </p>
          <p className="mt-1.5 text-foreground-dimmed text-sm">
            Add one or more competitor domains. Each{" "}
            <span className="font-mono">/.well-known/ucp</span> profile is
            resolved, then <span className="font-mono">search_catalog</span>{" "}
            runs with the same derived parameters as your store.
          </p>
        </div>

        <div className="space-y-2 px-4 py-3">
          {competitorInputs.map((input, index) => (
            <div
              key={input.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <TextField
                value={input.url}
                onValueChange={(value) => updateCompetitorUrl(input.id, value)}
                className="h-8 flex-1 border border-accent-foreground bg-background-dimmed"
              >
                <TextFieldInput
                  placeholder={`https://competitor-${index + 1}.example.com`}
                  className="px-3 font-mono text-sm"
                />
              </TextField>
              <Button
                color="neutral"
                onClick={() => removeCompetitor(input.id)}
                disabled={competitorInputs.length <= 1 || isRunning}
                className="shrink-0 px-3 py-1.5 text-sm"
              >
                <XCircleIcon className="size-4" />
              </Button>
            </div>
          ))}

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <Button
              color="neutral"
              onClick={addCompetitor}
              disabled={isRunning || competitorInputs.length >= 5}
              className="shrink-0 px-4 py-1.5 text-sm"
            >
              <PlusIcon className="size-4" />
              Add competitor
            </Button>

            <TextField
              value={query}
              onValueChange={setQuery}
              className="h-8 flex-1 border border-accent-foreground bg-background-dimmed"
            >
              <TextFieldInput
                placeholder='Buyer request (e.g. "wireless mouse under 200 ALL")'
                className="px-3 text-sm"
              />
            </TextField>

            <Button
              color="primary"
              onClick={handleRun}
              disabled={isRunning || !canCompare}
              className="shrink-0 px-5 py-1.5 text-sm"
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Comparing…
                </span>
              ) : (
                "Compare"
              )}
            </Button>
          </div>
        </div>
      </div>

      {searchParams !== null && (
        <div className="rounded-lg border border-accent-foreground bg-background-rich">
          <div className="border-accent-foreground border-b px-4 py-3">
            <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
              Derived Search Parameters
            </p>
            <p className="mt-1.5 text-foreground-dimmed text-sm">
              Parsed once from the buyer request and applied to every store.
            </p>
          </div>
          <pre className="m-4 overflow-auto rounded-md bg-background-dimmed p-4 font-mono text-foreground text-xs leading-relaxed">
            {JSON.stringify(searchParams, null, 2)}
          </pre>
        </div>
      )}

      {stores.length > 0 && (
        <div className="space-y-4">
          {sourceStore && (
            <div>
              <p className="mb-2 font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                Your store results
              </p>
              <StoreCard store={sourceStore} />
            </div>
          )}
          {competitorStores.length > 0 && (
            <div>
              <p className="mb-2 font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                Competitor results
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                {competitorStores.map((store) => (
                  <StoreCard key={store.url} store={store} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(summaryText || phase === "running") && (
        <div className="rounded-lg border border-accent-foreground bg-background-rich">
          <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                Comparison Summary
              </p>
              {phase === "running" && !summaryText && (
                <StatusPill tone="primary">Generating</StatusPill>
              )}
            </div>
          </div>
          <div className="m-4 rounded-md bg-background-dimmed p-4 font-mono text-foreground text-xs leading-relaxed">
            {summaryText || (
              <span className="inline-block h-3 w-1.5 animate-pulse bg-primary/60" />
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-accent-foreground bg-background-rich">
        <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
              Event Log
            </p>
            {phase === "running" && (
              <StatusPill tone="primary">Live</StatusPill>
            )}
            {phase === "done" && <StatusPill tone="success">Done</StatusPill>}
            {phase === "error" && <StatusPill tone="error">Error</StatusPill>}
          </div>
          {lines.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setLines([]);
                setStores([]);
                setSearchParams(null);
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
          className="m-4 max-h-80 min-h-40 overflow-y-auto rounded-md bg-background-dimmed p-4 font-mono text-xs"
        >
          {lines.length === 0 ? (
            <p className="font-light text-foreground-dimmed/50 text-xs">
              Add your store and at least one competitor, then press{" "}
              <span className="font-medium text-foreground-dimmed">
                Compare
              </span>{" "}
              to fetch UCP profiles and search each catalog.
            </p>
          ) : (
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
                        ✓ comparison complete
                      </p>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
