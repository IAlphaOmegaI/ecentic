"use client";

import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import type * as Competitor from "@/server/app/competitor";
import * as Scrape from "@/server/app/intelligence/scrape";
import { CompetitorResults } from "./competitor-results";

export namespace UrlTab {
  export type Props = {
    onSuccess?: (competitors: Competitor.Type[]) => void;
    className?: string;
  };
}

export const UrlTab = ({ className, onSuccess }: UrlTab.Props) => {
  const toast = useToastManager();
  const [url, setUrl] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<Competitor.Type[]>([]);

  const [handleScrape, isScraping] = useAsyncAction(async () => {
    const urls =
      url
        ?.split("\n")
        .map((line) => line.trim())
        .filter(Boolean) ?? [];

    if (urls.length === 0) return;

    const result = await Scrape.scrapeUrls({ urls });

    if (!result.success) {
      toast.add({
        title: "Extraction failed",
        description: result.error.message,
        type: "error",
      });
      return;
    }

    setCompetitors((previous) => [...previous, ...result.data]);
    onSuccess?.(result.data);
    setUrl(null);
    toast.add({
      title: "Products extracted",
      description: `Extracted ${result.data.length} products from URLs.`,
      type: "success",
    });
  });

  const hasResults = competitors.length > 0;

  return (
    <div
      className={cn("relative flex h-full flex-col overflow-hidden", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!hasResults ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative flex flex-1 flex-col gap-4 bg-background-dimmed p-4"
          >
            <Image
              src="/images/websearch.png"
              alt=""
              aria-hidden
              fill
              className="pointer-events-none select-none object-contain opacity-10"
            />
            <div className="relative z-20 flex h-full flex-col gap-4">
              <label
                htmlFor="urls"
                className="block font-medium text-foreground text-sm"
              >
                Paste competitor product URLs (one per line)
              </label>
              <Textarea
                value={url}
                onValueChange={setUrl}
                className="bg-background-rich"
              >
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
                color="primary"
                type="button"
                onClick={handleScrape}
                disabled={!url?.trim() || isScraping}
                className="mt-auto px-4 py-2 font-medium text-sm"
              >
                {isScraping
                  ? "Extracting product data..."
                  : "Extract Product Data"}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col"
          >
            <div className="flex items-start gap-2 border-accent-foreground border-b bg-background-dimmed p-3">
              <Textarea
                value={url}
                onValueChange={setUrl}
                className="flex-1 bg-background-rich"
              >
                <TextareaInput
                  rows={2}
                  placeholder="Paste more URLs to extract..."
                  className="font-mono text-sm"
                />
              </Textarea>
              <Button
                variant="flat"
                color="primary"
                type="button"
                onClick={handleScrape}
                disabled={!url?.trim() || isScraping}
                className="shrink-0 self-end px-4 py-2 font-medium text-sm"
              >
                {isScraping ? "Extracting..." : "Extract"}
              </Button>
            </div>

            <CompetitorResults
              competitors={competitors}
              noun="product"
              verb="extracted"
              onClear={() => setCompetitors([])}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
