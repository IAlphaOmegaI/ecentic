"use client";

import { CheckIcon, XIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Motion } from "@/components/motion";
import { Scale, Spring, Stagger } from "@/lib/animations";
import * as Competitor from "@/server/app/competitor";
import { detectCompetitors } from "@/server/app/intelligence/detect";
import { scrapeUrls } from "@/server/app/intelligence/scrape";
import { searchCompetitors } from "@/server/app/intelligence/search";

type Method = "auto" | "url" | "search";

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

  const [method, setMethod] = useState<Method>("auto");
  const [competitors, setCompetitors] = useState<Competitor.Type[]>(existing);

  const [url, setUrl] = useState<string | null>(null);
  const [query, setQuery] = useState<string | null>(null);

  const [handleDetect, isDetecting] = useAsyncAction(async () => {
    const result = await detectCompetitors({ productIds });

    if (!result.success) {
      toast.add({
        title: "Detection failed",
        description: result.error.message,
        type: "error",
      });
      return;
    }

    setCompetitors((previous) => [...previous, ...result.data]);
    toast.add({
      title: "Competitors found",
      description: `Found ${result.data.length} competitor products.`,
      type: "success",
    });
  });

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
  const isLoading = isDetecting || isScraping || isSearching;

  return (
    <Motion.Stagger stagger={0.05} className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        {children}

        <Motion.Up className="relative mb-4 flex gap-0 border border-accent-foreground">
          {(["auto", "url", "search"] as const).map((tab) => {
            const label = (() => {
              switch (tab) {
                case "auto":
                  return "Auto-detect";
                case "url":
                  return "Paste URLs";
                case "search":
                  return "Search Brand";
              }
            })();

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setMethod(tab)}
                className={cn(
                  "relative flex-1 border-accent-foreground border-r py-2.5 font-medium text-sm transition-colors last:border-r-0",
                  method === tab
                    ? "text-white"
                    : "bg-background-rich text-foreground-dimmed hover:bg-background-dimmed",
                )}
              >
                {method === tab && (
                  <motion.div
                    layoutId="competitor-tab-indicator"
                    className="absolute inset-0 bg-primary"
                    transition={Spring.Snappy}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </Motion.Up>

        <AnimatePresence mode="wait">
          {method === "auto" && (
            <motion.div
              key="auto"
              className="border border-accent-foreground bg-background-rich"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={Spring.Snappy}
            >
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="max-w-md font-light text-foreground-dimmed text-sm">
                  We'll analyze your products and use AI to find the most
                  relevant competitors in your market.
                </p>
                <motion.div
                  animate={
                    isDetecting
                      ? { scale: [1, 1.03, 1], opacity: [1, 0.75, 1] }
                      : {}
                  }
                  transition={
                    isDetecting
                      ? {
                          repeat: Number.POSITIVE_INFINITY,
                          duration: 0.9,
                        }
                      : {}
                  }
                >
                  <Button
                    variant="flat"
                    color="primary"
                    type="button"
                    onClick={handleDetect}
                    disabled={isLoading}
                    className="px-6 py-2 font-medium text-sm"
                  >
                    {isDetecting
                      ? "Analyzing your market..."
                      : "Auto-detect competitors"}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {method === "url" && (
            <motion.div
              key="url"
              className="border border-accent-foreground bg-background-rich p-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={Spring.Snappy}
            >
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
              <Motion.Tap whileHover={{ y: -1 }} transition={Spring.Snappy}>
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
              </Motion.Tap>
            </motion.div>
          )}

          {method === "search" && (
            <motion.div
              key="search"
              className="border border-accent-foreground bg-background-rich p-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={Spring.Snappy}
            >
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
              <motion.div
                className="mt-4 flex flex-wrap gap-2"
                variants={Stagger.Container(0.06)}
                initial="hidden"
                animate="visible"
              >
                {[
                  "Wireless Earbuds",
                  "Travel Mugs",
                  "Yoga Equipment",
                  "Kitchen Appliances",
                  "Running Shoes",
                  "Desk Lamps",
                ].map((category) => (
                  <motion.button
                    key={category}
                    variants={Scale.In}
                    type="button"
                    onClick={() => handleSearch(category)}
                    disabled={isLoading}
                    className="border border-accent-foreground bg-background px-3 py-1.5 text-foreground-dimmed text-xs transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    transition={Spring.Snappy}
                  >
                    {category}
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                {competitors.map((record, index) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 28,
                      delay: index * 0.04,
                    }}
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
                  </motion.div>
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
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              color="neutral"
              type="button"
              render={<Link href="/onboarding/scan" />}
              className="text-foreground-dimmed text-sm"
            >
              Skip — auto-match
            </Button>
            <Motion.Tap whileHover={{ y: -1 }} transition={Spring.Snappy}>
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
            </Motion.Tap>
          </div>
        </Motion.Up>
      </div>
    </Motion.Stagger>
  );
};
