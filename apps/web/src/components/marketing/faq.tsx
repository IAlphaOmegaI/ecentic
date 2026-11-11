"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";

export const MarketingQuestions = ({ items }: MarketingQuestions.Props) => (
  <Accordion className="min-w-0" multiple>
    {items.map((item) => (
      <AccordionItem
        key={item.question}
        value={item.question}
        render={<article />}
        className="relative border-accent-foreground last:border-b-0"
      >
        <AccordionTrigger
          classList={{
            root: "font-heading",
            trigger: {
              root: "items-center px-7 py-6 font-medium text-foreground-rich text-xl leading-snug hover:text-primary-text max-sm:px-4",
              icon: "mr-0 size-4 shrink-0 text-primary-text transition-transform duration-200 group-data-panel-open:rotate-180",
            },
          }}
        >
          {item.question}
        </AccordionTrigger>
        <AccordionPanel>
          <p className="max-w-[70ch] px-7 pb-6 text-base text-foreground-dimmed leading-relaxed max-sm:px-4">
            {item.answer}
          </p>
        </AccordionPanel>
      </AccordionItem>
    ))}
  </Accordion>
);

export namespace MarketingQuestions {
  export type Props = {
    items: readonly { question: string; answer: string }[];
  };
}
