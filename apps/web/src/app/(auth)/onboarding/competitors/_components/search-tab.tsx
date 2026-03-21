"use client";

import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useToastManager } from "@zenncore/web/components/toast";
import Image from "next/image";
import { useState } from "react";
import type * as Competitor from "@/server/app/competitor";
import { searchCompetitors } from "@/server/app/intelligence/search";

const categories = [
  "Wireless Earbuds",
  "Travel Mugs",
  "Yoga Equipment",
  "Kitchen Appliances",
  "Running Shoes",
  "Desk Lamps",
] as const;

export namespace SearchTab {
  export type Props = {
    onSuccess?: (competitors: Competitor.Type[]) => void;
    className?: string;
  };
}

export const SearchTab = ({ onSuccess, className }: SearchTab.Props) => {
  const toast = useToastManager();
  const [query, setQuery] = useState<string | null>(null);

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
      className={cn(
        "relative border border-accent-foreground bg-background-rich p-4",
        className,
      )}
    >
      <Image
        src="/images/websearch.png"
        alt="Competitors illustration"
        fill
        className="object-contain opacity-30"
      />

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
          disabled={!query?.trim() || isSearching}
          className="shrink-0 px-4 py-2 font-medium text-sm"
        >
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => handleSearch(category)}
            disabled={isSearching}
            className="border border-accent-foreground bg-background px-3 py-1.5 text-foreground-dimmed text-xs transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};
