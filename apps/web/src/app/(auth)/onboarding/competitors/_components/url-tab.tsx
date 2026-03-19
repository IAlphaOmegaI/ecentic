"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import { useToastManager } from "@zenncore/web/components/toast";
import { useState } from "react";
import type * as Competitor from "@/server/app/competitor";
import { scrapeUrls } from "@/server/app/intelligence/scrape";

export namespace UrlTab {
  export type Props = {
    onSuccess: (competitors: Competitor.Type[]) => void;
  };
}

export const UrlTab = ({ onSuccess }: UrlTab.Props) => {
  const toast = useToastManager();
  const [url, setUrl] = useState<string | null>(null);

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

    onSuccess(result.data);
    setUrl(null);
    toast.add({
      title: "Products extracted",
      description: `Extracted ${result.data.length} products from URLs.`,
      type: "success",
    });
  });

  return (
    <div className="border border-accent-foreground bg-background-rich p-4">
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
        disabled={!url?.trim() || isScraping}
        className="mt-3 px-4 py-2 font-medium text-sm"
      >
        {isScraping ? "Extracting product data..." : "Extract Product Data"}
      </Button>
    </div>
  );
};
