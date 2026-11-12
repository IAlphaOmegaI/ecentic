"use client";

import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import { useState } from "react";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import type { MarketingPage } from "@/components/marketing/page";
import { Plus } from "@/components/plus";
import { PlatformProviderStack } from "../provider-stack";

const subjects = ["catalog", "shoppingBot", "document", "workflow"] as const;

export const SimulationProcess = ({
  items,
  labels,
}: {
  items: NonNullable<MarketingPage.Section["items"]>;
  labels: AppConfig["Messages"]["reviewReplay"]["process"];
}) => {
  const [selected, setSelected] = useState(0);
  const captions = [
    labels.matchup,
    labels.compare,
    labels.diagnose,
    labels.improve,
  ];
  return (
    <div
      className="grid min-w-0 grid-cols-2 border-accent-foreground border-t max-md:grid-cols-1"
      data-simulation-process=""
    >
      <ol className="relative min-w-0 border-accent-foreground border-r max-md:border-r-0">
        {items.map((item, index) => (
          <li
            key={item.title}
            className="relative grid grid-cols-[72px_1fr] border-accent-foreground border-b last:border-b-0 max-sm:grid-cols-[56px_1fr]"
          >
            <div className="relative flex justify-center pt-8 before:absolute before:inset-y-0 before:left-1/2 before:border-accent-foreground before:border-l">
              <span className="relative h-fit bg-background py-2">
                <Button
                  color={index === selected ? "primary" : "neutral"}
                  aria-pressed={index === selected}
                  aria-label={item.title}
                  onClick={() => setSelected(index)}
                >
                  {String(index + 1).padStart(2, "0")}
                </Button>
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
        ))}
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
          className="mx-auto max-w-[440px]"
        />
        {selected === 1 && (
          <div className="flex flex-col gap-4">
            <PlatformProviderStack
              providers={["chatgpt", "claude", "gemini"]}
            />
            <p className="text-center text-foreground-dimmed text-sm">
              ChatGPT · Claude · Gemini
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
