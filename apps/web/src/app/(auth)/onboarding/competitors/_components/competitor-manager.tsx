"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  LoaderIcon,
  XIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import { useToastManager } from "@zenncore/web/components/toast";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { AnimatePresence, motion } from "motion/react";
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Motion } from "@/components/motion";
import { Spring } from "@/lib/animations";
import * as Competitor from "@/server/app/competitor";
import { scrapeUrls } from "@/server/app/intelligence/scrape";
import { searchCompetitors } from "@/server/app/intelligence/search";

const formatPrice = (price: string | null, currency: string | null): string => {
  if (!price) return "\u2014";

  const symbol = (() => {
    switch (currency?.toUpperCase()) {
      case "EUR":
        return "\u20AC";
      case "GBP":
        return "\u00A3";
      default:
        return "$";
    }
  })();

  return `${symbol}${price}`;
};

type LogEntry = { text: string; type: "info" | "success" | "error" };

export namespace CompetitorManager {
  export type Props = {
    children: ReactNode;
    existing: Competitor.Type[];
    productIds: string[];
  };
}

export const CompetitorManager = ({
  children,
  existing,
  productIds,
}: CompetitorManager.Props) => {
  const router = useRouter();
  const toast = useToastManager();
  const [competitors, setCompetitors] = useState<Competitor.Type[]>(existing);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isDetectingUI, setIsDetectingUI] = useState(false);

  const [url, setUrl] = useState<string | null>(null);
  const [query, setQuery] = useState<string | null>(null);

  const handleDetectWithLogs = async () => {
    setIsDetectingUI(true);
    setLogs([]);

    const response = await fetch("/api/intelligence/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds }),
    });

    if (!response.ok || !response.body) {
      setLogs([{ text: `Request failed — HTTP ${response.status}`, type: "error" }]);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const event = JSON.parse(line) as
            | { kind: "log"; text: string }
            | { kind: "error"; text: string }
            | { kind: "done"; competitors: Competitor.Type[] };

          switch (event.kind) {
            case "log":
              setLogs((previous) => [...previous, { text: event.text, type: "info" }]);
              break;
            case "error":
              setLogs((previous) => [...previous, { text: event.text, type: "error" }]);
              return;
            case "done":
              setLogs((previous) => [
                ...previous,
                { text: `${event.competitors.length} competitors ready`, type: "success" },
              ]);
              setCompetitors((previous) => [...previous, ...event.competitors]);
              setIsDetectingUI(false);
              return;
          }
        }
      }
    } catch (error) {
      setLogs((previous) => [
        ...previous,
        { text: error instanceof Error ? error.message : "Stream error", type: "error" },
      ]);
    }
  };

  const [handleScrape, isScraping] = useAsyncAction(async () => {
    const urls =
      url
        ?.split("\n")
        .map((line) => line.trim())
        .filter(Boolean) ?? [];

    if (urls.length === 0) return;

    const result = await scrapeUrls({ urls });

    if (!result.success) {
      toast.add({
        title: "Extraction failed",
        description: result.error.message,
        type: "error",
      });
      return;
    }

    setCompetitors((previous) => [...previous, ...result.data]);
    setUrl(null);

    toast.add({
      title: "Products extracted",
      description: `Extracted ${result.data.length} products from URLs.`,
      type: "success",
    });
  });

  const [handleSearch, isSearching] = useAsyncAction(
    async (manual?: string) => {
      const term = manual ?? query;
      if (!term?.trim()) return;

      const result = await searchCompetitors({ query: term });

      if (!result.success) {
        toast.add({
          title: "Search failed",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      setCompetitors((previous) => [...previous, ...result.data]);
      setQuery(null);

      toast.add({
        title: "Products found",
        description: `Found ${result.data.length} competitor products.`,
        type: "success",
      });
    },
  );

  const handleToggle = async (id: string) => {
    const target = competitors.find((record) => record.id === id);
    if (!target) return;

    setCompetitors((previous) =>
      previous.map((record) =>
        record.id === id ? { ...record, selected: !record.selected } : record,
      ),
    );

    void Competitor.toggleSelection({ id, selected: !target.selected });
  };

  const handleRemove = async (id: string) => {
    setCompetitors((previous) => previous.filter((record) => record.id !== id));
    void Competitor.removeForUser({ id });
  };

  const selected = competitors.filter((record) => record.selected).length;

  const brands = new Set(
    competitors.map((record) => record.brand).filter(Boolean),
  );
  const isLoading = isDetectingUI || isScraping || isSearching;

  return (
    <Motion.Stagger stagger={0.05} className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        {children}

        <Motion.Up className="relative mb-4">
          <Tabs defaultValue="auto">
            <TabsList className="flex w-full">
              <TabsIndicator className="top-0 h-full translate-y-0 rounded-none" />
              <Tab value="auto" className="flex-1">
                Auto-detect
              </Tab>
              <Tab value="url" className="flex-1">
                Paste URLs
              </Tab>
              <Tab value="search" className="flex-1">
                Search Brand
              </Tab>
            </TabsList>

            <TabsPanel value="auto">
              <div className="border border-t-0 border-accent-foreground bg-background-rich">
                <AnimatePresence mode="wait">
                  {isDetectingUI ? (
                    <motion.div
                      key="logs"
                      className="p-5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={Spring.Gentle}
                    >
                      {logs.at(-1)?.type === "error" && (
                        <button
                          type="button"
                          onClick={() => setIsDetectingUI(false)}
                          className="mb-3 font-medium text-foreground-dimmed text-xs underline underline-offset-2 hover:text-foreground"
                        >
                          ← Try again
                        </button>
                      )}
                      <div className="mb-4 flex items-center gap-2">
                        <motion.div
                          className="size-1.5 rounded-full bg-primary"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        />
                        <p className="font-medium text-foreground text-xs tracking-wide">
                          Scanning your market
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5 font-mono text-xs">
                        <AnimatePresence>
                          {logs.map((log, index) => (
                            <motion.div
                              key={index}
                              className={cn(
                                "flex items-start gap-2.5",
                                log.type === "success"
                                  ? "text-primary"
                                  : log.type === "error"
                                    ? "text-error"
                                    : "text-foreground-dimmed",
                              )}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={Spring.Snappy}
                            >
                              <span
                                className={cn(
                                  "mt-px shrink-0 select-none",
                                  log.type === "success"
                                    ? "text-primary"
                                    : log.type === "error"
                                      ? "text-error"
                                      : "text-primary/40",
                                )}
                              >
                                {log.type === "success" ? "✓" : log.type === "error" ? "✗" : "›"}
                              </span>
                              <span>{log.text}</span>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        <motion.span
                          className="ml-[18px] inline-block h-3 w-1.5 bg-primary/50"
                          animate={{ opacity: [1, 1, 0, 0] }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear", times: [0, 0.5, 0.5, 1] }}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      className="flex flex-col items-center gap-4 py-12 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={Spring.Gentle}
                    >
                      <p className="max-w-md font-light text-foreground-dimmed text-sm">
                        We'll analyze your products and use AI to find the most
                        relevant competitors in your market.
                      </p>
                      <Button
                        variant="flat"
                        color="primary"
                        type="button"
                        onClick={handleDetectWithLogs}
                        disabled={isLoading}
                        className="px-6 py-2 font-medium text-sm"
                      >
                        Auto-detect competitors
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TabsPanel>

            <TabsPanel value="url">
              <div className="border border-t-0 border-accent-foreground bg-background-rich p-4">
                <label
                  htmlFor="urls"
                  className="mb-2 block font-medium text-foreground text-xs"
                >
                  Paste competitor product URLs (one per line)
                </label>
                <Textarea value={url} onValueChange={setUrl}>
                  <TextareaInput
                    id="urls"
                    rows={6}
                    placeholder={
                      "https://amazon.com/dp/B0XXXXX\nhttps://competitorstore.com/products/example\nhttps://amazon.com/dp/B0YYYYY"
                    }
                    className="font-mono text-sm"
                  />
                </Textarea>
                <Button
                  variant="flat"
                  color="primary"
                  type="button"
                  onClick={handleScrape}
                  disabled={!url?.trim() || isLoading}
                  className="mt-3 px-4 py-2 font-medium text-sm"
                >
                  {isScraping
                    ? "Extracting product data..."
                    : "Extract Product Data"}
                </Button>
              </div>
            </TabsPanel>

            <TabsPanel value="search">
              <div className="border border-t-0 border-accent-foreground bg-background-rich p-4">
                <label
                  htmlFor="brandSearch"
                  className="mb-2 block font-medium text-foreground text-xs"
                >
                  Search by brand or category
                </label>
                <div className="flex gap-2">
                  <TextField value={query} onValueChange={setQuery}>
                    <TextFieldInput
                      id="query"
                      placeholder="e.g. SoundMax, wireless earbuds under $150..."
                      className="text-sm"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleSearch();
                      }}
                    />
                  </TextField>
                  <Button
                    variant="flat"
                    color="primary"
                    type="button"
                    onClick={() => handleSearch()}
                    disabled={!query?.trim() || isLoading}
                    className="shrink-0 px-4 py-2 font-medium text-sm"
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    "Wireless Earbuds",
                    "Travel Mugs",
                    "Yoga Equipment",
                    "Kitchen Appliances",
                    "Running Shoes",
                    "Desk Lamps",
                  ].map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleSearch(category)}
                      disabled={isLoading}
                      className="border border-accent-foreground bg-background px-3 py-1.5 text-foreground-dimmed text-xs transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </TabsPanel>
          </Tabs>
        </Motion.Up>

        {competitors.length > 0 && (
          <Motion.Up className="mt-4">
            <div className="border border-accent-foreground bg-background-rich">
              <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
                <p className="text-foreground-dimmed text-xs">
                  {competitors.length} competitor products across {brands.size}{" "}
                  brands — {selected} selected
                </p>
              </div>
              <div>
                {competitors.map((record, _index) => (
                  <div
                    key={record.id}
                    className={cn(
                      "flex w-full items-center gap-3 border-accent-foreground border-b px-4 py-3 transition-colors last:border-b-0",
                      record.selected ? "bg-primary/5" : "opacity-60",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(record.id)}
                      className={cn(
                        "flex size-4 shrink-0 cursor-pointer items-center justify-center border transition-colors duration-150",
                        record.selected
                          ? "border-primary bg-primary"
                          : "border-accent-foreground bg-background-rich",
                      )}
                    >
                      <CheckIcon
                        className={cn(
                          "size-2.5 text-white transition-opacity duration-150",
                          record.selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </button>
                    <div className="flex flex-1 items-center justify-between">
                      <div className="flex items-center gap-3">
                        {record.image ? (
                          // biome-ignore lint/performance/noImgElement: external image domains unknown
                          <img
                            src={record.image}
                            alt={record.title}
                            className="size-9 shrink-0 object-cover"
                          />
                        ) : (
                          <div className="flex size-9 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary text-xs">
                            {record.title.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {record.title}
                          </p>
                          <p className="text-foreground-dimmed text-xs">
                            {record.brand}
                            {record.source ? ` \u00B7 ${record.source}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-light text-foreground text-sm">
                          {formatPrice(record.price, record.currency)}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemove(record.id)}
                          className="text-foreground-dimmed transition-colors hover:text-error"
                        >
                          <XIcon className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Motion.Up>
        )}

        <Motion.Up className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            color="neutral"
            type="button"
            className="text-foreground-dimmed text-sm"
            render={<Link href="/onboarding/products" />}
          >
            <Back />
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              color="neutral"
              type="button"
              render={<Link href="/onboarding/scan" />}
              className="text-foreground-dimmed text-sm"
            >
              <Skip />
            </Button>
            <Button
              variant="flat"
              color="primary"
              type="button"
              onClick={() => router.push("/onboarding/scan")}
              disabled={selected === 0}
              className="px-6 py-2 font-medium text-sm"
            >
              Next: Run Scan
            </Button>
          </div>
        </Motion.Up>
      </div>
    </Motion.Stagger>
  );
};

const Skip = () => {
  const { pending } = useLinkStatus();
  return (
    <>
      Skip — auto-match{" "}
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </>
  );
};

const Back = () => {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowLeftIcon className="size-4" />
      )}
      Back
    </>
  );
};
