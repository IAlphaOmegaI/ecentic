"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import type { AppConfig } from "next-intl";
import type { MarketingPage } from "@/components/marketing/page";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const factIndexes = [
  [0, 1, 2],
  [1, 4, 5],
  [0, 4, 5],
] as const;

export const HealthWellnessAndPetReader = ({
  questions,
  attributes,
  copy,
}: HealthWellnessAndPetReader.Props) => (
  <Accordion
    multiple
    aria-label={copy.label}
    defaultValue={questions.map((_, index) => `question-${index}`)}
    className="min-w-0 justify-start border-accent-foreground border-t"
  >
    {questions.map((question, index) => (
      <AccordionItem
        key={question.title}
        value={`question-${index}`}
        className="min-w-0 border-accent-foreground last:border-b-0"
      >
        <AccordionTrigger
          className="items-center px-4 py-6 transition-none! hover:bg-background-dimmed focus-visible:-outline-offset-4 data-panel-open:bg-background-dimmed sm:px-8"
          classList={{
            trigger: { icon: "mr-0 size-4 shrink-0 transition-none" },
          }}
        >
          <span className="grid min-w-0 grid-cols-[32px_1fr] gap-4 sm:grid-cols-[64px_1fr] sm:gap-8">
            <span
              aria-hidden
              className="font-heading text-2xl text-primary-text leading-tight sm:text-3xl"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="block max-w-[44ch] font-heading text-foreground-rich text-xl leading-tight tracking-tight sm:text-2xl">
              {question.title}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionPanel className="transition-none">
          <div className="relative grid border-accent-foreground border-t md:grid-cols-[1fr_2fr]">
            <Plus className="top-0 left-1/3 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
            <div className="flex min-w-0 flex-col justify-between gap-8 border-accent-foreground bg-background-dimmed px-4 py-6 max-md:border-b sm:px-8 md:border-r">
              <p className="max-w-[32ch] text-foreground-dimmed text-sm">
                {question.body}
              </p>
              <Link
                href="#attributes"
                className="group flex items-center justify-between gap-4 text-primary-text text-sm underline-offset-4 hover:underline"
              >
                {copy.allFacts}
                <ArrowRightIcon aria-hidden className="size-4 shrink-0" />
              </Link>
            </div>
            <div className="min-w-0 px-4 py-6 sm:px-8">
              <p className="mb-6 font-medium text-foreground-rich text-sm">
                {copy.facts}
              </p>
              <dl className="space-y-6">
                {(factIndexes[index] ?? []).map((position) => {
                  const attribute = attributes[position];
                  if (!attribute) return null;
                  return (
                    <div
                      key={attribute.title}
                      className="grid gap-2 sm:grid-cols-[1fr_2fr] sm:gap-8"
                    >
                      <dt className="font-medium text-foreground-rich">
                        {attribute.title}
                      </dt>
                      <dd className="max-w-[48ch] text-foreground-dimmed">
                        {attribute.body}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>
        </AccordionPanel>
      </AccordionItem>
    ))}
  </Accordion>
);

export namespace HealthWellnessAndPetReader {
  export type Props = {
    questions: NonNullable<MarketingPage.Section["items"]>;
    attributes: readonly { title: string; body: string }[];
    copy: AppConfig["Messages"]["healthPage"]["reader"];
  };
}
