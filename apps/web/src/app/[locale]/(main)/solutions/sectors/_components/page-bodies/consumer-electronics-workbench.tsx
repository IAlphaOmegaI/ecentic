"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@zenncore/web/components/select";
import type { AppConfig } from "next-intl";
import { type ReactNode, useId, useState } from "react";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";

const inspectionFields = [
  [1, 3],
  [0, 2],
  [2, 3],
] as const;

export const ElectronicsWorkbench = ({
  questions,
  specifications,
  copy,
}: ElectronicsWorkbench.Props) => {
  const [selected, setSelected] = useState(0);
  const identifier = useId();
  const question = questions[selected];
  const fields = inspectionFields[selected] ?? inspectionFields[0];

  if (!question) return null;

  return (
    <div data-electronics-workbench="">
      <div className="flex flex-col gap-4 border-accent-foreground border-y bg-background-dimmed p-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
        <p id={`${identifier}-label`} className="text-foreground-rich">
          {copy.selectorLabel}
        </p>
        <Select<number>
          value={selected}
          onValueChange={(value) => {
            if (value !== null) setSelected(value);
          }}
          items={copy.scenarioLabels.map((label, index) => ({
            label,
            value: index,
          }))}
        >
          <SelectTrigger
            aria-labelledby={`${identifier}-label`}
            className="w-full bg-background text-foreground-rich sm:w-64"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectPositioner className="z-50" alignItemWithTrigger={false}>
            <SelectPopup className="motion-reduce:transition-none">
              {copy.scenarioLabels.map((label, index) => (
                <SelectItem key={label} value={index}>
                  {label}
                </SelectItem>
              ))}
            </SelectPopup>
          </SelectPositioner>
        </Select>
      </div>
      <div className="grid min-w-0 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="relative order-2 flex min-w-0 flex-col justify-between border-accent-foreground border-t bg-background-dimmed lg:order-none lg:border-t-0 lg:border-r">
          <div className="p-4 pb-0 sm:p-8 sm:pb-0">
            <p className="max-w-[24ch] text-foreground-rich text-xl">
              {copy.inspectLabel}
            </p>
          </div>
          <div className="h-44 text-primary-text sm:h-64 lg:h-88">
            <EvolvingAscii artwork="console" />
          </div>
          <p className="px-4 pb-6 text-foreground-dimmed text-sm sm:px-8">
            {copy.boundary}
          </p>
        </div>
        <div
          className="order-1 flex min-w-0 flex-col lg:order-none"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="p-4 sm:p-8">
            <blockquote className="m-0 min-h-32 font-heading text-[clamp(1.65rem,2.8vw,2.5rem)] text-foreground-rich leading-[1.16] tracking-[-0.025em] sm:min-h-36">
              “{question.title}”
            </blockquote>
            <p className="mt-6 max-w-[60ch] text-foreground-dimmed text-sm">
              {question.body}
            </p>
          </div>
          <div className="relative flex flex-1 flex-col border-accent-foreground border-t bg-background-dimmed">
            <div className="flex items-center gap-4 px-4 py-4 sm:px-8">
              <ArrowRightIcon
                aria-hidden="true"
                className="size-4 shrink-0 rotate-90 text-primary"
              />
              <p className="text-foreground-dimmed text-sm">
                {copy.sourceLabel}
              </p>
            </div>
            <div className="grid flex-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2">
              {fields.map((field) => {
                const specification = specifications[field];
                if (!specification) return null;
                return (
                  <div
                    key={specification.title}
                    className="min-w-0 bg-background-dimmed p-4 sm:p-8"
                  >
                    <h3>{specification.title}</h3>
                    <p className="mt-4 text-foreground-dimmed text-sm">
                      {specification.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export namespace ElectronicsWorkbench {
  export type Props = {
    questions: readonly { title: string; body: string }[];
    specifications: readonly { title: string; body: string }[];
    copy: AppConfig["Messages"]["electronicsPage"];
  };
}

export const ElectronicsSpecification = ({
  label,
  children,
}: ElectronicsSpecification.Props) => (
  <Accordion defaultValue={["specifications"]}>
    <AccordionItem
      value="specifications"
      className="border-accent-foreground border-t border-b-0"
    >
      <AccordionTrigger
        className="bg-background-dimmed px-4 py-6 text-foreground-rich hover:text-primary-text sm:px-8"
        classList={{ trigger: { icon: "size-4 transition-none" } }}
      >
        {label}
      </AccordionTrigger>
      <AccordionPanel className="transition-none [&>div>div:first-child]:border-t-0">
        {children}
      </AccordionPanel>
    </AccordionItem>
  </Accordion>
);

export namespace ElectronicsSpecification {
  export type Props = { label: string; children: ReactNode };
}
