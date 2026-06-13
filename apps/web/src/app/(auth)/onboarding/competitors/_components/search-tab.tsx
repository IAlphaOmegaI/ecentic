"use client";

import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { formatPrice } from "@/lib/currency";
import type * as Competitor from "@/server/app/competitor";
import * as Search from "@/server/app/intelligence/search";

export namespace SearchTab {
  export type Props = {
    onSuccess?: (competitors: Competitor.Type[]) => void;
    productNames: string[];
    className?: string;
  };
}

export const SearchTab = ({
  onSuccess,
  productNames,
  className,
}: SearchTab.Props) => {
  const toast = useToastManager();
  const [query, setQuery] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<Competitor.Type[]>([]);

  const [handleSearch, isSearching] = useAsyncAction(
    async (manual?: string) => {
      const term = manual ?? query;
      if (!term?.trim()) return;

      const result = await Search.searchCompetitors({ query: term });

      if (!result.success) {
        toast.add({
          title: "Search failed",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      setCompetitors((previous) => [...previous, ...result.data]);
      onSuccess?.(result.data);
      setQuery(null);
      toast.add({
        title: "Products found",
        description: `Found ${result.data.length} competitor products.`,
        type: "success",
      });
    },
  );

  return (
    <div
      className={cn("relative flex h-full flex-col overflow-hidden", className)}
    >
      <div className="relative border-accent-foreground border-b bg-background-dimmed p-4">
        <Image
          src="/images/websearch.png"
          alt="Competitors illustration"
          fill
          className="object-contain opacity-30"
        />
        <div className="relative z-10">
          <label
            htmlFor="brandSearch"
            className="mb-2 block font-medium text-foreground text-xs"
          >
            Search by brand or category
          </label>
          <div className="flex gap-2">
            <TextField value={query} onValueChange={setQuery}>
              <TextFieldInput
                id="brandSearch"
                placeholder="e.g. SoundMax, wireless earbuds under $150..."
                className="text-sm"
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch();
                }}
              />
            </TextField>
            <Button
              color="primary"
              type="button"
              onClick={() => handleSearch()}
              disabled={!query?.trim() || isSearching}
              className="shrink-0 px-4 py-2 font-medium text-sm"
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          {productNames.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {productNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSearch(name)}
                  disabled={isSearching}
                  className="border border-accent-foreground bg-background px-3 py-1.5 text-foreground-dimmed text-xs transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {competitors.length === 0 && !isSearching && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 items-center justify-center p-8"
          >
            <p className="text-center text-foreground-dimmed text-sm">
              Search for a brand or product above to find competitors
            </p>
          </motion.div>
        )}

        {competitors.length === 0 && isSearching && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 items-center justify-center gap-3 p-8"
          >
            {[0, 0.2, 0.4].map((delay) => (
              <motion.span
                key={delay}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  duration: 1,
                  repeat: Number.POSITIVE_INFINITY,
                  delay,
                  ease: "easeInOut",
                }}
                className="inline-block size-1.5 rounded-full bg-primary"
              />
            ))}
            <span className="text-foreground-dimmed text-sm">
              Searching competitive landscape...
            </span>
          </motion.div>
        )}

        {competitors.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto bg-background-rich">
              {competitors.map((competitor) => (
                <div
                  key={competitor.id}
                  className="flex items-start gap-3 border-accent-foreground border-b p-3 last:border-b-0"
                >
                  <Avatar className="size-10 shrink-0 rounded-none bg-primary/10">
                    <AvatarImage
                      src={competitor.image ?? "/images/fallback.png"}
                      alt={competitor.title}
                    />
                    <AvatarFallback className="relative">
                      <Image src="/images/fallback.png" alt="Fallback" fill />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground text-sm">
                      {competitor.title}
                    </p>
                    <p className="text-foreground-dimmed text-xs">
                      {[competitor.brand, competitor.source]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {competitor.description && (
                      <p className="mt-0.5 line-clamp-2 text-foreground-dimmed text-xs">
                        {competitor.description}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-medium text-primary text-sm">
                    {formatPrice(competitor.price, competitor.currency)}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-accent-foreground border-t bg-background-dimmed px-4 py-2.5">
              <span className="text-foreground-dimmed text-xs">
                {competitors.length} competitor
                {competitors.length !== 1 ? "s" : ""} found
              </span>
              <button
                type="button"
                onClick={() => setCompetitors([])}
                className="text-foreground-dimmed text-xs transition-colors hover:text-foreground"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
