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
export const Journey = ({
  copy,
}: {
  copy: AppConfig["Messages"]["enterpriseHome"]["loop"];
}) => {
  const reducedMotion = useReducedMotion();
  return (
    <MarketingBand className="enterprise-journey-panel marketing-field">
      <Tabs defaultValue="connect">
        <TabsList aria-label={copy.title} className="enterprise-stage-list">
          {copy.steps.map((step, index) => {
            const Icon = stageIcons[index];
            return (
              <Tab
                key={step.id}
                value={step.id}
                className="enterprise-stage-tab"
              >
                <span className="enterprise-stage-number">
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
                className="enterprise-stage-content"
                initial={false}
                animate={
                  reducedMotion
                    ? { opacity: 1, y: 0 }
                    : { opacity: [0.7, 1], y: [6, 0] }
                }
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="enterprise-stage-heading">
                  {Icon && (
                    <Icon aria-hidden className="size-14 text-primary" />
                  )}
                  <div>
                    <h2>{step.title}</h2>
                    {step.id === "simulate" && (
                      <div className="enterprise-stage-providers">
                        <ProviderLogo provider="chatgpt" />
                        <ProviderLogo provider="claude" />
                        <ProviderLogo provider="gemini" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="enterprise-stage-body">
                  <p>{step.body}</p>
                  <ul>
                    {step.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                  <Link
                    href={`/platform/${step.id}`}
                    className="marketing-item-link"
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
      <p className="enterprise-stage-note">{copy.description}</p>
    </MarketingBand>
  );
};
