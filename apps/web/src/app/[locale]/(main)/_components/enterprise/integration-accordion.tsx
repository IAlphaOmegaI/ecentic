"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import type { ReactNode } from "react";

export const IntegrationAccordion = ({ children }: { children: ReactNode }) => (
  <Accordion
    multiple
    defaultValue={["commerce"]}
    className="enterprise-integrations-wall border-[var(--rail-color)] border-b"
  >
    {children}
  </Accordion>
);

export const IntegrationCategory = ({
  children,
  mark,
  title,
  value,
}: IntegrationCategory.Props) => (
  <AccordionItem
    value={value}
    className="enterprise-provider-group marketing-section-grid border-[var(--rail-color)] border-t border-b-0"
  >
    <AccordionTrigger
      classList={{
        root: "font-heading",
        trigger: {
          root: "items-center bg-background px-7 py-6 text-2xl text-foreground-rich leading-tight tracking-tight hover:text-primary-text data-panel-open:bg-background-rich max-sm:px-4",
          icon: "mr-0 size-4 shrink-0 text-primary-text group-data-panel-open:rotate-180",
        },
      }}
    >
      <span className="flex items-center gap-4">
        {mark}
        {title}
      </span>
    </AccordionTrigger>
    <AccordionPanel className="data-ending-style:overflow-hidden data-starting-style:overflow-hidden data-open:overflow-visible">
      {children}
    </AccordionPanel>
  </AccordionItem>
);

export namespace IntegrationCategory {
  export type Props = {
    children: ReactNode;
    mark: ReactNode;
    title: string;
    value: string;
  };
}
