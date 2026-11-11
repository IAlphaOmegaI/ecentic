"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import type { ReactNode } from "react";

export const McpTransport = ({ labels, details }: McpTransport.Props) => (
  <Accordion defaultValue={[labels[0]]}>
    {labels.map((label, index) => (
      <AccordionItem
        key={label}
        value={label}
        className="border-accent-foreground last:border-b-0"
      >
        <AccordionTrigger
          className="min-h-14 py-4 text-base focus-visible:outline-primary"
          classList={{ trigger: { icon: "size-4 transition-none" } }}
        >
          {label}
        </AccordionTrigger>
        <AccordionPanel keepMounted className="transition-none">
          <div className="pb-6">{details[index]}</div>
        </AccordionPanel>
      </AccordionItem>
    ))}
  </Accordion>
);

export namespace McpTransport {
  export type Props = {
    labels: readonly string[];
    details: readonly ReactNode[];
  };
}
