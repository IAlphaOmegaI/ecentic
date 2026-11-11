"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { ReactNode } from "react";

export const GuideToolExplorer = ({
  tools,
  labels,
  table,
}: GuideToolExplorer.Props) => (
  <Tabs defaultValue="table" className="min-w-0">
    <div className="border-accent-foreground border-y bg-background-dimmed px-7 py-4 max-sm:px-4">
      <TabsList aria-label={labels.views.label} className="max-w-full">
        <Tab
          value="table"
          className="h-auto min-h-11 px-4 py-2 text-sm data-[active]:bg-primary data-selected:bg-primary"
        >
          {labels.views.table}
        </Tab>
        <Tab
          value="tool"
          className="h-auto min-h-11 px-4 py-2 text-sm data-[active]:bg-primary data-selected:bg-primary"
        >
          {labels.views.tool}
        </Tab>
      </TabsList>
    </div>
    <TabsPanel value="table" className="min-w-0 outline-primary">
      {table}
    </TabsPanel>
    <TabsPanel value="tool" className="min-w-0 outline-primary">
      <Accordion multiple defaultValue={[tools[0]?.name ?? ""]}>
        {tools.map((tool, index) => (
          <AccordionItem
            key={tool.name}
            value={tool.name}
            className="border-accent-foreground bg-background last:border-b-0"
          >
            <AccordionTrigger
              className="scroll-mt-40 items-center px-7 py-6 outline-offset-[-4px] hover:bg-background-dimmed focus-visible:outline-2 focus-visible:outline-primary max-sm:px-4"
              classList={{
                trigger: {
                  icon: "size-4 shrink-0 motion-reduce:transition-none",
                },
              }}
            >
              <span className="flex min-w-0 items-baseline gap-4">
                <span
                  aria-hidden="true"
                  className="text-primary-text text-sm tabular-nums"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block font-heading text-2xl text-foreground-rich">
                    {tool.name}
                    {tool.us && (
                      <span className="ml-2 font-body text-primary-text text-sm">
                        {labels.usLabel}
                      </span>
                    )}
                  </span>
                  <span className="mt-2 block font-normal text-foreground-dimmed text-sm">
                    {tool.category}
                  </span>
                </span>
              </span>
            </AccordionTrigger>
            <AccordionPanel className="motion-reduce:transition-none">
              <dl className="grid border-accent-foreground border-t md:grid-cols-2">
                <div className="bg-background-rich px-7 py-8 max-sm:px-4">
                  <dt className="font-medium text-foreground-rich text-sm">
                    {labels.bestAt}
                  </dt>
                  <dd className="mt-4 max-w-lg text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                    {tool.bestAt}
                  </dd>
                </div>
                <div className="border-accent-foreground border-t bg-background-dimmed px-7 py-8 max-sm:px-4 md:border-t-0 md:border-l">
                  <dt className="font-medium text-foreground-rich text-sm">
                    {labels.wrongPick}
                  </dt>
                  <dd className="mt-4 max-w-lg text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                    {tool.wrongPick}
                  </dd>
                </div>
              </dl>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </TabsPanel>
  </Tabs>
);

export namespace GuideToolExplorer {
  export type Props = {
    tools: readonly {
      name: string;
      category: string;
      bestAt: string;
      wrongPick: string;
      us: boolean;
    }[];
    labels: {
      bestAt: string;
      wrongPick: string;
      usLabel: string;
      views: { label: string; table: string; tool: string };
    };
    table: ReactNode;
  };
}
