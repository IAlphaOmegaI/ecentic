"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";
import type { ReactNode } from "react";
import { CommerceFigure } from "@/components/marketing/commerce-figure";

const endpoints = ["/api/v1", "/api/v1/discovery", "/api/v1/plans"] as const;

export const IndexQuickstart = ({
  content,
  copy,
  examples,
}: IndexQuickstart.Props) => (
  <Tabs defaultValue={endpoints[0]}>
    <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-b px-8 py-6 max-sm:px-4">
      <p id="quickstart-label" className="font-medium text-foreground">
        {copy.label}
      </p>
      <TabsList aria-labelledby="quickstart-label">
        {endpoints.map((endpoint, index) => (
          <Tab
            key={endpoint}
            value={endpoint}
            className="h-10 px-4 data-active:bg-primary data-selected:bg-primary"
          >
            {copy.tabs[index]}
          </Tab>
        ))}
      </TabsList>
    </div>
    <div className="grid gap-px bg-accent-foreground md:grid-cols-[4fr_7fr]">
      <div className="flex min-w-0 flex-col justify-between gap-4 bg-background-dimmed p-8 max-sm:p-4">
        <CommerceFigure kind="document" surface="field" className="min-h-56" />
        <div className="flex flex-col gap-4">
          <p className="font-medium text-foreground">{copy.access}</p>
          <p className="text-foreground-dimmed text-sm leading-relaxed">
            {content.intro}
          </p>
        </div>
      </div>
      <div className="min-w-0 bg-background">
        {endpoints.map((endpoint, index) => (
          <TabsPanel key={endpoint} value={endpoint} className="outline-none">
            <div className="flex min-h-96 flex-col gap-6 p-8 max-sm:min-h-0 max-sm:p-4">
              <div>
                <h3>{content.steps[index]?.title}</h3>
                <p className="mt-4 text-foreground-dimmed leading-relaxed">
                  {content.steps[index]?.description}
                </p>
              </div>
              {examples[index]}
              <dl className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-accent-foreground border-b pb-6">
                <div className="min-w-0">
                  <dt className="text-foreground-dimmed text-sm">
                    {copy.request}
                  </dt>
                  <dd className="mt-2 break-all font-mono text-foreground text-xs">
                    <span className="block sm:inline">GET </span>
                    {endpoint}
                  </dd>
                </div>
                <div aria-hidden="true">
                  <ArrowRightIcon className="size-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <dt className="text-foreground-dimmed text-sm">
                    {copy.response}
                  </dt>
                  <dd className="mt-2 break-all font-mono text-foreground text-xs">
                    application/json
                  </dd>
                </div>
              </dl>
              <div className="mt-auto">
                <Button color="neutral" render={<a href={endpoint} />}>
                  {copy.action.primary}
                  <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          </TabsPanel>
        ))}
      </div>
    </div>
  </Tabs>
);

export namespace IndexQuickstart {
  export type Props = {
    content: AppConfig["Messages"]["docs"]["quickstart"];
    copy: AppConfig["Messages"]["docsIndexPage"]["quickstart"];
    examples: readonly ReactNode[];
  };
}
