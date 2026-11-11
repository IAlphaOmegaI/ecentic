"use client";

import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { useState } from "react";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import type { MarketingPage } from "@/components/marketing/page";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";

const icons = [
  CommercePlug_3SparkleIcon,
  CommerceFileShieldIcon,
  CommerceBasketShoppingIcon,
  CommerceGlobePointerIcon,
] as const;
const labels = [
  "WordPress.org",
  "wp-admin",
  "ChatGPT · Claude · Gemini",
  "/.well-known/ucp",
] as const;

const SetupGraphic = ({ index }: { index: number }) => {
  const Icon = icons[index] ?? CommercePlug_3SparkleIcon;
  return (
    <div
      aria-hidden
      className="flex min-h-48 items-center justify-center gap-6 border-accent-foreground border-b px-7 py-10 max-sm:px-4"
    >
      {index === 2 ? (
        <div className="flex flex-col items-center gap-6">
          {(["chatgpt", "claude", "gemini"] as const).map((provider) => (
            <ProviderLogo
              key={provider}
              provider={provider}
              decorative
              className="h-8 max-w-24 rounded-none"
            />
          ))}
        </div>
      ) : (
        <Icon className="size-20 shrink-0 text-primary-text" />
      )}
      <div className="relative h-px w-16 bg-primary/30">
        <ArrowRightIcon className="absolute top-1/2 right-0 size-6 -translate-y-1/2 text-primary-text" />
      </div>
      <ProviderLogo
        provider="woocommerce"
        decorative
        className="h-16 max-w-40 rounded-none max-sm:max-w-28"
      />
    </div>
  );
};

export const WooSetupRoadmap = ({
  section,
}: {
  section: MarketingPage.Section;
}) => {
  const [selected, setSelected] = useState("0");
  const { ready, reduced } = useInteractive();
  const items = section.items ?? [];

  if (!ready || reduced) {
    return (
      <ol
        className="m-0 list-none border-accent-foreground border-t p-0"
        data-woo-roadmap="static"
      >
        {items.map((item, index) => {
          const Icon = icons[index] ?? CommercePlug_3SparkleIcon;
          return (
            <li
              key={item.title}
              className="relative grid grid-cols-[32px_1fr] gap-6 border-accent-foreground border-b px-7 py-8 last:border-b-0 max-sm:px-4"
            >
              <Icon aria-hidden className="size-8 text-primary-text" />
              <div>
                <h3>
                  <span className="mr-3 text-primary-text">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.title}
                </h3>
                <p className="mt-4 max-w-[70ch] text-foreground-dimmed">
                  {item.body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div
      className="relative border-accent-foreground border-t"
      data-woo-roadmap="interactive"
    >
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Tabs
        value={selected}
        orientation="vertical"
        onValueChange={(value) => setSelected(String(value))}
        className="grid md:grid-cols-2"
      >
        <TabsList
          aria-label={section.title}
          activateOnFocus
          className="relative grid w-full overflow-visible rounded-none border-0 px-7 py-8 max-sm:px-4"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-16 left-11 w-px bg-accent-foreground max-sm:left-8"
          />
          {items.map((item, index) => {
            const Icon = icons[index] ?? CommercePlug_3SparkleIcon;
            const active = selected === String(index);
            return (
              <Tab
                key={item.title}
                value={String(index)}
                className={cn(
                  "relative grid h-auto min-h-24 min-w-0 grid-cols-[32px_1fr] items-center justify-start gap-6 rounded-none border-0 py-4 text-left text-foreground before:hidden hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-solid data-[active]:text-foreground-rich data-selected:text-foreground-rich",
                  active && "text-foreground-rich",
                )}
              >
                <span className="relative grid size-8 place-items-center bg-background">
                  <Icon
                    aria-hidden
                    className={cn(
                      "size-8",
                      active ? "text-primary-text" : "text-foreground-dimmed",
                    )}
                  />
                </span>
                <span className="flex min-w-0 items-start gap-4">
                  <span
                    aria-hidden
                    className={cn(
                      "font-heading text-xl tabular-nums",
                      active ? "text-primary-text" : "text-foreground-dimmed",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-heading text-xl leading-snug sm:text-2xl">
                    {item.title}
                  </span>
                </span>
              </Tab>
            );
          })}
        </TabsList>
        <div className="relative min-w-0 border-accent-foreground bg-background-dimmed max-md:border-t md:border-l">
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2 max-md:hidden" />
          {items.map((item, index) => (
            <TabsPanel
              key={item.title}
              value={String(index)}
              className="min-w-0 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-solid focus-visible:-outline-offset-4"
            >
              <SetupGraphic index={index} />
              <div className="px-7 py-8 max-sm:px-4">
                <code className="mb-4 block break-words text-primary-text text-sm">
                  {labels[index]}
                </code>
                <h3>{item.title}</h3>
                <p className="mt-4 max-w-[55ch] text-foreground-dimmed">
                  {item.body}
                </p>
              </div>
            </TabsPanel>
          ))}
        </div>
      </Tabs>
    </div>
  );
};
