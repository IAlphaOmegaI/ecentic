"use client";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  CommerceBasketShoppingIcon,
  CommerceCode_3Icon,
  CommerceGlobePointerIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";
import { useState } from "react";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import type { MarketingPage } from "@/components/marketing/page";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";
import { PlatformProviderStack } from "../provider-stack";

const icons = [
  CommercePlug_3SparkleIcon,
  CommerceCode_3Icon,
  CommerceGlobePointerIcon,
  CommerceBasketShoppingIcon,
] as const;

const CatalogFlow = ({ stage, copy }: CatalogFlow.Props) => (
  <div
    className="relative grid min-w-0 gap-8 px-8 py-10 max-sm:px-4"
    data-catalog-stage={stage}
  >
    <div className="grid min-w-0 grid-cols-[1fr_32px_1fr] items-center gap-2">
      <div className="grid min-w-0 gap-6">
        <PlatformProviderStack
          providers={["shopify", "woocommerce"]}
          className="justify-start"
        />
        <div className="flex items-center gap-3 text-primary">
          <CommerceCode_3Icon className="size-8 shrink-0" aria-hidden />
          <code className="text-sm">XML / JSON / CSV</code>
        </div>
        <p className="max-w-[20ch] text-foreground-dimmed text-sm">
          {copy.sources}
        </p>
      </div>
      <div className="relative self-stretch" aria-hidden>
        <span className="absolute top-1/4 bottom-1/4 left-0 border-primary/40 border-l" />
        <span className="absolute top-1/4 left-0 w-4 border-primary/40 border-t" />
        <span className="absolute bottom-1/4 left-0 w-4 border-primary/40 border-t" />
        <span className="absolute inset-x-0 top-1/2 border-primary/40 border-t" />
        <ArrowRightIcon className="absolute top-1/2 -right-1 size-4 -translate-y-1/2 text-primary" />
      </div>
      <div className="relative min-w-0 border border-accent-foreground bg-background px-4 py-6">
        <Plus className="top-0 left-0 size-4 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="right-0 bottom-0 size-4 translate-x-1/2 translate-y-1/2" />
        <CommerceBasketShoppingIcon
          className="size-10 text-primary"
          aria-hidden
        />
        <p className="mt-4 font-heading text-xl leading-tight">
          {copy.catalog}
        </p>
        <div className="mt-5 grid gap-2 font-mono text-xs">
          {["title", "description", "price", "image", "id"].map(
            (field, index) => (
              <div
                key={field}
                className={cn(
                  "flex min-w-0 items-center justify-between gap-2",
                  index === 0
                    ? "text-primary-text"
                    : index === 1
                      ? "text-secondary"
                      : index === 2
                        ? "text-success-dimmed"
                        : index === 3
                          ? "text-warning-foreground"
                          : "text-foreground-dimmed",
                )}
              >
                <span>{field}</span>
                {stage >= 1 && (
                  <CheckCircleIcon className="size-4 shrink-0" aria-hidden />
                )}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
    <div className="grid gap-4 border-accent-foreground border-t pt-6 sm:grid-cols-2">
      <div
        className={cn(
          "flex items-start gap-3",
          stage === 2 ? "text-primary-text" : "text-foreground-dimmed",
        )}
      >
        <ProviderLogo
          provider="googleMerchant"
          decorative
          className="h-8 w-8 shrink-0 rounded-none"
        />
        <p className="text-sm leading-relaxed">{copy.merchant}</p>
      </div>
      <div
        className={cn(
          "flex items-start gap-3",
          stage === 3 ? "text-primary-text" : "text-foreground-dimmed",
        )}
      >
        <CommerceBasketShoppingIcon className="size-8 shrink-0" aria-hidden />
        <p className="text-sm leading-relaxed">{copy.selection}</p>
      </div>
    </div>
    <p className="border-accent-foreground border-t pt-4 text-foreground-dimmed text-sm">
      {copy.control}
    </p>
  </div>
);

const RoadmapItem = ({
  item,
  index,
  active,
  compact = false,
}: RoadmapItem.Props) => {
  const Icon = icons[index] ?? CommerceBasketShoppingIcon;
  return (
    <span className="grid w-full grid-cols-[48px_1fr] items-start gap-5">
      <span className="relative grid h-12 w-12 place-items-center bg-background">
        <Icon
          className={cn(
            "size-8",
            active ? "text-primary" : "text-foreground-dimmed",
          )}
          aria-hidden
        />
      </span>
      <span className="min-w-0 pt-1">
        <span className="mb-2 block font-heading text-primary-text text-sm tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="block font-heading text-2xl leading-tight">
          {item.title}
        </span>
        {!compact && (
          <span className="mt-3 block font-normal text-base text-foreground-dimmed leading-relaxed">
            {item.body}
          </span>
        )}
      </span>
    </span>
  );
};

export const ConnectRoadmap = ({
  items,
  label,
  copy,
}: ConnectRoadmap.Props) => {
  const [active, setActive] = useState(0);
  const { ready, reduced } = useInteractive();
  if (!ready || reduced)
    return (
      <div
        className="grid min-w-0 border-accent-foreground border-t lg:grid-cols-2"
        data-connect-roadmap="static"
      >
        <ol className="relative m-0 list-none divide-y divide-accent-foreground">
          {items.map((item, index) => (
            <li key={item.title} className="px-8 py-6 max-sm:px-4">
              <RoadmapItem item={item} index={index} active />
            </li>
          ))}
        </ol>
        <div className="min-w-0 border-accent-foreground border-t bg-background-dimmed lg:border-t-0 lg:border-l">
          <CatalogFlow stage={3} copy={copy} />
        </div>
      </div>
    );
  return (
    <Tabs
      value={active}
      onValueChange={(value) => {
        if (typeof value === "number") setActive(value);
      }}
      orientation="vertical"
      className="grid min-w-0 border-accent-foreground border-t lg:grid-cols-2"
      data-connect-roadmap="interactive"
    >
      <TabsList
        aria-label={label}
        className="relative grid w-full overflow-visible rounded-none border-0 bg-background before:absolute before:top-12 before:bottom-12 before:left-14 before:border-accent-foreground before:border-l max-sm:before:left-10"
      >
        {items.map((item, index) => (
          <Tab
            key={item.title}
            value={index}
            className="relative h-auto justify-start whitespace-normal rounded-none border-accent-foreground border-r-0 border-b px-8 py-6 text-left text-foreground-rich before:hidden last:border-b-0 hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-solid focus-visible:-outline-offset-2 data-[active]:text-foreground-rich data-selected:text-foreground-rich max-sm:px-4"
          >
            <RoadmapItem
              item={item}
              index={index}
              active={index === active}
              compact
            />
          </Tab>
        ))}
      </TabsList>
      <div className="relative min-w-0 border-accent-foreground border-t bg-background-dimmed lg:border-t-0 lg:border-l">
        <Plus className="top-0 left-0 size-4 -translate-x-1/2 -translate-y-1/2" />
        {items.map((item, index) => (
          <TabsPanel
            key={item.title}
            value={index}
            className="outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-solid focus-visible:-outline-offset-2"
          >
            <p className="border-accent-foreground border-b px-8 py-6 text-foreground-dimmed leading-relaxed max-sm:px-4">
              {item.body}
            </p>
            <CatalogFlow stage={index} copy={copy} />
          </TabsPanel>
        ))}
      </div>
    </Tabs>
  );
};

namespace CatalogFlow {
  export type Props = {
    stage: number;
    copy: AppConfig["Messages"]["reviewConnect"]["flow"];
  };
}
namespace RoadmapItem {
  export type Props = {
    item: NonNullable<MarketingPage.Section["items"]>[number];
    index: number;
    active: boolean;
    compact?: boolean;
  };
}
export namespace ConnectRoadmap {
  export type Props = {
    items: NonNullable<MarketingPage.Section["items"]>;
    label: string;
    copy: CatalogFlow.Props["copy"];
  };
}
