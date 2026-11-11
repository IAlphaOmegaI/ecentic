import { ArrowRightIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import Image from "next/image";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
} from "@/components/marketing/primitives";

type Section = MarketingBodyProps["sections"][number];
type Copy = Awaited<ReturnType<typeof getMessages>>["perplexityPage"];

const SectionHeading = ({ section }: { section: Section }) => (
  <div className="px-7 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
    <h2>{section.title}</h2>
    {section.description && (
      <p className="mt-4 max-w-[70ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
        {section.description}
      </p>
    )}
  </div>
);

const ShoppingExplorer = ({ copy }: { copy: Copy["shopping"] }) => (
  <Tabs
    defaultValue="purchase"
    className="grid min-w-0 border-accent-foreground border-t bg-background-dimmed md:grid-cols-[1fr_1.25fr]"
  >
    <div className="flex min-w-0 flex-col border-accent-foreground max-md:border-b md:border-r">
      <div className="flex items-center justify-between gap-6 px-7 pt-8 max-sm:px-4">
        <p className="font-medium text-foreground-rich">{copy.result}</p>
        <Image
          src="/images/perplexity.svg"
          alt="Perplexity"
          width={40}
          height={40}
          className="size-10"
        />
      </div>
      <div className="h-64 text-primary-text sm:h-80">
        <EvolvingAscii artwork="bag" />
      </div>
      <p className="px-7 pb-8 text-foreground-dimmed text-sm max-sm:px-4">
        {copy.caption}
      </p>
    </div>
    <div className="flex min-w-0 flex-col justify-between p-7 max-sm:p-4">
      <div>
        <p className="mb-4 text-foreground-dimmed text-sm">
          {copy.destination}
        </p>
        <TabsList
          aria-label={copy.label}
          className="grid w-full grid-cols-2 bg-background"
        >
          <Tab
            value="purchase"
            className="h-auto min-h-12 px-4 py-3 text-base data-active:bg-primary-text data-selected:bg-primary-text data-active:text-background-rich data-selected:text-background-rich max-sm:px-2 max-sm:text-sm"
          >
            {copy.purchase}
          </Tab>
          <Tab
            value="store"
            className="h-auto min-h-12 px-4 py-3 text-base data-active:bg-primary-text data-selected:bg-primary-text data-active:text-background-rich data-selected:text-background-rich max-sm:px-2 max-sm:text-sm"
          >
            {copy.store}
          </Tab>
        </TabsList>
      </div>
      {(["purchase", "store"] as const).map((destination) => (
        <TabsPanel
          key={destination}
          value={destination}
          className="flex min-h-64 flex-col justify-end pt-8 pb-2 max-sm:min-h-60"
        >
          <div className="mb-8 flex items-center gap-4 border-accent-foreground border-b pb-6 text-primary-text">
            <ArrowRightIcon className="size-6 shrink-0" aria-hidden="true" />
            <p className="font-medium">{copy[destination]}</p>
          </div>
          <h3>{copy[`${destination}Title`]}</h3>
          <p className="mt-4 max-w-[44ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
            {copy[`${destination}Description`]}
          </p>
        </TabsPanel>
      ))}
    </div>
  </Tabs>
);

const ProductInformation = ({ copy }: { copy: Copy["reading"] }) => (
  <div className="grid min-w-0 border-accent-foreground border-t bg-background-dimmed md:grid-cols-[1fr_1fr]">
    <div className="border-accent-foreground max-md:border-b md:border-r">
      <p className="px-7 pt-8 pb-6 font-medium text-foreground-rich max-sm:px-4">
        {copy.merchant}
      </p>
      <ul className="grid">
        {[copy.product, copy.price, copy.website].map((field, index) => (
          <li
            key={field}
            className="flex items-center gap-6 border-accent-foreground border-t px-7 py-6 max-sm:px-4"
          >
            <span className="text-2xl text-primary-text" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{field}</span>
          </li>
        ))}
      </ul>
    </div>
    <div className="flex min-w-0 flex-col justify-between gap-8 px-7 py-8 max-sm:px-4">
      <div className="flex flex-wrap items-center gap-6">
        <ArrowRightIcon
          className="size-6 text-foreground-dimmed"
          aria-hidden="true"
        />
        <Image
          src="/images/perplexity.svg"
          alt="Perplexity"
          width={64}
          height={64}
          className="size-16"
        />
        <p className="font-heading text-2xl text-foreground-rich">
          {copy.result}
        </p>
      </div>
      <p className="max-w-[36ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
        {copy.caption}
      </p>
    </div>
  </div>
);

const MerchantEntry = ({
  section,
  copy,
}: {
  section: Section;
  copy: Copy["entry"];
}) => {
  const paragraphs = section.description?.split(/(?<=[.!?])\s+/u) ?? [];

  return (
    <div className="grid min-w-0 lg:grid-cols-[1fr_1.6fr]">
      <div className="border-accent-foreground px-7 py-12 max-sm:px-4 max-sm:py-8 max-lg:border-b lg:border-r">
        <h2>{section.title}</h2>
        {section.links && <MarketingActions actions={section.links} />}
      </div>
      <Accordion
        aria-label={copy.label}
        defaultValue={["access-0"]}
        className="justify-start bg-background-dimmed"
      >
        {copy.steps.map((step, index) => (
          <AccordionItem
            key={step}
            value={`access-${index}`}
            className="border-accent-foreground last:border-b-0"
          >
            <AccordionTrigger
              className="items-center px-7 py-6 text-lg max-sm:px-4"
              classList={{ trigger: { icon: "size-4 shrink-0" } }}
            >
              <span className="flex items-center gap-6 max-sm:gap-4">
                <span aria-hidden="true" className="text-3xl text-primary-text">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {step}
              </span>
            </AccordionTrigger>
            <AccordionPanel className="transition-none">
              <p className="px-7 pb-8 text-foreground-dimmed leading-relaxed max-sm:px-4">
                {paragraphs[index]}
              </p>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export const PerplexityBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { perplexityPage: copy } = await getMessages();

  return (
    <>
      {sections.map((section, index) => (
        <Fragment key={section.id}>
          {index > 0 && <SectionGutter />}
          {(() => {
            switch (section.id) {
              case "shops":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <SectionHeading section={section} />
                    <ShoppingExplorer copy={copy.shopping} />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "reads":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <SectionHeading section={section} />
                    <ProductInformation copy={copy.reading} />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "entry":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <MerchantEntry section={section} copy={copy.entry} />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "ecentic":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <SectionHeading section={section} />
                    <div className="border-accent-foreground border-t bg-background-dimmed [&_table]:border-0 max-sm:[&_table]:block max-sm:[&_tbody]:block max-sm:[&_td]:block max-sm:[&_td]:w-full max-sm:[&_td]:px-4 max-sm:[&_td]:pt-0 max-sm:[&_td]:pb-4 max-sm:[&_th]:block max-sm:[&_th]:w-full max-sm:[&_th]:px-4 max-sm:[&_th]:pt-6 max-sm:[&_th]:pb-3 max-sm:[&_th]:text-xl max-sm:[&_thead]:sr-only max-sm:[&_tr:last-child]:border-b-0 max-sm:[&_tr]:block max-sm:[&_tr]:border-accent-foreground max-sm:[&_tr]:border-b">
                      {sectionChildren?.[section.id]}
                    </div>
                  </MarketingBand>
                );
              default:
                return (
                  <MarketingSection section={section}>
                    {sectionChildren?.[section.id]}
                  </MarketingSection>
                );
            }
          })()}
        </Fragment>
      ))}
    </>
  );
};
