"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";

export const VersioningLifecycle = ({ copy }: VersioningLifecycle.Props) => (
  <Tabs defaultValue="Deprecation" className="min-w-0">
    <div className="border-accent-foreground border-b px-8 py-6 max-sm:px-4">
      <p className="mb-4 text-foreground-dimmed text-sm leading-relaxed">
        {copy.hint}
      </p>
      <TabsList aria-label={copy.label} className="w-full">
        {copy.items.map((item) => (
          <Tab
            key={item.header}
            value={item.header}
            className="min-h-12 min-w-0 flex-1 px-2 font-mono text-xs focus-visible:before:outline-foreground-rich data-[active]:bg-primary-text data-[active]:text-background-rich sm:text-sm"
          >
            {item.header}
          </Tab>
        ))}
      </TabsList>
    </div>
    {copy.items.map((item) => (
      <TabsPanel
        key={item.header}
        value={item.header}
        keepMounted
        className="min-w-0 px-8 py-8 focus-visible:outline-2 focus-visible:outline-primary-text focus-visible:-outline-offset-2 max-sm:px-4"
      >
        <p className="mb-4 text-foreground-dimmed text-sm">{item.meaning}</p>
        <h3 className="text-2xl text-foreground-rich">{item.title}</h3>
        <p className="mt-4 max-w-xl text-foreground-dimmed leading-relaxed">
          {item.description}
        </p>
      </TabsPanel>
    ))}
  </Tabs>
);

export namespace VersioningLifecycle {
  export type Props = {
    copy: AppConfig["Messages"]["docsVersioningPage"]["lifecycle"];
  };
}
