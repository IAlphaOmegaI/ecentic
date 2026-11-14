"use client";

import {
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import type { AppConfig } from "next-intl";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { useSequence } from "@/components/marketing/interactive/use-sequence";
import type { MarketingPage } from "@/components/marketing/page";
import { Plus } from "@/components/plus";
import { PlatformProviderStack } from "../provider-stack";

const icons = [
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceFileShieldIcon,
  CommerceFilePenIcon,
] as const;

const subjects = ["catalog", "shoppingBot", "document", "workflow"] as const;

export const SimulationProcess = ({
  items,
  labels,
}: {
  items: NonNullable<MarketingPage.Section["items"]>;
  labels: AppConfig["Messages"]["reviewReplay"]["process"];
}) => {
  const {
    container,
    active: selected,
    enhanced,
    playing,
    pause,
  } = useSequence({ length: items.length });
  const captions = [
    labels.matchup,
    labels.compare,
    labels.diagnose,
    labels.improve,
  ];
  return (
    <div
      ref={container}
      onPointerDownCapture={pause}
      onFocusCapture={pause}
      data-current={selected}
      data-playing={playing}
      className="grid min-w-0 grid-cols-2 border-accent-foreground border-t max-md:grid-cols-1"
      data-simulation-process=""
    >
      <ol className="relative min-w-0 border-accent-foreground border-r max-md:border-r-0">
        {items.map((item, index) => {
          const Icon = icons[index] ?? CommerceFileShieldIcon;
          return (
            <li
              key={item.title}
              className="relative grid grid-cols-[72px_1fr] border-accent-foreground border-b last:border-b-0 max-sm:grid-cols-[56px_1fr]"
            >
              <div className="relative flex justify-center pt-8 before:absolute before:inset-y-0 before:left-1/2 before:border-accent-foreground before:border-l">
                <span
                  aria-hidden
                  className={cn(
                    "relative grid size-12 shrink-0 place-items-center border bg-background",
                    index === selected && enhanced
                      ? "border-primary/40 text-primary-text"
                      : "border-accent-foreground text-foreground-dimmed",
                  )}
                >
                  <Icon className="size-6" />
                </span>
              </div>
              <div className="py-8 pr-8 max-sm:pr-4">
                <h3
                  className={cn(
                    "font-heading text-2xl",
                    index === selected && "text-primary-text",
                  )}
                >
                  {item.title}
                </h3>
                <p className="mt-4 max-w-[42ch] text-foreground-dimmed leading-relaxed">
                  {item.body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="relative flex min-w-0 flex-col justify-center bg-background-dimmed px-8 py-8 max-sm:px-4 max-md:border-accent-foreground max-md:border-t">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <p className="text-center text-primary-text text-sm">
          {captions[selected]}
        </p>
        <CommerceFigure
          kind={subjects[selected] ?? "inspection"}
          surface="field"
          label={items[selected]?.title}
          className="mx-auto max-w-110"
        />
        <div
          className={cn(
            "flex min-h-20 flex-col gap-4",
            selected !== 1 && "invisible",
          )}
        >
          <PlatformProviderStack providers={["chatgpt", "claude", "gemini"]} />
          <p className="text-center text-foreground-dimmed text-sm">
            ChatGPT · Claude · Gemini
          </p>
        </div>
      </div>
    </div>
  );
};
