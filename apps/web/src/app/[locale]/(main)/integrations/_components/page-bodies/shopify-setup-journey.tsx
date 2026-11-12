"use client";

import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { IllustrationGlow } from "@/components/marketing/illustration-glow";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import type { MarketingPage } from "@/components/marketing/page";
import { MarketingActions } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";

const icons = [
  CommercePlug_3SparkleIcon,
  CommerceBasketShoppingIcon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
] as const;

const SetupGraphic = ({ stage }: { stage: number }) => (
  <div
    aria-hidden
    data-shopify-stage={stage}
    className={cn(
      "relative isolate flex min-w-0 items-center justify-center gap-6 overflow-hidden px-4 max-sm:gap-4 max-sm:px-0",
      stage === 1 ? "h-56 max-sm:h-44" : "h-32 max-sm:h-24",
    )}
  >
    <IllustrationGlow />
    {stage === 0 ? (
      <>
        <ProviderLogo
          provider="shopify"
          decorative
          className="h-14 max-w-28 max-sm:h-10 max-sm:max-w-16"
        />
        <div className="relative h-px w-20 bg-linear-to-r from-primary/20 via-primary/70 to-primary/20 max-sm:w-8">
          <ArrowRightIcon className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-primary-text" />
        </div>
        <CommerceFileShieldIcon className="size-12 shrink-0 text-primary-text max-sm:size-10" />
      </>
    ) : stage === 1 ? (
      <CommerceFigure
        kind="shopifyBag"
        className="max-w-[260px] bg-transparent max-sm:max-w-[220px]"
      />
    ) : stage === 2 ? (
      <div className="w-full max-w-64 rounded-md border border-accent-foreground bg-background-rich px-4 py-2 font-mono text-xs leading-6 sm:text-sm">
        <span className="text-foreground-dimmed">{"{"}</span>
        <p>
          <span className="text-primary-text">{'  "title"'}</span>
          <span className="text-foreground-dimmed">{': "…",'}</span>
        </p>
        <p>
          <span className="text-success-text">{'  "description"'}</span>
          <span className="text-foreground-dimmed">{': "…"'}</span>
        </p>
        <span className="text-foreground-dimmed">{"}"}</span>
      </div>
    ) : (
      <>
        <ProviderLogo
          provider="shopify"
          decorative
          className="h-16 max-w-28 max-sm:h-12 max-sm:max-w-16"
        />
        <div className="relative h-20 w-20 shrink-0 rounded-tr-3xl rounded-bl-3xl border-primary/30 border-t border-r border-b max-sm:h-14 max-sm:w-8">
          <ArrowRightIcon className="absolute right-0 bottom-0 size-5 translate-x-1/2 translate-y-1/2 text-primary-text" />
        </div>
        <ProviderLogo
          provider="googleMerchant"
          decorative
          className="h-16 max-w-28 max-sm:h-12 max-sm:max-w-16"
        />
      </>
    )}
  </div>
);

export const ShopifySetupJourney = ({
  title,
  items,
}: ShopifySetupJourney.Props) => {
  const { ready, reduced } = useInteractive();
  const staticView = !ready || reduced;

  return (
    <div
      className="relative border-accent-foreground border-t"
      data-shopify-roadmap
    >
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <div
        aria-hidden
        className="pointer-events-none absolute top-14 bottom-14 left-12 w-px bg-linear-to-b from-primary/50 via-accent-foreground to-primary/20 max-sm:left-8"
      />
      <Accordion
        key={staticView ? "static" : "interactive"}
        aria-label={title}
        multiple
        defaultValue={
          staticView ? items.map((item) => item.title) : [items[0]?.title ?? ""]
        }
        className="relative min-w-0"
      >
        {items.map((item, index) => {
          const Icon = icons[index] ?? CommercePlug_3SparkleIcon;
          return (
            <AccordionItem
              key={item.title}
              value={item.title}
              className="group/stop relative min-w-0 border-0 pl-24 max-sm:pl-16"
            >
              <div
                aria-hidden
                className="absolute top-8 left-7 grid size-10 place-items-center rounded-full border border-accent-foreground bg-background text-foreground-dimmed group-data-open/stop:border-primary/40 group-data-open/stop:bg-background-rich group-data-open/stop:text-primary-text max-sm:left-3"
              >
                <Icon className="size-6" />
              </div>
              <div className="border-accent-foreground border-b group-last/stop:border-b-0">
                <AccordionTrigger
                  className="min-h-24 items-center py-6 pr-7 text-foreground-rich hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-solid focus-visible:-outline-offset-4 max-sm:pr-4"
                  classList={{ trigger: { icon: "mr-0 size-4 shrink-0" } }}
                >
                  <span className="flex min-w-0 items-baseline gap-4">
                    <span className="font-heading text-3xl text-primary-text tabular-nums max-sm:text-2xl">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-heading text-2xl leading-tight max-sm:text-xl">
                      {item.title}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionPanel className="overflow-hidden">
                  <div className="grid min-w-0 items-center gap-4 pr-7 pb-6 max-sm:pr-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="min-w-0 md:pr-4">
                      <p className="max-w-[50ch] text-foreground-dimmed leading-relaxed">
                        {item.body}
                      </p>
                      {item.href && (
                        <MarketingActions
                          actions={[
                            {
                              label: item.label ?? item.title,
                              href: item.href,
                            },
                          ]}
                        />
                      )}
                    </div>
                    <SetupGraphic stage={index} />
                  </div>
                </AccordionPanel>
              </div>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export namespace ShopifySetupJourney {
  export type Props = {
    title: string;
    items: NonNullable<MarketingPage.Section["items"]>;
  };
}
