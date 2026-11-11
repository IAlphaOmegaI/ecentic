"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import type { MarketingPage } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const tools = [
  { key: "score", artwork: "bag" },
  { key: "validator", artwork: "commerce" },
  { key: "playground", artwork: "cart" },
  { key: "scanner", artwork: "console" },
  { key: "compare", artwork: "bag" },
] as const;

export const ToolsDirectory = ({ section, copy }: ToolsDirectory.Props) => (
  <MarketingBand
    id={section.id}
    className="scroll-mt-24 [&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="grid grid-cols-2 items-end gap-8 px-8 py-12 max-sm:px-4 max-sm:py-8 max-md:grid-cols-1 max-md:gap-4">
      <h2>{section.title}</h2>
      <p className="max-w-[54ch] text-foreground-dimmed">{copy.description}</p>
    </div>
    <Tabs defaultValue="score" data-tools-directory>
      <div className="border-accent-foreground border-t px-8 py-6 max-sm:px-4 max-sm:py-4">
        <TabsList
          aria-label={section.title}
          className="grid w-full grid-cols-5 max-lg:grid-cols-2"
        >
          {tools.map((tool, index) => (
            <Tab
              key={tool.key}
              value={tool.key}
              className="group h-auto min-h-28 min-w-0 flex-col items-start justify-between gap-4 whitespace-normal border-accent-foreground p-4 text-left hover:bg-background-dimmed data-[active]:bg-primary-text data-[active]:text-background-rich max-sm:min-h-24 max-sm:gap-2 max-lg:border-b max-lg:last:col-span-2 max-lg:last:border-b-0 max-lg:[&:nth-child(2n)]:border-r-0"
            >
              <span className="font-heading text-lg leading-tight">
                {section.items?.[index]?.title}
              </span>
              <span className="flex w-full items-center justify-between gap-2 text-xs leading-snug">
                <span>{copy.tools[tool.key].purpose}</span>
                <ArrowRightIcon className="size-4 shrink-0 opacity-0 group-data-[active]:opacity-100" />
              </span>
            </Tab>
          ))}
        </TabsList>
      </div>
      {tools.map((tool, index) => {
        const item = section.items?.[index];
        const detail = copy.tools[tool.key];
        if (!item) return null;

        return (
          <TabsPanel
            value={tool.key}
            key={tool.key}
            keepMounted
            data-tools-panel={tool.key}
            className="border-accent-foreground border-t data-[hidden]:hidden"
          >
            <div className="grid grid-cols-[7fr_5fr] max-md:grid-cols-1">
              <div className="flex min-w-0 flex-col">
                <div className="flex min-h-72 flex-1 flex-col items-start px-8 py-10 max-sm:min-h-0 max-sm:px-4 max-sm:py-8">
                  <h3 className="text-[clamp(1.8rem,2.6vw,2.6rem)]">
                    {item.title}
                  </h3>
                  <p className="mt-4 max-w-[52ch] text-foreground-dimmed text-lg max-sm:text-base">
                    {item.body}
                  </p>
                  {item.href && (
                    <div className="mt-8">
                      <Button
                        color="primary"
                        render={<Link href={item.href} />}
                      >
                        {item.label ?? item.title}
                        <ArrowRightIcon className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <dl className="grid grid-cols-2 border-accent-foreground border-t max-sm:grid-cols-1">
                  <div className="min-w-0 border-accent-foreground border-r px-8 py-6 max-sm:border-r-0 max-sm:border-b max-sm:px-4">
                    <dt className="text-foreground-dimmed text-sm">
                      {copy.inputLabel}
                    </dt>
                    <dd className="mt-2 font-medium text-foreground-rich">
                      {detail.input}
                    </dd>
                  </div>
                  <div className="min-w-0 px-8 py-6 max-sm:px-4">
                    <dt className="text-foreground-dimmed text-sm">
                      {copy.accessLabel}
                    </dt>
                    <dd className="mt-2 font-medium text-foreground-rich">
                      {detail.access}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="relative flex min-w-0 flex-col border-accent-foreground border-l bg-background-dimmed max-md:border-t max-md:border-l-0">
                <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
                <div className="relative min-h-64 flex-1 text-primary-text max-md:h-60 max-md:min-h-0 max-md:flex-none">
                  <div className="absolute inset-6 max-sm:inset-4">
                    <EvolvingAscii artwork={tool.artwork} />
                  </div>
                </div>
                <ol className="grid grid-cols-3 border-accent-foreground border-t">
                  {detail.steps.map((step, position) => (
                    <li
                      key={step}
                      className="relative min-w-0 border-accent-foreground border-r px-4 py-6 last:border-r-0"
                    >
                      <span className="block text-2xl text-primary-text tabular-nums">
                        {String(position + 1).padStart(2, "0")}
                      </span>
                      <span className="mt-2 block text-sm leading-snug">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_2fr] gap-8 border-accent-foreground border-t bg-background-dimmed/40 px-8 py-6 max-sm:px-4 max-md:grid-cols-1 max-md:gap-2">
              <p className="font-medium text-foreground-rich">
                {copy.resultLabel}
              </p>
              <p className="max-w-[70ch] text-foreground-dimmed text-sm">
                {detail.limit}
              </p>
            </div>
          </TabsPanel>
        );
      })}
    </Tabs>
  </MarketingBand>
);

export namespace ToolsDirectory {
  export type Props = {
    section: MarketingPage.Section;
    copy: AppConfig["Messages"]["toolsPage"];
  };
}
