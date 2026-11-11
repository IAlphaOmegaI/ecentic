"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { MarketingPage } from "@/components/marketing/page";

export const SimulateTracking = ({ items, label }: SimulateTracking.Props) => (
  <Tabs
    defaultValue="0"
    orientation="vertical"
    className="grid grid-cols-[1fr_1.5fr] border-[var(--rail-color)] border-t max-md:grid-cols-1"
  >
    <div className="bg-background-dimmed p-4">
      <TabsList
        aria-label={label}
        className="w-full flex-col rounded-none border-0"
      >
        {items.map((item, index) => (
          <Tab
            key={item.title}
            value={String(index)}
            className="h-auto min-h-16 justify-start gap-4 whitespace-normal border-r-0 border-b px-4 py-4 text-left last:border-b-0 data-selected:bg-primary-text data-selected:text-background-rich"
          >
            <span aria-hidden="true" className="shrink-0 text-sm opacity-65">
              {String(index + 1).padStart(2, "0")}
            </span>
            {item.title}
          </Tab>
        ))}
      </TabsList>
    </div>
    {items.map((item, index) => (
      <TabsPanel
        key={item.title}
        value={String(index)}
        className="flex inert:hidden min-h-64 min-w-0 flex-col justify-center border-[var(--rail-color)] border-l px-12 py-8 max-sm:min-h-56 max-sm:px-4 max-md:border-t max-md:border-l-0"
      >
        <h3>{item.title}</h3>
        <p className="mt-4 max-w-[42ch] text-foreground-dimmed text-xl leading-relaxed max-sm:text-lg">
          {item.body}
        </p>
      </TabsPanel>
    ))}
  </Tabs>
);

export namespace SimulateTracking {
  export type Props = {
    items: NonNullable<MarketingPage.Section["items"]>;
    label: string;
  };
}
