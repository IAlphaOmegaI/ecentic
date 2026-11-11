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
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Motion } from "@/components/motion";
import { Link } from "@/i18n/navigation";

const stageIcons = [
  CommercePlug_3SparkleIcon,
  CommerceChartActivity_2Icon,
  CommerceFilePenIcon,
  CommerceBasketShoppingIcon,
  CommerceGlobePointerIcon,
];
export const Journey = ({ copy }: Journey.Props) => {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", {});
  return (
    <MarketingBand className="enterprise-journey-panel bg-background-dimmed">
      <Tabs defaultValue="connect">
        <TabsList
          aria-label={copy.title}
          className="enterprise-stage-list grid w-full grid-cols-5 overflow-visible rounded-none border-0 border-[var(--rail-color)] border-b max-sm:grid-cols-[repeat(5,minmax(144px,1fr))] max-sm:overflow-x-auto"
        >
          {copy.steps.map((step, index) => {
            const Icon = stageIcons[index];
            return (
              <Tab
                key={step.id}
                value={step.id}
                className="enterprise-stage-tab relative grid h-auto grid-cols-[1fr_auto] grid-rows-[auto_auto] items-center justify-start gap-x-4 gap-y-4 rounded-none border-[var(--rail-color)] border-r px-6 py-6 text-left text-foreground before:hidden last:border-r-0 focus-visible:outline-2 focus-visible:outline-primary-text focus-visible:-outline-offset-4 data-[active]:bg-background-rich data-selected:bg-background-rich data-[active]:text-primary-text data-selected:text-primary-text max-sm:px-4 [&>span:last-child]:col-span-full [&>span:last-child]:font-heading [&>span:last-child]:font-medium [&>span:last-child]:text-2xl max-sm:[&>span:last-child]:text-xl"
              >
                <span className="enterprise-stage-number font-heading text-4xl leading-none max-sm:text-3xl">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {Icon && <Icon aria-hidden className="size-8" />}
                <span>{step.title}</span>
              </Tab>
            );
          })}
        </TabsList>
        {copy.steps.map((step, index) => {
          const Icon = stageIcons[index];
          return (
            <TabsPanel
              key={step.id}
              value={step.id}
              className="enterprise-stage-panel"
            >
              <Motion.Up
                className="enterprise-stage-content grid grid-cols-[2fr_3fr] bg-background-dimmed max-sm:grid-cols-1"
                initial={false}
                animate={
                  reduced
                    ? { opacity: 1, y: 0 }
                    : { opacity: [0.7, 1], y: [6, 0] }
                }
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="enterprise-stage-heading flex items-center gap-6 px-7 py-10 max-sm:gap-4 max-sm:px-4 max-sm:pt-8 max-sm:pb-0 [&_h2]:text-5xl max-sm:[&_h2]:text-4xl max-sm:[&_svg]:size-10">
                  {Icon && (
                    <Icon aria-hidden className="size-16 text-primary" />
                  )}
                  <div>
                    <h2>{step.title}</h2>
                    {step.id === "simulate" && (
                      <div className="enterprise-stage-providers mt-6 flex items-center gap-4 [&_img]:size-8">
                        <ProviderLogo provider="chatgpt" />
                        <ProviderLogo provider="claude" />
                        <ProviderLogo provider="gemini" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="enterprise-stage-body relative border-[var(--rail-color)] border-l px-7 py-10 max-sm:border-0 max-sm:px-4 max-sm:pt-6 max-sm:pb-8 [&_p]:max-w-[60ch] [&_p]:text-lg [&_p]:leading-relaxed max-sm:[&_p]:text-base [&_ul]:mt-6 [&_ul]:mb-6 [&_ul]:flex [&_ul]:flex-wrap [&_ul]:gap-x-6 [&_ul]:gap-y-2 [&_ul]:text-foreground [&_ul]:text-sm">
                  <p>{step.body}</p>
                  <ul>
                    {step.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                  <Button render={<Link href={`/platform/${step.id}`} />}>
                    {step.label}
                    <ArrowRightIcon aria-hidden className="size-4" />
                  </Button>
                </div>
              </Motion.Up>
            </TabsPanel>
          );
        })}
      </Tabs>
    </MarketingBand>
  );
};

export namespace Journey {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["loop"];
  };
}
