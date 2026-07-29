"use client";

import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { useState } from "react";
import { AutoDetectTab } from "@/app/(auth)/onboarding/competitors/_components/auto-detect-tab";
import { CompetitorList } from "@/app/(auth)/onboarding/competitors/_components/competitor-list";
import { SearchTab } from "@/app/(auth)/onboarding/competitors/_components/search-tab";
import { UrlTab } from "@/app/(auth)/onboarding/competitors/_components/url-tab";
import * as Competitor from "@/server/app/competitor";
import { SectionKicker } from "../../../../_components/grid";

export namespace AddCompetitors {
  export type Props = {
    /** Store every rival added here is written against. */
    store: string;
    /** Products the detector reasons about — this store's catalog. */
    products: string[];
    productNames: string[];
    existing: Competitor.Type[];
  };
}

export const AddCompetitors = ({
  store,
  products,
  productNames,
  existing,
}: AddCompetitors.Props) => {
  const [competitors, setCompetitors] = useState<Competitor.Type[]>(existing);

  // Each tab persists as it goes and reports back what it created, so the
  // roster below reflects the store's real state without a round-trip. Merging
  // by id keeps a re-run of detection from stacking duplicates in the list.
  const handleAdded = (added: Competitor.Type[]) =>
    setCompetitors((previous) => {
      const merged = new Map(previous.map((record) => [record.id, record]));
      for (const record of added) merged.set(record.id, record);
      return [...merged.values()];
    });

  const handleToggle = (id: string) => {
    const target = competitors.find((record) => record.id === id);
    if (!target) return;

    setCompetitors((previous) =>
      previous.map((record) =>
        record.id === id ? { ...record, selected: !record.selected } : record,
      ),
    );

    void Competitor.toggleSelection({ id, selected: !target.selected });
  };

  const handleRemove = (id: string) => {
    setCompetitors((previous) => previous.filter((record) => record.id !== id));
    void Competitor.removeForUser({ id });
  };

  const selected = competitors.filter((record) => record.selected).length;
  const brands = new Set(
    competitors.map((record) => record.brand).filter(Boolean),
  );

  return (
    <div className="flex flex-col gap-px bg-accent-foreground">
      <div className="bg-background-rich">
        <div className="p-4">
          <SectionKicker>01 — Find</SectionKicker>
          <p className="mt-2 font-semibold text-foreground-rich text-lg">
            Add competitors to this store
          </p>
          <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
            Detect them from your catalog, paste product URLs, or search a
            brand. Anything you add belongs to this store only.
          </p>
        </div>

        <Tabs defaultValue="auto">
          <TabsList className="w-full rounded-none border-x-0">
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

          {/* keepMounted: a detection stream in progress must survive switching
              to another tab instead of being torn down and restarted. */}
          <TabsPanel value="auto" keepMounted className="border-0">
            <AutoDetectTab
              products={products}
              store={store}
              onSuccess={handleAdded}
              className="h-130 border-0"
            />
          </TabsPanel>

          <TabsPanel value="url" className="border-0">
            <UrlTab
              store={store}
              onSuccess={handleAdded}
              className="border-0"
            />
          </TabsPanel>

          <TabsPanel value="search" className="border-0">
            <SearchTab
              productNames={productNames}
              store={store}
              onSuccess={handleAdded}
              className="h-130 border-0"
            />
          </TabsPanel>
        </Tabs>
      </div>

      <div className="bg-background-rich">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionKicker>02 — Roster</SectionKicker>
            <p className="mt-2 font-semibold text-foreground-rich text-lg">
              Tracked in this store
            </p>
            <p className="mt-1 text-foreground-dimmed text-sm">
              Only selected competitors are judged when a scan runs with no
              explicit roster.
            </p>
          </div>
          <p className="shrink-0 text-foreground-dimmed text-sm">
            {competitors.length} across {brands.size}{" "}
            {brands.size === 1 ? "brand" : "brands"} — {selected} selected
          </p>
        </div>

        {competitors.length === 0 ? (
          <p className="px-4 pb-6 text-foreground-dimmed text-sm">
            No competitors tracked yet. Add some above and they'll appear here.
          </p>
        ) : (
          <div className="h-105 px-4 pb-4">
            <CompetitorList
              competitors={competitors}
              onToggle={handleToggle}
              onRemove={handleRemove}
            />
          </div>
        )}
      </div>
    </div>
  );
};
