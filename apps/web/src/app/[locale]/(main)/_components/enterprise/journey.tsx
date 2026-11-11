"use client";
import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceFilePenIcon,
  CommerceGlobePointerIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { useReducedMotion } from "motion/react";
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
  const reducedMotion = useReducedMotion();
  return (
    <MarketingBand className="enterprise-journey-panel">
      <Tabs defaultValue="connect">
        <TabsList
          aria-label={copy.title}
          className="enterprise-stage-list grid w-full grid-cols-5 overflow-visible rounded-none border-0 max-sm:grid-cols-[repeat(5,minmax(130px,1fr))] max-sm:overflow-x-auto"
        >
          {copy.steps.map((step, index) => {
            const Icon = stageIcons[index];
            return (
              <Tab
                key={step.id}
                value={step.id}
                className="enterprise-stage-tab max-sm:[&>span:last-child]:text-(length:--text-base) relative grid h-auto grid-cols-[1fr_auto] grid-rows-[auto_auto] items-center justify-start gap-x-2.5 gap-y-3.5 rounded-none border-[var(--rail-color)] border-r border-b px-7 py-[22px] text-left text-foreground before:hidden last:border-r-0 focus-visible:outline-2 focus-visible:outline-primary-text focus-visible:-outline-offset-5 data-[active]:border-b-transparent data-selected:border-b-transparent data-[active]:bg-background data-selected:bg-background data-[active]:text-primary-text data-selected:text-primary-text max-sm:px-4 max-sm:py-[18px] max-[1001px]:px-[18px] [&>span:last-child]:col-span-full [&>span:last-child]:font-medium [&>span:last-child]:text-[19px] max-sm:[&_svg]:size-6"
              >
                <span className="enterprise-stage-number font-heading text-[27px] max-sm:text-[22px]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {Icon && <Icon aria-hidden className="size-7" />}
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
                className="enterprise-stage-content grid grid-cols-[2fr_3fr] bg-background max-sm:grid-cols-1"
                initial={false}
                animate={
                  reducedMotion
                    ? { opacity: 1, y: 0 }
                    : { opacity: [0.7, 1], y: [6, 0] }
                }
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="enterprise-stage-heading [&_h2]:text-(length:--text-5xl) max-sm:[&_h2]:text-(length:--text-4xl) flex items-center gap-6 px-7 py-[38px] max-sm:gap-[18px] max-sm:px-4 max-sm:pt-7 max-sm:pb-0 max-sm:[&_svg]:size-9">
                  {Icon && (
                    <Icon aria-hidden className="size-14 text-primary" />
                  )}
                  <div>
                    <h2>{step.title}</h2>
                    {step.id === "simulate" && (
                      <div className="enterprise-stage-providers mt-[22px] flex items-center gap-[18px] [&_img]:size-[26px]">
                        <ProviderLogo provider="chatgpt" />
                        <ProviderLogo provider="claude" />
                        <ProviderLogo provider="gemini" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="enterprise-stage-body [&_p]:text-(length:--text-lg) max-sm:[&_p]:text-(length:--text-base) relative border-[var(--rail-color)] border-l px-7 py-[38px] max-sm:border-0 max-sm:px-4 max-sm:pt-6 max-sm:pb-7 [&_.marketing-item-link]:mt-6 [&_.marketing-item-link]:inline-flex [&_.marketing-item-link]:items-center [&_.marketing-item-link]:gap-4 [&_.marketing-item-link]:text-primary-text [&_p]:max-w-[60ch] [&_p]:leading-normal [&_ul]:mt-[22px] [&_ul]:flex [&_ul]:flex-wrap [&_ul]:gap-x-6 [&_ul]:gap-y-2 [&_ul]:text-[13px] [&_ul]:text-foreground-dimmed">
                  <p>{step.body}</p>
                  <ul>
                    {step.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                  <Link
                    href={`/platform/${step.id}`}
                    className="marketing-item-link underline decoration-1 underline-offset-4"
                  >
                    {step.label}
                    <ArrowRightIcon aria-hidden className="size-4" />
                  </Link>
                </div>
              </Motion.Up>
            </TabsPanel>
          );
        })}
      </Tabs>
      <p className="enterprise-stage-note border-[var(--rail-color)] border-t px-7 py-[15px] text-[13px] max-sm:p-4">
        {copy.description}
      </p>
    </MarketingBand>
  );
};

export namespace Journey {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["loop"];
  };
}
