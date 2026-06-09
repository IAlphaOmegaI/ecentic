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
  extractCatalogProducts,
  runStoreComparison,
  type StoreDiscovery,
} from "@/server/app/intelligence/product-comparison";
import type { productSchema } from "@/server/app/intelligence/ucp-advanced-validator";

type ComparisonLine =
  | { kind: "search_params"; params: unknown }
  | { kind: "store_profile"; storeUrl: string; discovery: StoreDiscovery }
  | { kind: "store_searching"; storeUrl: string }
  | { kind: "store_result"; storeUrl: string; result: unknown }
  | { kind: "store_error"; storeUrl: string; message: string }
  | { kind: "text"; text: string }
  | { kind: "error"; message: string }
  | { kind: "done" };

type StoreState = {
  url: string;
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
    return product.variants[0]!.price.amount;
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
  <div className="border border-accent-foreground bg-background">
    <div className="border-accent-foreground border-b px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-foreground text-sm">
          {store.discovery?.domain ?? store.url}
        </p>
        {store.discovery && (
          <span
            className={cn(
              "px-1.5 py-0.5 font-mono text-xs uppercase",
              store.discovery.transport === "mcp"
                ? "bg-primary/15 text-primary"
                : "bg-warning/15 text-warning",
            )}
          >
            {store.discovery.transport}
          </span>
        )}
        <span
          className={cn(
            "px-1.5 py-0.5 font-medium text-xs",
            store.status === "done" && "bg-success/10 text-success",
            store.status === "error" && "bg-error/10 text-error",
            (store.status === "discovering" || store.status === "searching") &&
              "bg-primary/10 text-primary",
            store.status === "idle" &&
              "bg-accent-foreground/10 text-foreground-dimmed",
          )}
        >
          {store.status}
        </span>
      </div>
      {store.discovery?.endpoint && (
        <p className="mt-1 font-mono text-foreground-dimmed/70 text-xs">
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

type StoreInput = {
  id: string;
  url: string;
};

const createStoreInput = (url = ""): StoreInput => ({
  id: crypto.randomUUID(),
  url,
});

export const ComparisonClient = () => {
  const [storeInputs, setStoreInputs] = useState<StoreInput[]>([
    createStoreInput(),
    createStoreInput(),
  ]);
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<ComparisonLine[]>([]);
  const [stores, setStores] = useState<StoreState[]>([]);
  const [searchParams, setSearchParams] = useState<unknown>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  console.log("stores", stores);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  });

  const updateStoreUrl = (id: string, value: string) => {
    setStoreInputs((previous) =>
      previous.map((input) =>
        input.id === id ? { ...input, url: value } : input,
      ),
    );
  };

  const addStore = () => {
    setStoreInputs((previous) => [...previous, createStoreInput()]);
  };

  const removeStore = (id: string) => {
    setStoreInputs((previous) =>
      previous.length <= 2
        ? previous
        : previous.filter((input) => input.id !== id),
    );
  };

  const validStoreCount = storeInputs.filter((input) =>
    input.url.trim(),
  ).length;

  const [handleRun, isRunning] = useAsyncAction(async () => {
    const urls = storeInputs.map((input) => input.url.trim()).filter(Boolean);
    if (urls.length < 2) return;

    setLines([]);
    setSearchParams(null);
    setPhase("running");
    setStores(
      urls.map((url) => ({
        url,
        status: "discovering",
        discovery: null,
        products: [],
        error: null,
      })),
    );

    const { stream } = await runStoreComparison({
      storeUrls: urls,
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
          setStores((previous) =>
            previous.map((store) =>
              store.url === event.storeUrl
                ? {
                    ...store,
                    status: "done",
                    products: event.result,
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
    <div className="space-y-4">
      <div className="border border-accent-foreground bg-background">
        <div className="border-accent-foreground border-b px-4 py-2.5">
          <p className="font-medium text-base text-foreground">Stores</p>
          <p className="mt-0.5 font-light text-foreground-dimmed text-xs">
            Add two or more store domains. Each{" "}
            <span className="font-mono">/.well-known/ucp</span> profile is
            resolved, then <span className="font-mono">search_catalog</span>{" "}
            runs with the same derived parameters.
          </p>
        </div>

        <div className="space-y-2 px-4 py-3">
          {storeInputs.map((input, index) => (
            <div
              key={input.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <TextField
                value={input.url}
                onValueChange={(value) => updateStoreUrl(input.id, value)}
                className="h-8 flex-1 border border-accent-foreground bg-background-dimmed"
              >
                <TextFieldInput
                  placeholder={`https://store-${index + 1}.example.com`}
                  className="px-3 font-mono text-sm"
                />
              </TextField>
              <Button
                variant="soft"
                color="neutral"
                onClick={() => removeStore(input.id)}
                disabled={storeInputs.length <= 2 || isRunning}
                className="shrink-0 px-3 py-1.5 text-sm"
              >
                <XCircleIcon className="size-4" />
              </Button>
            </div>
          ))}

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <Button
              variant="soft"
              color="neutral"
              onClick={addStore}
              disabled={isRunning || storeInputs.length >= 6}
              className="shrink-0 px-4 py-1.5 text-sm"
            >
              <PlusIcon className="size-4" />
              Add store
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
              variant="flat"
              color="primary"
              onClick={handleRun}
              disabled={isRunning || validStoreCount < 2}
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
        <div className="border border-accent-foreground bg-background">
          <div className="border-accent-foreground border-b px-4 py-2.5">
            <p className="font-medium text-base text-foreground">
              Derived search parameters
            </p>
            <p className="mt-0.5 font-light text-foreground-dimmed text-xs">
              Parsed once from the buyer request and applied to every store.
            </p>
          </div>
          <pre className="overflow-auto p-4 font-mono text-foreground/80 text-xs leading-relaxed">
            {JSON.stringify(searchParams, null, 2)}
          </pre>
        </div>
      )}

      {stores.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {stores.map((store) => (
            <StoreCard key={store.url} store={store} />
          ))}
        </div>
      )}

      {(summaryText || phase === "running") && (
        <div className="border border-accent-foreground bg-background">
          <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-2.5">
            <div className="flex items-center gap-2">
              <p className="font-medium text-base text-foreground">
                Comparison summary
              </p>
              {phase === "running" && !summaryText && (
                <span className="bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                  generating
                </span>
              )}
            </div>
          </div>
          <div className="p-4 font-mono text-foreground/80 text-sm leading-relaxed">
            {summaryText || (
              <span className="inline-block h-3 w-1.5 animate-pulse bg-primary/60" />
            )}
          </div>
        </div>
      )}

      <div className="border border-accent-foreground bg-background">
        <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-2.5">
          <div className="flex items-center gap-2">
            <p className="font-medium text-base text-foreground">Event log</p>
            {phase === "running" && (
              <span className="bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                live
              </span>
            )}
            {phase === "done" && (
              <span className="bg-success/10 px-2 py-0.5 font-medium text-success text-xs">
                done
              </span>
            )}
            {phase === "error" && (
              <span className="bg-error/10 px-2 py-0.5 font-medium text-error text-xs">
                error
              </span>
            )}
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
          className="max-h-80 min-h-32 overflow-y-auto p-4 font-mono"
        >
          {lines.length === 0 ? (
            <p className="font-light text-foreground-dimmed/50 text-xs">
              Add store URLs and press{" "}
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
                      <p key={lineKey} className="text-blue-400">
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
                      <p key={lineKey} className="text-amber-400">
                        searching → {line.storeUrl}
                      </p>
                    );
                  case "store_result":
                    return (
                      <p key={lineKey} className="text-success">
                        results → {line.storeUrl} (
                        {extractCatalogProducts(line.result).length} products)
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
