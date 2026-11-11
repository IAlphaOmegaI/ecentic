"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import type { MarketingPage } from "@/components/marketing/page";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const artwork = {
  brands: "bag",
  "retailers-and-marketplaces": "cart",
  "agencies-and-partners": "console",
  enterprise: "commerce",
} as const;

export const SolutionsAudience = ({
  items,
  label,
}: SolutionsAudience.Props) => (
  <Tabs defaultValue={items[0]?.id}>
    <div className="border-accent-foreground border-t bg-background-dimmed px-8 py-6 max-sm:px-4">
      <TabsList
        aria-label={label}
        className="grid w-full grid-cols-4 gap-1 border-0 bg-background p-1 max-md:grid-cols-2"
      >
        {items.map((item) => (
          <Tab
            key={item.id}
            value={item.id}
            className="h-auto min-h-16 rounded-md border-0 px-4 py-4 text-center text-base leading-snug before:hidden hover:bg-background-rich focus-visible:-outline-offset-4 data-[active]:bg-primary-text data-selected:bg-primary-text max-sm:px-2 max-sm:text-sm"
          >
            {item.title}
          </Tab>
        ))}
      </TabsList>
    </div>
    {items.map((item) => (
      <TabsPanel key={item.id} value={item.id} keepMounted>
        <div className="relative grid grid-cols-[7fr_5fr] border-accent-foreground border-t bg-background-dimmed max-md:grid-cols-1">
          <Plus className="top-0 left-[58.333%] -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
          <Plus className="bottom-0 left-[58.333%] -translate-x-1/2 translate-y-1/2 max-md:hidden" />
          <div className="relative flex min-h-[380px] min-w-0 flex-col px-8 py-10 max-sm:px-4 max-sm:py-8 max-md:min-h-0">
            <h3 className="max-w-[20ch] text-[clamp(1.8rem,2.8vw,2.7rem)]!">
              {item.headline}
            </h3>
            <p className="mt-6 mb-8 max-w-[52ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
              {item.description}
            </p>
            <div className="mt-auto">
              <Button render={<Link href={item.href} />}>
                {item.label}
                <ArrowRightIcon aria-hidden className="size-4" />
              </Button>
            </div>
          </div>
          <div className="relative min-h-[380px] border-accent-foreground border-l bg-linear-to-br from-background-dimmed to-background text-primary-text/75 max-md:h-[260px] max-md:min-h-0 max-md:border-t max-md:border-l-0">
            <EvolvingAscii
              artwork={artwork[item.id]}
              className="absolute inset-0"
            />
          </div>
        </div>
      </TabsPanel>
    ))}
  </Tabs>
);

export namespace SolutionsAudience {
  export type Props = {
    label: string;
    items: readonly {
      id: keyof typeof artwork;
      title: string;
      headline: string;
      description: string;
      href: string;
      label: string;
    }[];
  };
}

export const SolutionsWorkflows = ({
  sections,
  label,
}: SolutionsWorkflows.Props) => {
  const { ready, reduced } = useInteractive();
  if (!ready || reduced)
    return (
      <div className="border-accent-foreground border-t">
        {sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24 border-accent-foreground border-b bg-background-dimmed last:border-b-0"
          >
            <h3 className="flex items-start gap-6 px-8 py-8 font-heading text-2xl leading-snug max-sm:gap-4 max-sm:px-4 max-sm:py-6">
              <span className="text-primary-text">
                {String(index + 1).padStart(2, "0")}
              </span>
              {section.title}
            </h3>
            <WorkflowBody section={section} label={label} />
          </section>
        ))}
      </div>
    );
  return (
    <Accordion
      defaultValue={[sections[0]?.id]}
      className="border-accent-foreground border-t"
    >
      {sections.map((section, index) => (
        <AccordionItem
          key={section.id}
          id={section.id}
          value={section.id}
          className="relative scroll-mt-24 border-accent-foreground last:border-b-0 data-open:bg-background-dimmed"
        >
          <AccordionTrigger
            className="items-center px-8 py-8 hover:bg-background-dimmed focus-visible:-outline-offset-4 max-sm:px-4 max-sm:py-6"
            classList={{
              trigger: { icon: "size-4 shrink-0 text-primary-text" },
            }}
          >
            <span className="flex items-start gap-6 max-sm:gap-4">
              <span className="text-2xl text-primary-text leading-snug">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-heading text-2xl leading-snug">
                {section.title}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionPanel keepMounted>
            <WorkflowBody section={section} label={label} />
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

const WorkflowBody = ({
  section,
  label,
}: {
  section: MarketingPage.Section;
  label: string;
}) => (
  <div className="grid grid-cols-[7fr_5fr] max-md:grid-cols-1">
    <p className="max-w-[60ch] px-8 pb-10 text-foreground text-lg leading-relaxed max-sm:px-4 max-sm:pb-8 max-sm:text-base">
      {section.description}
    </p>
    <div className="min-w-0 px-8 pb-10 max-sm:px-4 max-sm:pb-8">
      <p className="mb-4 text-foreground text-sm">{label}</p>
      <div className="flex flex-wrap items-center gap-4">
        {section.links?.map((link, position) => (
          <Button
            key={link.href}
            color={position === 0 ? "primary" : "neutral"}
            render={<Link href={link.href} />}
          >
            {link.label}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        ))}
      </div>
    </div>
  </div>
);

export namespace SolutionsWorkflows {
  export type Props = {
    sections: readonly MarketingPage.Section[];
    label: string;
  };
}
