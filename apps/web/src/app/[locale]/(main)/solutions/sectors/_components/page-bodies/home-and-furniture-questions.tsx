"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import type { AppConfig } from "next-intl";
import { Plus } from "@/components/plus";

const sourceGroups = [[0, 2], [1, 2], [1]] as const;

export const FurnitureQuestions = ({
  questions,
  specifications,
  copy,
}: FurnitureQuestions.Props) => (
  <div data-furniture-questions>
    <div className="grid border-accent-foreground border-t lg:grid-cols-[1.15fr_1fr]">
      <div className="relative flex flex-col justify-center border-accent-foreground border-b bg-background-dimmed px-4 py-8 sm:px-8 lg:border-r lg:border-b-0">
        <div className="relative mx-auto w-full max-w-[440px] px-6 pt-10 pb-6 sm:px-10">
          <div className="absolute top-0 right-6 left-6 border-accent-rich border-b pb-2 text-center text-foreground-dimmed text-sm sm:right-10 sm:left-10">
            {copy.widthLabel}
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-2 w-px bg-accent-rich"
            />
            <span
              aria-hidden="true"
              className="absolute right-0 bottom-0 h-2 w-px bg-accent-rich"
            />
          </div>
          <div className="relative flex min-h-40 flex-col items-center justify-center gap-2 border border-accent-rich bg-background px-6 py-8 text-center">
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <p className="text-2xl text-foreground-rich">{copy.productLabel}</p>
            <p className="text-foreground-dimmed text-sm">{copy.heightLabel}</p>
          </div>
          <div className="absolute top-10 bottom-6 left-0 flex w-4 items-center justify-center border-accent-rich border-l text-foreground-dimmed text-sm">
            <span className="bg-background-dimmed py-2 [writing-mode:vertical-rl]">
              {copy.depthLabel}
            </span>
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-[42ch] text-center text-foreground-dimmed text-sm">
          {copy.diagramNote}
        </p>
        <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 lg:block" />
      </div>
      <div className="flex flex-col justify-center px-4 py-8 sm:px-8">
        <p className="text-2xl text-foreground-rich">
          {copy.relationshipTitle}
        </p>
        <div className="mt-6 grid gap-6">
          {copy.relationships.map((relationship) => (
            <div
              key={relationship.title}
              className="grid grid-cols-[8px_1fr] gap-4"
            >
              <span aria-hidden="true" className="mt-2 w-px bg-accent-rich" />
              <div>
                <p className="font-medium text-foreground-rich">
                  {relationship.title}
                </p>
                <p className="mt-2 max-w-[42ch] text-foreground-dimmed text-sm">
                  {relationship.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <Accordion
      multiple
      defaultValue={questions.map((question) => question.title)}
      className="border-accent-foreground border-t"
    >
      {questions.map((question, index) => (
        <AccordionItem
          key={question.title}
          value={question.title}
          className="border-accent-foreground last:border-b-0"
        >
          <AccordionTrigger
            className="px-4 py-6 hover:bg-background-dimmed data-panel-open:text-primary-text sm:px-8 sm:py-8"
            classList={{
              trigger: {
                icon: "mt-2 size-4 shrink-0 transition-none",
              },
            }}
          >
            <span className="grid gap-2 sm:grid-cols-[180px_1fr] sm:gap-8">
              <span className="text-foreground-dimmed text-sm">
                {copy.questionLabels[index]}
              </span>
              <span className="max-w-[34ch] text-xl leading-snug sm:text-2xl">
                {question.title}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionPanel className="transition-none">
            <div className="grid gap-6 px-4 pb-8 sm:px-8 lg:grid-cols-[180px_1fr] lg:gap-8">
              <p className="text-foreground-dimmed text-sm">{question.body}</p>
              <div>
                <div className="grid gap-6 sm:grid-cols-2">
                  {(sourceGroups[index] ?? []).map((source) => {
                    const specification = specifications[source];
                    if (!specification) return null;
                    return (
                      <div
                        key={specification.title}
                        className="border-accent-rich border-l pl-4"
                      >
                        <p className="font-medium text-foreground-rich">
                          {specification.title}
                        </p>
                        <p className="mt-2 max-w-[38ch] text-foreground-dimmed text-sm">
                          {specification.body}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-6 max-w-[65ch] text-foreground-dimmed text-sm">
                  {copy.questionNotes[index]}
                </p>
              </div>
            </div>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
);

export namespace FurnitureQuestions {
  export type Props = {
    questions: readonly { title: string; body: string }[];
    specifications: readonly { title: string; body: string }[];
    copy: AppConfig["Messages"]["furniturePage"];
  };
}
