"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import type { MarketingPage } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const ContactDescription = ({ body }: { body: string }) => {
  const [before, after] = body.split("support@ecentic.ai");

  if (after === undefined) return <p>{body}</p>;

  return (
    <p>
      {before}
      <Link
        href="mailto:support@ecentic.ai"
        className="break-words text-primary-text underline decoration-primary-text/40 underline-offset-4 hover:decoration-primary-text"
      >
        support@ecentic.ai
      </Link>
      {after}
    </p>
  );
};

export const ContactRouting = ({ section }: ContactRouting.Props) => {
  const items = section.items?.filter(
    (item) => item.title.trim() && (item.body.trim() || item.href?.trim()),
  );

  if (!items?.length) return null;

  return (
    <MarketingBand
      id={section.id}
      className="scroll-mt-24 [&>.marketing-rail>.marketing-guides]:hidden"
    >
      <div className="grid grid-cols-[1fr_2fr] max-md:grid-cols-1">
        <div className="relative flex min-w-0 flex-col border-accent-foreground border-r px-7 pt-12 pb-6 max-sm:px-4 max-md:border-r-0 max-md:border-b max-md:py-8">
          <h2>{section.title}</h2>
          <div className="relative mt-8 min-h-56 flex-1 text-primary max-md:hidden">
            <div className="absolute inset-0">
              <EvolvingAscii artwork="console" />
            </div>
          </div>
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-md:hidden" />
        </div>
        <Accordion
          defaultValue={[items[0]?.title]}
          className="min-w-0 justify-start"
        >
          {items.map((item) => (
            <AccordionItem
              key={item.title}
              value={item.title}
              className="border-accent-foreground transition-colors duration-160 last:border-b-0 data-open:bg-background-dimmed"
            >
              <AccordionTrigger
                className="px-7 py-7 font-heading text-[clamp(1.5rem,2.2vw,2rem)] text-foreground-rich leading-tight hover:bg-background-dimmed focus-visible:-outline-offset-4 max-sm:px-4 max-sm:py-6"
                classList={{ trigger: { icon: "mr-0 size-4 shrink-0" } }}
              >
                {item.title}
              </AccordionTrigger>
              <AccordionPanel className="duration-200">
                <div className="px-7 pt-0 pb-8 max-sm:px-4">
                  {item.body && (
                    <div className="max-w-[52ch] text-foreground-dimmed">
                      <ContactDescription body={item.body} />
                    </div>
                  )}
                  {item.href && (
                    <div className="mt-6">
                      <Button render={<Link href={item.href} />}>
                        {item.label ?? item.title}
                        <ArrowRightIcon className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </MarketingBand>
  );
};

export namespace ContactRouting {
  export type Props = { section: MarketingPage.Section };
}
