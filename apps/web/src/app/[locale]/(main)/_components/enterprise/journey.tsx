"use client";

import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceFilePenIcon,
  CommerceGlobePointerIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { useMediaQuery } from "@zenncore/web/hooks";
import type { AppConfig } from "next-intl";
import { MarketingBand } from "@/components/marketing/primitives";
import { Motion } from "@/components/motion";
import { Link } from "@/i18n/navigation";
import { JourneyArtwork } from "./journey-artwork";

const stages = [
  CommercePlug_3SparkleIcon,
  CommerceChartActivity_2Icon,
  CommerceFilePenIcon,
  CommerceBasketShoppingIcon,
  CommerceGlobePointerIcon,
] as const;

export const Journey = ({ copy }: Journey.Props) => {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", {});

  return (
    <MarketingBand className="enterprise-journey-panel bg-background">
      <Tabs defaultValue="connect">
        <div className="enterprise-stage-list flex flex-wrap items-center justify-between gap-6 border-accent-foreground border-b bg-background-dimmed px-8 py-6 max-sm:gap-4 max-sm:px-4 max-sm:py-4">
          <h2 className="max-w-[22ch] font-heading text-2xl leading-tight tracking-tight max-sm:max-w-none max-sm:text-xl">
            {copy.title}
          </h2>
          <TabsList
            aria-label={copy.title}
            className="grid grid-cols-5 gap-1 rounded-lg border-0 bg-background p-1 max-sm:w-full"
          >
            {copy.steps.map((step, index) => {
              const Icon = stages[index];
              return (
                <Tab
                  key={step.id}
                  value={step.id}
                  className="h-12 gap-2 rounded-md border-0 px-4 text-foreground text-sm before:hidden hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 data-[active]:bg-background-rich data-selected:bg-background-rich data-[active]:text-primary-text data-selected:text-primary-text max-sm:h-14 max-sm:flex-col max-sm:gap-1 max-sm:px-1 max-sm:text-xs"
                >
                  {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
                  {step.title}
                </Tab>
              );
            })}
          </TabsList>
        </div>
        {copy.steps.map((step) => (
          <TabsPanel key={step.id} value={step.id}>
            <Motion.Up
              className="grid min-h-[360px] grid-cols-[5fr_6fr] bg-background-rich max-[801px]:grid-cols-1"
              initial={false}
              animate={reduced ? { opacity: 1 } : { opacity: [0.5, 1] }}
              transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
            >
              <div className="flex min-w-0 flex-col justify-center px-8 py-10 max-sm:px-4 max-sm:py-8">
                <p className="max-w-[34ch] text-[clamp(1.125rem,1.8vw,1.5rem)] text-foreground leading-[1.5] max-sm:text-lg">
                  {step.body}
                </p>
                <div className="mt-8 max-sm:mt-6">
                  <Button render={<Link href={step.href} />}>
                    {step.label}
                    <ArrowRightIcon aria-hidden className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="enterprise-stage-body relative flex min-w-0 flex-col justify-between border-accent-foreground border-l bg-linear-to-br from-primary/5 via-background-rich to-background-rich max-[801px]:border-t max-[801px]:border-l-0">
                <JourneyArtwork stage={step.id} />
                <ul className="grid grid-cols-3 border-accent-foreground border-t px-4 text-center text-foreground-dimmed text-xs leading-snug max-sm:px-2">
                  {step.tags.map((tag) => (
                    <li
                      key={tag}
                      className="flex min-h-16 items-center justify-center px-4 py-4 max-sm:px-2"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </Motion.Up>
          </TabsPanel>
        ))}
      </Tabs>
    </MarketingBand>
  );
};

export namespace Journey {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["loop"];
  };
}
