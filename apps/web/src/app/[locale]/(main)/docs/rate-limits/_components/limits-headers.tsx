"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";

export const LimitsHeaders = ({ items, columns }: LimitsHeaders.Props) => (
  <div className="min-w-0">
    <div className="grid grid-cols-2 gap-4 border-accent-foreground border-b bg-background px-6 py-4 text-foreground-dimmed text-sm max-sm:px-4">
      <span>{columns.header}</span>
      <span>{columns.example}</span>
    </div>
    <Accordion defaultValue={["RateLimit-Policy"]} multiple>
      {items.map((item) => (
        <AccordionItem
          key={item.name}
          value={item.name}
          className="border-accent-foreground bg-background-dimmed last:border-b-0 data-open:bg-background"
        >
          <AccordionTrigger
            className="items-center gap-2 px-6 py-6 hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary-text focus-visible:-outline-offset-2 max-sm:px-4"
            classList={{
              trigger: {
                icon: "mr-0 size-4 shrink-0 transition-transform duration-150 motion-reduce:transition-none",
              },
            }}
          >
            <span className="grid min-w-0 flex-1 grid-cols-[1fr_1fr] items-start gap-4 max-sm:grid-cols-1 max-sm:gap-2">
              <code className="wrap-anywhere font-mono text-xs sm:text-sm">
                {item.name}
              </code>
              <code className="wrap-anywhere font-mono font-normal text-foreground-dimmed text-xs sm:text-sm">
                {item.example}
              </code>
            </span>
          </AccordionTrigger>
          <AccordionPanel className="motion-reduce:transition-none">
            <p className="max-w-xl px-6 pb-6 text-foreground-dimmed leading-relaxed max-sm:px-4">
              <span className="sr-only">{columns.meaning}: </span>
              {item.meaning}
            </p>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
);

export namespace LimitsHeaders {
  export type Props = {
    columns: { header: string; example: string; meaning: string };
    items: readonly { name: string; example: string; meaning: string }[];
  };
}
