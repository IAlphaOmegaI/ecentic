"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import type { AppConfig } from "next-intl";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import type { MarketingPage } from "@/components/marketing/page";
import { Plus } from "@/components/plus";

const factIndexes = [
  [3, 2, 0],
  [0, 3, 5],
  [1, 4, 0],
] as const;

export const FashionAndOutdoorTrail = ({
  questions,
  attributes,
  copy,
}: FashionAndOutdoorTrail.Props) => (
  <div className="relative grid min-w-0 border-accent-foreground border-t md:grid-cols-[1fr_2fr]">
    <Plus className="top-0 left-1/3 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
    <div className="flex min-w-0 flex-col justify-between border-accent-foreground bg-background-dimmed max-md:border-b md:border-r">
      <div className="px-4 pt-8 sm:px-8">
        <h3 className="max-w-[14ch] text-3xl! leading-tight!">{copy.title}</h3>
        <p className="mt-4 max-w-[30ch] text-foreground-dimmed">
          {copy.description}
        </p>
      </div>
      <div className="relative h-64 text-primary-text max-md:h-44">
        <EvolvingAscii artwork="bag" className="absolute inset-0" />
      </div>
    </div>
    <Accordion
      aria-label={copy.label}
      defaultValue={["question-0"]}
      className="min-w-0 justify-start"
    >
      {questions.map((question, index) => (
        <AccordionItem
          key={question.title}
          value={`question-${index}`}
          className="min-w-0 border-accent-foreground last:border-b-0"
        >
          <AccordionTrigger
            className="items-center px-4 py-6 hover:bg-background-dimmed focus-visible:-outline-offset-4 data-panel-open:bg-background-dimmed sm:px-8"
            classList={{
              trigger: { icon: "mr-0 size-4 shrink-0 transition-none" },
            }}
          >
            <span className="grid min-w-0 grid-cols-[32px_1fr] gap-4 sm:grid-cols-[48px_1fr]">
              <span
                aria-hidden
                className="font-heading text-2xl text-primary-text leading-tight sm:text-3xl"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <span className="mb-2 block font-normal text-foreground-dimmed text-sm">
                  {copy.contexts[index]}
                </span>
                <span className="block max-w-[32ch] font-heading text-2xl text-foreground-rich leading-tight tracking-tight">
                  {question.title}
                </span>
              </span>
            </span>
          </AccordionTrigger>
          <AccordionPanel className="transition-none">
            <div className="border-accent-foreground border-t px-4 py-6 sm:px-8">
              <p className="mb-4 font-medium text-foreground-rich text-sm">
                {copy.facts}
              </p>
              <dl className="flex flex-col gap-6 border-accent-foreground border-l">
                {(factIndexes[index] ?? []).map((position) => {
                  const attribute = attributes[position];
                  if (!attribute) return null;

                  return (
                    <div
                      key={attribute.title}
                      className="relative grid gap-2 pl-6 sm:grid-cols-[1fr_2fr] sm:gap-4"
                    >
                      <ArrowRightIcon
                        aria-hidden
                        className="absolute top-1 -left-2 size-4 bg-background text-primary-text"
                      />
                      <dt className="font-medium text-foreground-rich">
                        {attribute.title}
                      </dt>
                      <dd className="max-w-[45ch] text-foreground-dimmed">
                        {attribute.body}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <p className="mt-6 max-w-[65ch] text-foreground-dimmed text-sm">
                {question.body}
              </p>
            </div>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
);

export namespace FashionAndOutdoorTrail {
  export type Props = {
    questions: NonNullable<MarketingPage.Section["items"]>;
    attributes: readonly { title: string; body: string }[];
    copy: AppConfig["Messages"]["fashionPage"]["trail"];
  };
}
