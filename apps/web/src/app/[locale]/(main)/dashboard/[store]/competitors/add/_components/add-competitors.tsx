"use client";

import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { useToastManager } from "@zenncore/web/components/toast";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { AutoDetectTab } from "@/app/[locale]/(auth)/onboarding/competitors/_components/auto-detect-tab";
import { CompetitorList } from "@/app/[locale]/(auth)/onboarding/competitors/_components/competitor-list";
import { MerchantTab } from "@/app/[locale]/(auth)/onboarding/competitors/_components/merchant-tab";
import { OffersTab } from "@/app/[locale]/(auth)/onboarding/competitors/_components/offers-tab";
import { SearchTab } from "@/app/[locale]/(auth)/onboarding/competitors/_components/search-tab";
import { UrlTab } from "@/app/[locale]/(auth)/onboarding/competitors/_components/url-tab";
import * as Competitor from "@/server/app/competitor";

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
  const translate = useTranslations("dashboard.competitors.add");
  const research = useTranslations("dashboard.research");
  const toast = useToastManager();
  const format = useFormatter();
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

  const handleToggle = async (id: string) => {
    const target = competitors.find((record) => record.id === id);
    if (!target) return;
    const result = await Competitor.toggleSelection({
      id,
      selected: !target.selected,
    });
    if (!result.success) {
      toast.add({
        title: research("competitors.updateFailed"),
        description: research("unavailable.description"),
        type: "error",
      });
      return;
    }
    setCompetitors((previous) =>
      previous.map((record) =>
        record.id === id ? { ...record, selected: !target.selected } : record,
      ),
    );
  };

  const handleRemove = async (id: string) => {
    const result = await Competitor.removeForUser({ id });
    if (!result.success) {
      toast.add({
        title: research("competitors.updateFailed"),
        description: research("unavailable.description"),
        type: "error",
      });
      return;
    }
    setCompetitors((previous) => previous.filter((record) => record.id !== id));
  };

  const selected = competitors.filter((record) => record.selected).length;
  const brands = new Set(
    competitors.map((record) => record.brand).filter(Boolean),
  );

  return (
    <div className="flex flex-col gap-px bg-accent-foreground">
      <div className="bg-background-rich">
        <div className="px-4 py-6 sm:px-6">
          <h2 className="font-semibold text-foreground-rich text-lg">
            {translate("title")}
          </h2>
          <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
            {translate("description")}
          </p>
        </div>

        {/* Offers leads here for the same reason it does in onboarding: it is
            the only tab whose rivals and prices were observed rather than
            recalled. */}
        <Tabs defaultValue="offers">
          <div className="overflow-x-auto border-accent-foreground border-y px-4 py-3 sm:px-6">
            <TabsList className="w-max">
              <TabsIndicator />
              <Tab value="offers">{translate("tabs.liveOffers")}</Tab>
              <Tab value="auto">{translate("tabs.autoDetect")}</Tab>
              <Tab value="url">{translate("tabs.pasteUrls")}</Tab>
              <Tab value="search">{translate("tabs.searchBrand")}</Tab>
              <Tab value="merchant">{translate("tabs.googleMerchant")}</Tab>
            </TabsList>
          </div>

          {/* keepMounted: a detection stream in progress must survive switching
              to another tab instead of being torn down and restarted. */}
          <TabsPanel value="offers" keepMounted className="border-0">
            <OffersTab
              products={products}
              store={store}
              onSuccess={handleAdded}
              dashboard
              className="border-0"
            />
          </TabsPanel>

          <TabsPanel value="auto" keepMounted className="border-0">
            <AutoDetectTab
              products={products}
              store={store}
              onSuccess={handleAdded}
              dashboard
              className="border-0"
            />
          </TabsPanel>

          <TabsPanel value="url" keepMounted className="border-0">
            <UrlTab
              dashboard
              store={store}
              onSuccess={handleAdded}
              className="border-0"
            />
          </TabsPanel>

          <TabsPanel value="search" keepMounted className="border-0">
            <SearchTab
              productNames={productNames}
              store={store}
              onSuccess={handleAdded}
              dashboard
              className="border-0"
            />
          </TabsPanel>

          <TabsPanel value="merchant" keepMounted className="border-0">
            <MerchantTab
              store={store}
              onSuccess={handleAdded}
              dashboard
              className="border-0"
            />
          </TabsPanel>
        </Tabs>
      </div>

      <div className="bg-background-rich">
        <div className="flex flex-col gap-4 px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <h2 className="font-semibold text-foreground-rich text-lg">
              {translate("trackedTitle")}
            </h2>
            <p className="mt-1 text-foreground-dimmed text-sm">
              {translate("trackedDescription")}
            </p>
          </div>
          <p className="shrink-0 text-foreground-dimmed text-sm">
            {translate("rosterSummary", {
              total: format.number(competitors.length),
              brands: brands.size,
              selected: format.number(selected),
            })}
          </p>
        </div>

        {competitors.length === 0 ? (
          <p className="px-4 pb-6 text-foreground-dimmed text-sm sm:px-6">
            {translate("emptyRoster")}
          </p>
        ) : (
          <div className="h-105 border-accent-foreground border-t">
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
