"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";

// `hiddenUntilFound` keeps every closed answer in the server HTML (as
// `hidden="until-found"`) instead of mounting it on first open. Crawlers that
// run no JavaScript — GPTBot, ClaudeBot, PerplexityBot — otherwise read only
// the one open answer, while the page's FAQPage schema claims all of them.
export const Faq = ({ items }: Faq.Props) => (
  <Accordion
    className="w-full"
    hiddenUntilFound
    defaultValue={items.slice(0, 1).map((item) => item.question)}
  >
    {items.map((item) => (
      <AccordionItem
        key={item.question}
        value={item.question}
        className="border-accent-foreground px-6 first:border-t-0 last:border-b-0 md:px-8"
      >
        <AccordionTrigger className="py-5 font-body text-foreground text-lg">
          {item.question}
        </AccordionTrigger>
        <AccordionPanel>
          <p className="max-w-3xl pb-5 font-light text-foreground-dimmed leading-relaxed">
            {item.answer}
          </p>
        </AccordionPanel>
      </AccordionItem>
    ))}
  </Accordion>
);

export namespace Faq {
  export type Item = {
    question: string;
    answer: string;
  };

  export type Props = {
    items: readonly Item[];
  };
}
