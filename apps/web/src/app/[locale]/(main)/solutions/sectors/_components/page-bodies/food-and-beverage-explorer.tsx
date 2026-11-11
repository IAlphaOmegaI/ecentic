"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { ReactNode } from "react";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { Plus } from "@/components/plus";

// These are editorial reading paths through the original source-data checklist,
// not product matches, generated answers, or an exhaustive safety assessment.
const readingPaths = [
  [2, 3],
  [0, 1],
  [0, 4],
] as const;

export const FoodAndBeverageQuestions = ({
  questions,
  facts,
  labels,
}: FoodAndBeverageQuestions.Props) => (
  <Tabs
    defaultValue={questions[0]?.title}
    orientation="vertical"
    className="relative grid gap-px border-accent-foreground border-t bg-accent-foreground lg:grid-cols-[5fr_7fr]"
  >
    <Plus className="top-0 left-[41.666%] -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
    <div className="min-w-0 bg-background-dimmed px-4 py-8 sm:px-8">
      <p className="mb-6 text-foreground-dimmed text-sm">{labels.choose}</p>
      <TabsList
        aria-label={labels.choose}
        className="w-full flex-col gap-1 border-0 bg-background p-1"
      >
        {questions.map((question) => (
          <Tab
            key={question.title}
            value={question.title}
            className="h-auto min-h-24 w-full justify-between gap-4 rounded-md border-0 px-4 py-6 text-left text-lg leading-snug outline-primary-text before:hidden hover:bg-background-rich focus-visible:outline-2 focus-visible:-outline-offset-4 data-[active]:bg-primary-text data-selected:bg-primary-text sm:min-h-28"
          >
            <span>{question.title}</span>
            <ArrowRightIcon aria-hidden className="size-4 shrink-0" />
          </Tab>
        ))}
      </TabsList>
    </div>
    <div className="min-w-0 bg-background">
      <div className="grid grid-cols-[1fr_160px] items-center border-accent-foreground border-b bg-background-dimmed px-4 sm:grid-cols-[1fr_220px] sm:px-8">
        <div className="py-6">
          <p className="font-medium text-foreground-rich text-xl">
            {labels.facts}
          </p>
          <p className="mt-2 max-w-[25ch] text-foreground-dimmed text-sm">
            {labels.source}
          </p>
        </div>
        <div className="relative h-40 text-primary-text sm:h-48">
          <EvolvingAscii artwork="bag" className="absolute inset-0" />
        </div>
      </div>
      {questions.map((question, index) => (
        <TabsPanel key={question.title} value={question.title} keepMounted>
          <dl className="grid gap-px bg-accent-foreground sm:grid-cols-2 lg:min-h-52">
            {readingPaths[index]?.map((position) => {
              const fact = facts[position];
              if (!fact) return null;

              return (
                <div
                  key={fact.title}
                  className="bg-background px-4 py-6 sm:px-8"
                >
                  <dt className="font-medium text-foreground-rich text-xl">
                    {fact.title}
                  </dt>
                  <dd className="mt-4 max-w-[32ch] text-foreground-dimmed leading-relaxed">
                    {fact.body}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="border-accent-foreground border-t px-4 py-6 text-foreground-dimmed text-sm sm:px-8">
            {question.body}
          </p>
        </TabsPanel>
      ))}
    </div>
  </Tabs>
);

export namespace FoodAndBeverageQuestions {
  export type Props = {
    questions: readonly { title: string; body: string }[];
    facts: readonly { title: string; body: string }[];
    labels: {
      choose: string;
      facts: string;
      source: string;
    };
  };
}

export const FoodAndBeverageFacts = ({
  label,
  children,
}: FoodAndBeverageFacts.Props) => (
  <Accordion
    defaultValue={["product-facts"]}
    className="border-accent-foreground border-t bg-background-dimmed"
  >
    <AccordionItem value="product-facts" className="border-b-0">
      <AccordionTrigger
        className="items-center px-4 py-6 outline-primary-text hover:bg-background-rich focus-visible:outline-2 focus-visible:-outline-offset-4 sm:px-8"
        classList={{
          trigger: { icon: "size-4 shrink-0 motion-reduce:transition-none" },
        }}
      >
        {label}
      </AccordionTrigger>
      <AccordionPanel
        keepMounted
        className="bg-background motion-reduce:transition-none"
      >
        {children}
      </AccordionPanel>
    </AccordionItem>
  </Accordion>
);

export namespace FoodAndBeverageFacts {
  export type Props = { label: string; children?: ReactNode };
}
