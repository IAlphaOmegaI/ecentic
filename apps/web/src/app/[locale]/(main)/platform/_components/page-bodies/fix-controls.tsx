"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import type { MarketingPage } from "@/components/marketing/page";

export const FixControls = ({ section }: FixControls.Props) => (
  <Tabs
    defaultValue={0}
    orientation="vertical"
    className="grid border-accent-foreground border-t md:grid-cols-[1fr_1.1fr]"
  >
    <TabsList
      aria-label={section.title}
      className="w-full flex-col overflow-visible rounded-none border-0 bg-background-dimmed"
    >
      {section.items?.map((item, index) => (
        <Tab
          key={item.title}
          value={index}
          className="h-auto min-h-24 w-full justify-start gap-6 border-accent-foreground border-r-0 border-b px-8 py-6 text-left data-active:bg-primary-text data-selected:bg-primary-text max-sm:px-4 md:last:border-b-0"
        >
          <span
            aria-hidden="true"
            className="font-heading text-3xl leading-none"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="flex-1 text-lg">{item.title}</span>
          <span aria-hidden="true" className="text-2xl">
            →
          </span>
        </Tab>
      ))}
    </TabsList>
    <div className="min-w-0 p-3 max-sm:p-2">
      {section.items?.map((item, index) => (
        <TabsPanel
          key={item.title}
          value={index}
          keepMounted
          className="relative h-full min-h-[390px] overflow-hidden rounded-lg bg-primary-text text-background-rich max-sm:min-h-[380px]"
        >
          <div className="pointer-events-none absolute right-0 bottom-0 left-[20%] h-[240px] text-background-rich opacity-20 [mask-image:linear-gradient(transparent,black_40%)]">
            <EvolvingAscii artwork="console" />
          </div>
          <div className="relative px-8 py-8 max-sm:px-6">
            <p
              aria-hidden="true"
              className="mb-8 font-heading text-5xl leading-none"
            >
              {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="text-background-rich">{item.title}</h3>
            <p className="mt-6 max-w-[42ch] text-background-rich/85 text-lg leading-relaxed max-sm:text-base">
              {item.body}
            </p>
          </div>
        </TabsPanel>
      ))}
    </div>
  </Tabs>
);

export namespace FixControls {
  export type Props = { section: MarketingPage.Section };
}
