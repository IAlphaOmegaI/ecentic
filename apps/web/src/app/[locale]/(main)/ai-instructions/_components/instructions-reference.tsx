"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import type { ReactNode } from "react";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import type { MarketingPage } from "@/components/marketing/page";
import { Link } from "@/i18n/navigation";

export const InstructionsJobs = ({ items }: InstructionsJobs.Props) => (
  <Accordion
    defaultValue={items[0] ? [items[0].title] : []}
    className="justify-start"
  >
    {items.map((item, index) => (
      <AccordionItem
        key={item.title}
        value={item.title}
        className="border-accent-foreground last:border-b-0"
      >
        <AccordionTrigger
          className="gap-6 px-8 py-6 text-xl leading-snug hover:bg-background-dimmed/60 data-panel-open:text-primary-text max-sm:gap-4 max-sm:px-4"
          classList={{ trigger: { icon: "m-0 size-4 shrink-0" } }}
        >
          <span className="flex items-baseline gap-6 max-sm:gap-4">
            <span
              aria-hidden="true"
              className="font-heading text-2xl text-primary-text"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{item.title}</span>
          </span>
        </AccordionTrigger>
        <AccordionPanel className="transition-none">
          <div className="space-y-6 px-8 pb-8 max-sm:px-4">
            <p className="max-w-[62ch]">{item.body}</p>
            {item.href && (
              <Link
                href={item.href}
                className="inline-flex items-center gap-2 text-primary-text underline decoration-primary/30 underline-offset-4 hover:decoration-current"
              >
                {item.label ?? item.title}
                <ArrowRightIcon
                  aria-hidden="true"
                  className="size-4 shrink-0"
                />
              </Link>
            )}
          </div>
        </AccordionPanel>
      </AccordionItem>
    ))}
  </Accordion>
);

export namespace InstructionsJobs {
  export type Props = {
    items: NonNullable<MarketingPage.Section["items"]>;
  };
}

export const InstructionsSource = ({
  label,
  children,
}: InstructionsSource.Props) => (
  <Accordion className="min-w-0">
    <AccordionItem value="source" className="border-0">
      <AccordionTrigger
        className="px-8 py-6 text-lg hover:bg-background-dimmed/60 data-panel-open:text-primary-text max-sm:px-4"
        classList={{ trigger: { icon: "m-0 size-4 shrink-0" } }}
      >
        {label}
      </AccordionTrigger>
      <AccordionPanel className="transition-none">
        <div className="relative min-w-0 border-accent-foreground border-t [&_figure>div]:h-120 [&_figure]:border-0">
          <MarketingEdgeCrosses />
          <MarketingEdgeCrosses edge="bottom" />
          {children}
        </div>
      </AccordionPanel>
    </AccordionItem>
  </Accordion>
);

export namespace InstructionsSource {
  export type Props = { label: string; children: ReactNode };
}
