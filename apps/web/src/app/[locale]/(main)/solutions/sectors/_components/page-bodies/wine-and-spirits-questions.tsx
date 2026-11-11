"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";
import type { MarketingPage } from "@/components/marketing/page";
import { Plus } from "@/components/plus";

export const WineAndSpiritsQuestions = ({
  items,
  labels,
}: WineAndSpiritsQuestions.Props) => (
  <Tabs defaultValue={labels.entries[0]?.id}>
    <TabsList
      aria-label={labels.label}
      className="grid w-full grid-cols-3 rounded-none border-x-0 bg-background-dimmed"
    >
      {labels.entries.map((entry) => (
        <Tab
          key={entry.id}
          value={entry.id}
          className="h-auto min-h-16 whitespace-normal px-4 py-4 text-base leading-snug before:hidden hover:bg-background-rich focus-visible:-outline-offset-4 data-[active]:bg-primary-text data-selected:bg-primary-text data-[active]:text-background-rich data-selected:text-background-rich max-sm:text-sm"
        >
          {entry.label}
        </Tab>
      ))}
    </TabsList>
    {labels.entries.map((entry, index) => {
      const question = items[index];
      if (!question) return null;

      return (
        <TabsPanel key={entry.id} value={entry.id} keepMounted>
          <div className="relative grid md:grid-cols-[7fr_5fr]">
            <Plus className="top-0 left-[58.333%] -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
            <div className="flex min-w-0 flex-col px-4 py-8 sm:px-8 md:min-h-80">
              <p className="text-foreground-dimmed text-sm">
                {labels.question}
              </p>
              <blockquote className="my-6 max-w-[26ch] flex-1 font-heading text-[clamp(1.65rem,2.7vw,2.35rem)] text-foreground-rich leading-tight tracking-tight">
                {question.title}
              </blockquote>
              <p className="max-w-[56ch] text-foreground-dimmed text-sm">
                {question.body}
              </p>
            </div>
            <div className="min-w-0 border-accent-foreground bg-background-dimmed max-md:border-t md:border-l">
              <p className="px-4 py-6 text-foreground-dimmed text-sm sm:px-8">
                {labels.criteria}
              </p>
              <dl>
                {entry.criteria.map((criterion) => (
                  <div
                    key={criterion.label}
                    className="grid grid-cols-[1fr_1.2fr] gap-4 border-accent-foreground border-t px-4 py-4 sm:px-8"
                  >
                    <dt className="text-foreground-dimmed">
                      {criterion.label}
                    </dt>
                    <dd className="font-medium text-foreground-rich">
                      {criterion.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="grid gap-4 border-accent-foreground border-t bg-background-dimmed px-4 py-6 sm:px-8 md:grid-cols-[1fr_3fr]">
            <p className="font-medium text-foreground-rich">{labels.verify}</p>
            <p className="max-w-[70ch] text-foreground-dimmed">
              {entry.verification}
            </p>
          </div>
        </TabsPanel>
      );
    })}
  </Tabs>
);

export namespace WineAndSpiritsQuestions {
  export type Props = {
    items: NonNullable<MarketingPage.Section["items"]>;
    labels: AppConfig["Messages"]["winePage"]["explorer"];
  };
}
