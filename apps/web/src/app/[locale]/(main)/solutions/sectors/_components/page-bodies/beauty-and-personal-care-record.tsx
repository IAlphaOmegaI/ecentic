"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import type { MarketingPage } from "@/components/marketing/page";
import { Plus } from "@/components/plus";

const factIndexes = [
  [1, 0, 2],
  [1, 3],
  [1, 0, 5],
] as const;

export const BeautyAndPersonalCareRecord = ({
  questions,
  attributes,
  copy,
}: BeautyAndPersonalCareRecord.Props) => (
  <Tabs defaultValue={0} className="min-w-0">
    <div className="px-4 pb-6 sm:px-8">
      <TabsList aria-label={copy.label} className="max-w-full">
        {questions.map((question, index) => (
          <Tab
            key={question.title}
            value={index}
            className="h-auto min-h-12 min-w-0 px-4 py-2 text-sm data-[active]:bg-primary data-selected:bg-primary data-[active]:text-background-rich data-selected:text-background-rich max-sm:px-3"
          >
            {copy.tabs[index]}
          </Tab>
        ))}
      </TabsList>
    </div>
    {questions.map((question, index) => {
      const facts = (factIndexes[index] ?? []).flatMap((position) => {
        const attribute = attributes[position];
        return attribute ? [attribute] : [];
      });
      const fields = index === 1 ? [...facts, copy.claim] : facts;
      const size = attributes[4];

      return (
        <TabsPanel
          key={question.title}
          value={index}
          className="min-w-0 border-accent-foreground border-t bg-background-dimmed focus-visible:outline-primary"
        >
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_240px] max-md:grid-cols-1">
            <div className="min-w-0 px-4 py-8 sm:px-8">
              <p className="text-foreground-dimmed text-sm">{copy.question}</p>
              <h3 className="mt-4 max-w-[30ch] text-[clamp(1.7rem,2.8vw,2.5rem)]!">
                {question.title}
              </h3>
              <p className="mt-4 max-w-[58ch] text-foreground-dimmed text-sm">
                {question.body}
              </p>
            </div>
            <div className="relative min-h-56 text-primary-text/75 max-md:hidden">
              <EvolvingAscii artwork="bag" className="absolute inset-0" />
            </div>
          </div>
          <div className="border-accent-foreground border-t px-4 py-4 sm:px-8">
            <p className="font-medium text-foreground-rich text-sm">
              {copy.facts}
            </p>
          </div>
          <div className="relative border-accent-foreground border-t">
            <Plus className="top-0 left-1/3 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
            <Plus className="top-0 left-2/3 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
            <dl className="grid gap-px bg-accent-foreground md:grid-cols-3">
              {fields.map((field) => (
                <div
                  key={field.title}
                  className="min-w-0 bg-background-dimmed px-4 py-6 sm:px-8 md:min-h-44"
                >
                  <dt className="font-heading text-foreground-rich text-xl leading-snug tracking-tight">
                    {field.title}
                  </dt>
                  <dd className="mt-4 max-w-[36ch] text-foreground-dimmed">
                    {field.body}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          {size && (
            <dl className="grid gap-2 border-accent-foreground border-t px-4 py-6 sm:px-8 md:grid-cols-[calc(33.333%-1.5rem)_1fr] md:gap-8">
              <dt className="font-medium text-foreground-rich">{size.title}</dt>
              <dd className="text-foreground-dimmed">{size.body}</dd>
            </dl>
          )}
        </TabsPanel>
      );
    })}
  </Tabs>
);

export namespace BeautyAndPersonalCareRecord {
  export type Props = {
    questions: NonNullable<MarketingPage.Section["items"]>;
    attributes: NonNullable<MarketingPage.Section["items"]>;
    copy: AppConfig["Messages"]["beautyPage"]["record"];
  };
}
