"use client";

import {
  ArrowRightIcon,
  ChartCircularIcon,
  CommerceChartActivity_2Icon,
  CommerceCode_3Icon,
  ShieldCheckIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import type { MarketingPage } from "@/components/marketing/page";
import { MarketingFeatureBand } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const tools = [
  { key: "score", artwork: "catalog", icon: ChartCircularIcon },
  { key: "validator", artwork: "inspection", icon: ShieldCheckIcon },
  { key: "playground", artwork: "checkout", icon: ShoppingCartIcon },
  { key: "scanner", artwork: "document", icon: CommerceCode_3Icon },
  { key: "compare", artwork: "catalog", icon: CommerceChartActivity_2Icon },
] as const;

export const ToolsDirectory = ({ section, copy }: ToolsDirectory.Props) => (
  <MarketingFeatureBand id={section.id} tone="dark" className="scroll-mt-24">
    <div className="marketing-section-grid relative border-background-rich/15 border-y">
      <MarketingEdgeCrosses />
      <MarketingEdgeCrosses edge="bottom" />
      <div className="grid grid-cols-2 items-end gap-8 px-8 py-12 max-sm:px-4 max-sm:py-8 max-md:grid-cols-1 max-md:gap-4">
        <h2>{section.title}</h2>
        <p className="max-w-[54ch] text-background-rich/65">
          {copy.description}
        </p>
      </div>
      <Tabs defaultValue="score" data-tools-directory>
        <div className="marketing-section-grid relative border-background-rich/15 border-t">
          <MarketingEdgeCrosses />
          <TabsList
            aria-label={section.title}
            className="grid w-full grid-cols-5 overflow-visible rounded-none border-0 max-lg:grid-cols-2"
          >
            {tools.map((tool, index) => (
              <Tab
                key={tool.key}
                value={tool.key}
                className="group relative h-auto min-h-40 min-w-0 flex-col items-start justify-between gap-4 whitespace-normal border-background-rich/15 px-6 py-6 text-left text-background-rich/65 hover:bg-background-rich/5 hover:text-background-rich focus-visible:before:outline-primary-rich data-[active]:bg-linear-to-br data-[active]:from-primary/25 data-[active]:to-transparent data-[active]:text-background-rich max-sm:min-h-36 max-sm:px-4 max-lg:border-b max-lg:last:col-span-2 max-lg:last:border-b-0 max-lg:[&:nth-child(2n)]:border-r-0"
              >
                <tool.icon
                  className="size-6 shrink-0 text-primary-rich"
                  aria-hidden
                />
                <span
                  aria-hidden
                  className="absolute inset-x-6 bottom-0 h-px bg-primary-rich opacity-0 group-data-[active]:opacity-100"
                />
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
              className="marketing-section-grid relative border-background-rich/15 border-t data-[hidden]:hidden"
            >
              <MarketingEdgeCrosses />
              <div className="grid grid-cols-[7fr_5fr] max-md:grid-cols-1 md:grid-rows-[1fr_auto]">
                <div className="flex min-w-0 flex-col md:row-span-2 md:grid md:grid-rows-subgrid">
                  <div className="flex min-h-72 flex-1 flex-col items-start px-8 py-10 max-sm:min-h-0 max-sm:px-4 max-sm:py-8">
                    <h3 className="text-[clamp(1.8rem,2.6vw,2.6rem)]">
                      {item.title}
                    </h3>
                    <p className="mt-4 max-w-[52ch] text-background-rich/65 text-lg max-sm:text-base">
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
                  <dl className="relative grid grid-cols-2 border-background-rich/15 border-t max-sm:grid-cols-1">
                    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 md:hidden" />
                    <div className="relative min-w-0 border-background-rich/15 border-r px-8 py-6 max-sm:border-r-0 max-sm:border-b max-sm:px-4">
                      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-sm:hidden" />
                      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-sm:hidden" />
                      <MarketingEdgeCrosses
                        edge="bottom"
                        className="sm:hidden"
                      />
                      <dt className="text-background-rich/65 text-sm">
                        {copy.inputLabel}
                      </dt>
                      <dd className="mt-2 font-medium text-background-rich">
                        {detail.input}
                      </dd>
                    </div>
                    <div className="min-w-0 px-8 py-6 max-sm:px-4">
                      <dt className="text-background-rich/65 text-sm">
                        {copy.accessLabel}
                      </dt>
                      <dd className="mt-2 font-medium text-background-rich">
                        {detail.access}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="relative flex min-w-0 flex-col border-background-rich/15 border-l bg-linear-to-br from-primary/12 to-transparent max-md:border-t max-md:border-l-0 md:row-span-2 md:grid md:grid-rows-subgrid">
                  <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                  <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 md:hidden" />
                  <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2 max-md:hidden" />
                  <div className="relative min-h-64 flex-1 text-primary-rich max-md:h-60 max-md:min-h-0 max-md:flex-none">
                    <CommerceFigure
                      kind={tool.artwork}
                      surface="dark"
                      className="absolute inset-0 size-full bg-transparent"
                    />
                  </div>
                  <ol className="relative grid grid-cols-3 border-background-rich/15 border-t">
                    <MarketingEdgeCrosses />
                    {detail.steps.map((step, position) => (
                      <li
                        key={step}
                        className="relative min-w-0 border-background-rich/15 border-r px-4 py-6 last:border-r-0"
                      >
                        {position < detail.steps.length - 1 && (
                          <>
                            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
                            <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
                          </>
                        )}
                        <span className="block text-2xl text-primary-rich tabular-nums">
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
              <div className="marketing-section-grid relative grid grid-cols-[1fr_2fr] gap-8 border-background-rich/15 border-t bg-background-rich/3 px-8 py-6 max-sm:px-4 max-md:grid-cols-1 max-md:gap-2">
                <MarketingEdgeCrosses />
                <p className="font-medium text-background-rich">
                  {copy.resultLabel}
                </p>
                <p className="max-w-[70ch] text-background-rich/65 text-sm">
                  {detail.limit}
                </p>
              </div>
            </TabsPanel>
          );
        })}
      </Tabs>
    </div>
  </MarketingFeatureBand>
);

export namespace ToolsDirectory {
  export type Props = {
    section: MarketingPage.Section;
    copy: AppConfig["Messages"]["toolsPage"];
  };
}
