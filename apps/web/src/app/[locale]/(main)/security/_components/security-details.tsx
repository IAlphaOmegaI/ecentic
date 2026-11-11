"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";

export const SecurityDetails = ({ items }: SecurityDetails.Props) => (
  <Accordion
    multiple
    defaultValue={items.map((item) => item.id)}
    className="min-w-0 border-accent-foreground border-t"
  >
    {items.map((item) => (
      <AccordionItem key={item.id} value={item.id} className="last:border-b-0">
        <AccordionTrigger
          classList={{
            root: "font-heading",
            trigger: {
              root: "items-center px-4 py-6 text-foreground-rich text-xl leading-snug hover:text-primary-text md:px-8",
              icon: "mr-0 size-4 shrink-0 text-primary-text transition-none group-data-panel-open:rotate-180",
            },
          }}
        >
          {item.title}
        </AccordionTrigger>
        <AccordionPanel className="transition-none">
          <div className="space-y-4 px-4 pb-8 md:px-8">
            {item.paragraphs
              .filter((paragraph) => paragraph.trim())
              .map((paragraph) => (
                <p
                  key={paragraph}
                  className="max-w-[78ch] text-foreground-dimmed leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
          </div>
        </AccordionPanel>
      </AccordionItem>
    ))}
  </Accordion>
);

export namespace SecurityDetails {
  export type Props = {
    items: readonly {
      id: string;
      title: string;
      paragraphs: readonly string[];
    }[];
  };
}
