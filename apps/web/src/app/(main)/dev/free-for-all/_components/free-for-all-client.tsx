"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import { AwardIcon, PlusIcon, XCircleIcon } from "@zenncore/icons";
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
  type FreeForAllEvent,
  runFreeForAll,
  type WinnerSelection,
} from "@/server/app/intelligence/free-for-all";
import type { StoreDiscovery } from "@/server/app/intelligence/product-comparison";
import type { productSchema } from "@/server/app/intelligence/ucp-advanced-validator";
import { StatusPill } from "../../../dashboard/_components/grid";

type FreeForAllLine = Exclude<FreeForAllEvent, { kind: "text" }>;

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

const productPrice = (
  product: z.infer<typeof productSchema>,
): number | undefined => {
  if (product.variants.length > 0) {
    return product.variants[0]?.price.amount;
  }

  return product.price_range.min.amount;
};

const flushText = (
  buffer: string,
  setter: Dispatch<SetStateAction<string>>,
) => {
  if (!buffer) return;
  setter((previous) => previous + buffer);
};

const StoreCard = ({
  store,
  isWinner,
}: {
  store: StoreState;
  isWinner: boolean;
}) => (
  <div
    className={cn(
      "rounded-lg border bg-background-rich",
      isWinner
        ? "border-success/50 ring-1 ring-success/30"
        : "border-accent-foreground",
    )}
  >
    <div className="border-accent-foreground border-b px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {isWinner && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 font-semibold text-[11px] text-success uppercase tracking-[0.05em]">
            <AwardIcon className="size-3" />
            Picked
          </span>
        )}
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

      {/* {store.products.length > 0 && (
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
      )} */}

      {(store.status === "discovering" || store.status === "searching") && (
        <span className="inline-block h-3 w-1.5 animate-pulse bg-primary/60" />
      )}
    </div>
  </div>
);

const WinnerCard = ({ winner }: { winner: WinnerSelection }) => (
  <div className="rounded-lg border border-success/50 bg-success/5">
    <div className="flex items-center gap-2 border-success/30 border-b px-4 py-3">
      <AwardIcon className="size-4 text-success" />
      <p className="font-semibold text-[10px] text-success uppercase tracking-[0.08em]">
        Agent's Pick
      </p>
    </div>
    <div className="space-y-3 px-4 py-4">
      <div>
        <p className="font-semibold text-base text-foreground-rich">
          {winner.product_title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-foreground-dimmed text-sm">
          <span className="font-mono">{winner.store_domain}</span>
          {winner.price && (
            <span className="rounded bg-background-dimmed px-1.5 py-0.5 font-mono text-foreground text-xs">
              {winner.price}
            </span>
          )}
        </p>
      </div>
      <div>
        <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
          Why it won
        </p>
        <p className="mt-1 text-foreground text-sm">{winner.reason}</p>
      </div>
      {winner.runner_up && (
        <div>
          <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            Closest runner-up
          </p>
          <p className="mt-1 text-foreground-dimmed text-sm">
            {winner.runner_up}
          </p>
        </div>
      )}
      <p className="font-mono text-[10px] text-foreground-dimmed/60">
        {winner.product_id}
      </p>
    </div>
  </div>
);

type StoreInput = {
  id: string;
  url: string;
};

const MAX_STORES = 8;

// Accepts bare domains ("x.com") and full URLs ("https://x.com/"), returning a
// canonical "https://x.com". Kept in sync with the server normalizer so the
// store keys emitted by the stream match the inputs rendered here.
const normalizeStoreUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, "");
};

const createStoreInput = (url = ""): StoreInput => ({
  id: crypto.randomUUID(),
  url,
});

export const FreeForAllClient = () => {
  const [storeInputs, setStoreInputs] = useState<StoreInput[]>([
    createStoreInput(),
    createStoreInput(),
  ]);
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<FreeForAllLine[]>([]);
  const [verdict, setVerdict] = useState("");
  const [stores, setStores] = useState<StoreState[]>([]);
  const [searchParams, setSearchParams] = useState<unknown>(null);
  const [winner, setWinner] = useState<WinnerSelection | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  });

  const updateStoreUrl = (id: string, value: string) => {
    if (!value.includes(",")) {
      setStoreInputs((previous) =>
        previous.map((input) =>
          input.id === id ? { ...input, url: value } : input,
        ),
      );
      return;
    }

    // Pasting a comma-separated list expands into one input per link.
    const [first = "", ...rest] = value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    setStoreInputs((previous) => {
      const index = previous.findIndex((input) => input.id === id);
      const current = previous[index];
      if (!current) return previous;

      const expanded = [
        ...previous.slice(0, index),
        { ...current, url: first },
        ...rest.map((url) => createStoreInput(url)),
        ...previous.slice(index + 1),
      ];

      return expanded.slice(0, MAX_STORES);
    });
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

  const normalizedStoreUrls = [
    ...new Set(
      storeInputs.map((input) => normalizeStoreUrl(input.url)).filter(Boolean),
    ),
  ];
  const canRun = normalizedStoreUrls.length >= 2;

  const reset = () => {
    setLines([]);
    setVerdict("");
    setStores([]);
    setSearchParams(null);
    setWinner(null);
    setPhase("idle");
  };

  const [handleRun, isRunning] = useAsyncAction(async () => {
    const storeUrls = [
      ...new Set(
        storeInputs
          .map((input) => normalizeStoreUrl(input.url))
          .filter(Boolean),
      ),
    ];

    if (storeUrls.length < 2) return;

    setLines([]);
    setVerdict("");
    setSearchParams(null);
    setWinner(null);
    setPhase("running");
    setStores(
      storeUrls.map((url) => ({
        url,
        status: "discovering" as const,
        discovery: null,
        products: [] as z.infer<typeof productSchema>[],
        error: null,
      })),
    );

    const { stream } = await runFreeForAll({
      storeUrls,
      query: query.trim() || undefined,
      agentProfileUrl: "https://ecentic.ai/ucp/agent-profile",
    });

    for await (const event of readStreamableValue(stream)) {
      if (!event) continue;

      switch (event.kind) {
        case "search_params": {
          setSearchParams(event.params);
          setLines((previous) => [...previous, event]);
          break;
        }
        case "store_profile": {
          setStores((previous) =>
            previous.map((store) =>
              store.url === event.storeUrl
                ? { ...store, status: "searching", discovery: event.discovery }
                : store,
            ),
          );
          setLines((previous) => [...previous, event]);
          break;
        }
        case "store_searching": {
          setLines((previous) => [...previous, event]);
          break;
        }
        case "store_result": {
          const products = (event.result ?? []) as z.infer<
            typeof productSchema
          >[];
          setStores((previous) =>
            previous.map((store) =>
              store.url === event.storeUrl
                ? { ...store, status: "done", products }
                : store,
            ),
          );
          setLines((previous) => [...previous, event]);
          break;
        }
        case "store_error": {
          setStores((previous) =>
            previous.map((store) =>
              store.url === event.storeUrl
                ? { ...store, status: "error", error: event.message }
                : store,
            ),
          );
          setLines((previous) => [...previous, event]);
          break;
        }
        case "winner": {
          setWinner(event.winner);
          setLines((previous) => [...previous, event]);
          break;
        }
        case "text": {
          flushText(event.text, setVerdict);
          break;
        }
        case "error": {
          setLines((previous) => [...previous, event]);
          setPhase("error");
          break;
        }
        case "done": {
          setLines((previous) => [...previous, { kind: "done" }]);
          setPhase("done");
          break;
        }
      }
    }
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-accent-foreground bg-background-rich">
        <div className="border-accent-foreground border-b px-4 py-3">
          <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            Stores in the ring
          </p>
          <p className="mt-1.5 text-foreground-dimmed text-sm">
            Add two or more store domains as equal candidates. Paste a
            comma-separated list to add several at once, and bare domains like{" "}
            <span className="font-mono">x.com</span> work as well as{" "}
            <span className="font-mono">https://x.com</span>. Each{" "}
            <span className="font-mono">/.well-known/ucp</span> profile is
            resolved, then <span className="font-mono">search_catalog</span>{" "}
            runs on every store with the same derived parameters.
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
              color="neutral"
              onClick={addStore}
              disabled={isRunning || storeInputs.length >= MAX_STORES}
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
              color="primary"
              onClick={handleRun}
              disabled={isRunning || !canRun}
              className="shrink-0 px-5 py-1.5 text-sm"
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deciding…
                </span>
              ) : (
                "Run free-for-all"
              )}
            </Button>
          </div>
        </div>
      </div>

      {winner && <WinnerCard winner={winner} />}

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
        <div>
          <p className="mb-2 font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            Store catalogs
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {stores.map((store) => (
              <StoreCard
                key={store.url}
                store={store}
                isWinner={
                  winner !== null &&
                  store.discovery?.domain === winner.store_domain
                }
              />
            ))}
          </div>
        </div>
      )}

      {(verdict || phase === "running") && (
        <div className="rounded-lg border border-accent-foreground bg-background-rich">
          <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                Decision Rationale
              </p>
              {phase === "running" && !verdict && (
                <StatusPill tone="primary">Generating</StatusPill>
              )}
            </div>
          </div>
          <div className="m-4 rounded-md bg-background-dimmed p-4 font-mono text-foreground text-xs leading-relaxed">
            {verdict || (
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
              onClick={reset}
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
              Add two or more stores, then press{" "}
              <span className="font-medium text-foreground-dimmed">
                Run free-for-all
              </span>{" "}
              to fetch UCP profiles, search every catalog, and let the agent
              pick one winner.
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
                    case "winner":
                      return `winner-${line.winner.product_id}`;
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
                  case "winner":
                    return (
                      <p key={lineKey} className="text-success">
                        ✓ picked → {line.winner.product_title} @{" "}
                        {line.winner.store_domain}
                      </p>
                    );
                  case "error":
                    return (
                      <p key={lineKey} className="text-error">
                        {line.message}
                      </p>
                    );
                  case "done":
                    return (
                      <p key={lineKey} className="text-primary">
                        ✓ decision complete
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
