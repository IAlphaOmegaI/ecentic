"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import type { MarketingPage } from "@/components/marketing/page";
import { Link } from "@/i18n/navigation";

export const DuaDisclosures = ({ sections }: DuaDisclosures.Props) => (
  <Accordion multiple defaultValue={["method"]}>
    {sections.map((section) => (
      <AccordionItem
        key={section.id}
        id={section.id}
        value={section.id}
        className="border-accent-foreground last:border-b-0"
      >
        <AccordionTrigger
          className="items-center gap-6 px-7 py-9 text-[clamp(1.5rem,2.8vw,2.5rem)] text-foreground-rich leading-tight hover:bg-accent/35 max-sm:px-4 max-sm:py-7"
          classList={{
            trigger: {
              icon: "mr-0 size-5 shrink-0 transition-transform duration-160",
            },
          }}
        >
          <span>{section.title}</span>
        </AccordionTrigger>
        <AccordionPanel className="transition-none">
          <div className="grid min-[801px]:grid-cols-[1fr_2fr]">
            <div className="hidden min-[801px]:block" aria-hidden />
            <div className="min-w-0">
              <div className="space-y-4 px-7 pt-1 pb-9 max-sm:px-4 max-sm:pb-7">
                {section.description && (
                  <p className="max-w-[60ch] text-lg leading-relaxed max-sm:text-base">
                    {section.description}
                  </p>
                )}
                {section.paragraphs
                  ?.filter((paragraph) => paragraph.trim())
                  .map((paragraph) => (
                    <p
                      key={paragraph}
                      className="max-w-[60ch] text-lg leading-relaxed max-sm:text-base"
                    >
                      {paragraph}
                    </p>
                  ))}
                {section.note && <p>{section.note}</p>}
              </div>
            </div>
          </div>
          {section.links?.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex min-h-16 items-center justify-between gap-6 border-accent-foreground border-t px-7 py-5 font-medium text-primary-text hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-offset-[-4px] max-sm:px-4"
            >
              <span>{link.label}</span>
              <ArrowRightIcon aria-hidden className="size-5 shrink-0" />
            </Link>
          ))}
        </AccordionPanel>
      </AccordionItem>
    ))}
  </Accordion>
);

export namespace DuaDisclosures {
  export type Props = { sections: readonly MarketingPage.Section[] };
}
