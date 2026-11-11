"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import { useState } from "react";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import type { MarketingPage } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const artwork = ["bag", "commerce", "cart", "console", "bag"] as const;

export const ResourcesTools = ({ section }: ResourcesTools.Props) => {
  const items = section.items ?? [];
  const [open, setOpen] = useState<string[]>([items[0]?.title ?? ""]);
  const selected = Math.max(
    0,
    items.findIndex((item) => item.title === open[0]),
  );

  return (
    <MarketingBand
      id={section.id}
      className="scroll-mt-24 [&>.marketing-rail>.marketing-guides]:hidden"
    >
      <div className="grid grid-cols-[1fr_2fr] max-md:grid-cols-1">
        <div className="relative flex min-w-0 flex-col border-accent-foreground border-r bg-background-dimmed max-md:border-r-0 max-md:border-b">
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-md:hidden" />
          <div className="px-8 pt-12 max-sm:px-4 max-sm:pt-8">
            <span className="mb-8 block text-3xl text-primary-text">01</span>
            <h2>{section.title}</h2>
          </div>
          <div className="relative min-h-64 flex-1 text-primary max-md:h-56 max-md:min-h-0 max-md:flex-none">
            <div className="absolute inset-4">
              <EvolvingAscii artwork={artwork[selected] ?? "commerce"} />
            </div>
          </div>
          {section.links && (
            <div className="px-8 pb-8 max-sm:px-4 [&>.marketing-actions]:mt-0">
              <MarketingActions actions={section.links} />
            </div>
          )}
        </div>
        <Accordion
          value={open}
          onValueChange={(value) =>
            setOpen(value.filter((entry) => typeof entry === "string"))
          }
          className="min-w-0 justify-start"
        >
          {items.map((item, index) => (
            <AccordionItem
              value={item.title}
              key={item.title}
              className="border-accent-foreground last:border-b-0 data-open:bg-background-dimmed/40"
            >
              <AccordionTrigger
                className="min-h-24 items-center px-8 py-6 font-heading text-2xl leading-tight hover:bg-background-dimmed/60 focus-visible:outline-offset-[-4px] max-sm:min-h-20 max-sm:px-4 max-sm:text-xl"
                classList={{ trigger: { icon: "mr-0 size-4 shrink-0" } }}
              >
                <span className="flex items-baseline gap-4">
                  <span className="text-primary-text text-sm tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionPanel>
                <div className="px-8 pb-8 max-sm:px-4">
                  <p className="mb-6 max-w-[58ch] text-foreground-dimmed">
                    {item.body}
                  </p>
                  {item.href && (
                    <Button color="primary" render={<Link href={item.href} />}>
                      {item.label ?? item.title}
                      <ArrowRightIcon className="size-4" />
                    </Button>
                  )}
                </div>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </MarketingBand>
  );
};

export namespace ResourcesTools {
  export type Props = { section: MarketingPage.Section };
}
