"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import type { MarketingSection } from "@/components/marketing/page";

export const SellJourney = ({ section }: MarketingSection.Props) => (
  <Accordion
    defaultValue={["step-0"]}
    className="pb-4 [&_button]:transition-none [&_svg]:transition-none"
  >
    {section.items?.map((item, index) => (
      <AccordionItem
        key={item.title}
        value={`step-${index}`}
        className="border-accent-foreground border-t border-b-0 data-open:bg-background-dimmed"
      >
        <AccordionTrigger
          className="items-center px-8 py-6 max-sm:px-4"
          classList={{ trigger: { icon: "size-4 shrink-0" } }}
        >
          <span className="flex items-center gap-8 max-sm:gap-4">
            <span className="w-10 shrink-0 font-heading text-3xl text-primary-text leading-none">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="font-heading text-2xl text-foreground-rich leading-tight tracking-tight max-sm:text-xl">
              {item.title}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionPanel className="transition-none" keepMounted>
          <p className="max-w-[76ch] pt-0 pr-12 pb-8 pl-26 text-foreground-dimmed max-sm:pr-8 max-sm:pl-18">
            {item.body}
          </p>
        </AccordionPanel>
      </AccordionItem>
    ))}
  </Accordion>
);
