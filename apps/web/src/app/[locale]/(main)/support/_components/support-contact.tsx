"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import type { MarketingPage } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const artwork = ["console", "cart", "commerce", "console"] as const;

export const SupportContact = ({ section }: SupportContact.Props) => (
  <MarketingBand
    id={section.id}
    className="scroll-mt-24 [&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="border-accent-foreground border-b px-8 py-12 max-sm:px-4 max-sm:py-8">
      <h2>{section.title}</h2>
    </div>
    <Tabs
      defaultValue="0"
      orientation="vertical"
      className="grid grid-cols-[1fr_2fr] max-md:grid-cols-1"
      data-support-contact=""
    >
      <div className="relative border-accent-foreground border-r bg-background-dimmed max-md:border-r-0 max-md:border-b">
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-md:hidden" />
        <TabsList
          activateOnFocus
          aria-label={section.title}
          className="w-full flex-col rounded-none border-0"
        >
          {section.items?.map((item, index) => (
            <Tab
              key={item.href}
              value={String(index)}
              className="group h-auto min-h-24 w-full justify-between gap-4 border-r-0 border-b px-8 py-6 text-left last:border-b-0 hover:bg-background-rich focus-visible:outline-offset-[-4px] data-[active]:bg-background data-selected:bg-background data-[active]:text-primary-text data-selected:text-primary-text max-sm:min-h-16 max-sm:px-4 max-sm:py-4"
            >
              <span className="flex-1 text-left font-heading text-xl leading-tight">
                {item.title}
              </span>
              <ArrowRightIcon className="size-4 shrink-0 opacity-0 group-data-active:opacity-100 group-data-selected:opacity-100" />
            </Tab>
          ))}
        </TabsList>
      </div>
      {section.items?.map((item, index) => (
        <TabsPanel
          key={item.href}
          value={String(index)}
          className="relative flex min-h-[384px] min-w-0 flex-col justify-between bg-background-dimmed/40 focus-visible:-outline-offset-4 max-sm:min-h-[360px]"
        >
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[64%] text-primary/40 [mask-image:linear-gradient(90deg,transparent,black_40%)] max-sm:w-full max-sm:text-primary/15">
            <EvolvingAscii artwork={artwork[index] ?? "console"} />
          </div>
          <div className="relative min-w-0 px-8 pt-10 pb-8 max-sm:px-4 max-sm:pt-8">
            <h3 className="max-w-[20ch] text-[clamp(1.75rem,3vw,2.5rem)]">
              {item.title}
            </h3>
            <p className="mt-4 max-w-[36ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
              {item.body}
            </p>
          </div>
          <div className="relative border-accent-foreground border-t bg-background-dimmed/60 px-8 py-6 max-sm:px-4">
            {item.href && (
              <Button
                color={index === 0 ? "primary" : "neutral"}
                render={<Link href={item.href} />}
              >
                {item.label ?? item.title}
                <ArrowRightIcon className="size-4" />
              </Button>
            )}
          </div>
        </TabsPanel>
      ))}
    </Tabs>
  </MarketingBand>
);

export namespace SupportContact {
  export type Props = { section: MarketingPage.Section };
}
