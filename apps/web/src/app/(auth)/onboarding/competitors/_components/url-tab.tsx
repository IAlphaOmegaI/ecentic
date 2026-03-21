"use client";

import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import { useToastManager } from "@zenncore/web/components/toast";
import { useState } from "react";
import type * as Competitor from "@/server/app/competitor";
import * as Scrape from "@/server/app/intelligence/scrape";
import Image from "next/image";

export namespace UrlTab {
  export type Props = {
    onSuccess: (competitors: Competitor.Type[]) => void;
    className?: string;
  };
}

export const UrlTab = ({ onSuccess, className }: UrlTab.Props) => {
  const toast = useToastManager();
  const [url, setUrl] = useState<string | null>(null);

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

    onSuccess(result.data);
    setUrl(null);
    toast.add({
      title: "Products extracted",
      description: `Extracted ${result.data.length} products from URLs.`,
      type: "success",
    });
  });

  return (
    <div
      className={cn(
        "flex min-h-full flex-col bg-background-dimmed p-4 relative",
        className,
      )}
    >
      <Image
        src="/images/websearch.png"
        alt="Competitors illustration"
        fill
        className="object-contain opacity-30"
      />

      <div className="relative z-20 size-full flex flex-col gap-4">
        <label
          htmlFor="urls"
          className="mb-2 block font-medium text-foreground"
        >
          Paste competitor product URLs (one per line)
        </label>
        <Textarea
          value={url}
          onValueChange={setUrl}
          className={"bg-background-rich"}
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
          variant="flat"
          color="primary"
          type="button"
          onClick={handleScrape}
          disabled={!url?.trim() || isScraping}
          className="mt-auto px-4 py-2 font-medium"
        >
          {isScraping ? "Extracting product data..." : "Extract Product Data"}
        </Button>
      </div>
    </div>
  );
};
