"use client";

import {
  ArrowRightIcon,
  CommerceBottleWineIcon,
  CommerceBowlFoodIcon,
  CommerceHeadphonesIcon,
  CommerceLipstickIcon,
  CommercePawIcon,
  CommerceShirtIcon,
  CommerceSofaIcon,
  GlobeIcon,
} from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { useMediaQuery } from "@zenncore/web/hooks";
import type { AppConfig } from "next-intl";
import { Crosshair } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { Link } from "@/i18n/navigation";

const sectorFigures = [
  "wineBottle",
  "packagedFood",
  "lipstick",
  "headphones",
  "sofa",
  "sneaker",
  "wellnessBottle",
  "suitcase",
] as const;

const sectorIcons = [
  CommerceBottleWineIcon,
  CommerceBowlFoodIcon,
  CommerceLipstickIcon,
  CommerceHeadphonesIcon,
  CommerceSofaIcon,
  CommerceShirtIcon,
  CommercePawIcon,
  GlobeIcon,
] as const;

export const IndexExplorer = ({
  title,
  sectors,
  copy,
}: IndexExplorer.Props) => {
  const desktop = useMediaQuery("(min-width: 1024px)", {});

  return (
    <Tabs
      defaultValue={sectors[0]?.href}
      orientation={desktop ? "vertical" : "horizontal"}
      className="marketing-section-grid relative grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] border-accent-foreground border-y max-lg:grid-cols-1"
    >
      <div className="relative min-w-0 border-accent-foreground border-r bg-background-dimmed max-lg:border-r-0 max-lg:border-b">
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
        <TabsList
          activateOnFocus
          aria-label={title}
          className="grid w-full grid-cols-1 gap-0 rounded-none border-0 p-0 max-lg:grid-cols-2"
        >
          {sectors.map((sector, index) => {
            const Icon = sectorIcons[index] ?? GlobeIcon;
            return (
              <Tab
                key={sector.href}
                value={sector.href}
                className="group/sector h-auto min-h-18 justify-start gap-4 rounded-none border-0 border-accent-foreground border-b px-6 py-5 text-left text-base leading-snug before:hidden hover:bg-primary/10 hover:text-foreground-rich focus-visible:-outline-offset-4! data-[active]:bg-primary/15 data-selected:bg-primary/15 data-[active]:text-foreground-rich data-selected:text-foreground-rich max-sm:min-h-18 max-sm:gap-2 max-sm:px-3 max-sm:text-sm"
              >
                <Icon
                  aria-hidden
                  className="size-5 shrink-0 text-primary-text"
                />
                <span className="min-w-0 flex-1 whitespace-normal">
                  {sector.title}
                </span>
                <ArrowRightIcon
                  aria-hidden
                  className="size-4 shrink-0 opacity-0 group-data-[active]/sector:opacity-100 group-data-selected/sector:opacity-100 max-sm:hidden"
                />
              </Tab>
            );
          })}
        </TabsList>
      </div>
      {sectors.map((sector, index) => (
        <TabsPanel
          key={sector.href}
          value={sector.href}
          className="col-start-2 row-start-1 min-w-0 data-ending-style:hidden max-lg:col-start-1 max-lg:row-start-2"
        >
          <div className="relative grid grid-cols-[minmax(0,1fr)_240px] items-center gap-4 bg-emphasis-dimmed px-8 py-10 max-sm:grid-cols-1 max-sm:gap-0 max-sm:px-4 max-sm:py-6">
            <div className="relative min-w-0">
              <p className="mb-4 font-medium text-foreground-dimmed text-sm">
                {copy.question}
              </p>
              <h3 className="max-w-[24ch] text-3xl xl:text-4xl leading-none">
                {sector.question}
              </h3>
              <p className="mt-6 max-w-[42ch] text-foreground-dimmed">
                {sector.description}
              </p>
              <div className="mt-6">
                <Button render={<Link href={sector.href} />}>
                  {copy.action.primary}
                  <ArrowRightIcon aria-hidden className="size-4" />
                </Button>
              </div>
            </div>
            <div className="h-56 min-w-0 text-primary-text max-sm:mt-4 max-sm:h-40">
              <CommerceFigure
                kind={sectorFigures[index] ?? "suitcase"}
                surface="dark"
                className="aspect-auto h-full w-full"
              />
            </div>
          </div>
          <div className="relative border-accent-foreground border-t px-8 pt-8 pb-4 max-sm:px-4 max-sm:pt-6">
            <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
            <h4 className="font-medium text-foreground-rich text-xl tracking-normal">
              {copy.productData}
            </h4>
            <p className="mt-2 text-foreground-dimmed text-sm">
              {copy.attributeHint}
            </p>
          </div>
          <Accordion defaultValue={[sector.attributes[0]?.title]} multiple>
            {sector.attributes.map((attribute) => (
              <AccordionItem
                key={attribute.title}
                value={attribute.title}
                className="border-accent-foreground last:border-b-0"
              >
                <AccordionTrigger
                  classList={{
                    root: "font-body text-base leading-normal tracking-normal",
                    trigger: {
                      root: "items-center px-8 py-4 text-base text-foreground-rich hover:bg-transparent! hover:text-primary-rich! focus-visible:-outline-offset-4! max-sm:px-4",
                      icon: "mr-0 size-4 shrink-0 text-primary-text transition-transform duration-200 group-data-panel-open:rotate-180",
                    },
                  }}
                >
                  {attribute.title}
                </AccordionTrigger>
                <AccordionPanel>
                  <p className="max-w-[65ch] px-8 pb-4 text-foreground-dimmed max-sm:px-4">
                    {attribute.body}
                  </p>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="border-accent-foreground border-t bg-emphasis-dimmed px-8 py-6 text-foreground-dimmed text-sm leading-relaxed max-sm:px-4">
            {sector.note}
          </p>
        </TabsPanel>
      ))}
    </Tabs>
  );
};

export namespace IndexExplorer {
  export type Props = {
    title: string;
    copy: AppConfig["Messages"]["sectorsIndexPage"];
    sectors: readonly {
      title: string;
      href: string;
      question: string;
      description: string;
      attributes: readonly { title: string; body: string }[];
      note: string;
    }[];
  };
}
