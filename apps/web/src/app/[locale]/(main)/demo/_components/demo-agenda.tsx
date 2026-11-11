"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { getMessages } from "next-intl/server";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingLightBand } from "@/components/marketing/light-band";
import type { MarketingPage } from "@/components/marketing/page";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const artwork = ["bag", "console", "commerce", "cart"] as const;

export const DemoAgenda = ({ section, copy }: DemoAgenda.Props) => (
  <MarketingLightBand id={section.id} className="scroll-mt-24">
    <div className="grid grid-cols-[1fr_2fr] border-accent-foreground border-b max-md:grid-cols-1">
      <div className="border-accent-foreground border-r px-8 py-10 max-sm:px-4 max-sm:pt-8 max-md:border-r-0 max-md:pb-0">
        <p className="text-primary-text">{section.eyebrow}</p>
      </div>
      <div className="px-8 py-10 max-sm:px-4 max-sm:py-8">
        <h2>{section.title}</h2>
        <p className="mt-4 text-foreground-dimmed">{copy.description}</p>
      </div>
    </div>
    <Tabs
      defaultValue="0"
      orientation="vertical"
      className="grid min-h-[460px] grid-cols-[1fr_2fr] max-md:grid-cols-1"
    >
      <div className="relative border-accent-foreground border-r bg-background-dimmed max-md:border-r-0 max-md:border-b">
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-md:hidden" />
        <TabsList
          aria-label={section.title}
          className="w-full flex-col rounded-none border-0"
        >
          {section.items?.map((item, index) => (
            <Tab
              key={item.title}
              value={String(index)}
              className="group h-auto min-h-24 w-full justify-start gap-4 border-r-0 border-b px-8 py-6 text-left hover:bg-background-rich focus-visible:outline-offset-[-4px] data-active:bg-background data-selected:bg-background data-[active]:text-primary-text data-selected:text-primary-text max-sm:min-h-20 max-sm:px-4"
            >
              <span className="shrink-0 text-sm tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 font-heading text-xl leading-tight">
                {item.title}
              </span>
              <ArrowRightIcon className="size-4 shrink-0 opacity-0 group-data-active:opacity-100 group-data-selected:opacity-100" />
            </Tab>
          ))}
        </TabsList>
        <div className="px-8 py-8 max-sm:px-4">
          <Button color="primary" render={<Link href="#request" />}>
            {copy.action.primary}
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </div>
      {section.items?.map((item, index) => (
        <TabsPanel
          key={item.title}
          value={String(index)}
          className="flex min-w-0 flex-col focus-visible:outline-2 focus-visible:outline-primary-text focus-visible:-outline-offset-4"
        >
          <div className="grid grid-cols-2 border-accent-foreground border-b max-sm:grid-cols-1">
            <div className="flex min-w-0 flex-col justify-center gap-4 px-8 py-8 max-sm:px-4 max-sm:pb-0">
              <span aria-hidden="true" className="text-4xl text-primary-text">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{item.title}</h3>
              <p className="text-foreground-dimmed">{item.body}</p>
            </div>
            <div className="relative h-64 min-w-0 text-primary-text max-sm:h-52">
              <div className="absolute inset-4">
                <EvolvingAscii artwork={artwork[index] ?? "bag"} />
              </div>
            </div>
          </div>
          <dl className="grid flex-1 grid-cols-2 max-sm:grid-cols-1">
            <div className="min-w-0 border-accent-foreground border-r px-8 py-8 max-sm:border-r-0 max-sm:border-b max-sm:px-4 max-sm:py-6">
              <dt className="mb-4 text-foreground-dimmed text-sm">
                {copy.bringLabel}
              </dt>
              <dd className="font-heading text-xl leading-snug">
                {copy.items[index]?.bring}
              </dd>
            </div>
            <div className="min-w-0 bg-background-dimmed/50 px-8 py-8 max-sm:px-4 max-sm:py-6">
              <dt className="mb-4 text-foreground-dimmed text-sm">
                {copy.exploreLabel}
              </dt>
              <dd className="font-heading text-xl leading-snug">
                {copy.items[index]?.explore}
              </dd>
            </div>
          </dl>
        </TabsPanel>
      ))}
    </Tabs>
  </MarketingLightBand>
);

export namespace DemoAgenda {
  export type Props = {
    section: MarketingPage.Section;
    copy: Awaited<ReturnType<typeof getMessages>>["demoPage"]["agenda"];
  };
}
