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
    className="relative flex min-h-48 min-w-0 items-center justify-center gap-7 overflow-hidden px-7 max-sm:gap-3 max-sm:px-0"
  >
    <div className="absolute inset-0 -z-1 bg-radial-[at_50%_100%] from-primary/10 via-transparent to-transparent" />
    {stage === 0 ? (
      <>
        <ProviderLogo
          provider="shopify"
          decorative
          className="h-20 max-w-36 max-sm:h-14 max-sm:max-w-16"
        />
        <div className="relative h-px w-20 bg-linear-to-r from-primary/20 via-primary/70 to-primary/20 max-sm:w-8">
          <ArrowRightIcon className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-primary-text" />
        </div>
        <CommerceFileShieldIcon className="size-16 shrink-0 text-primary-text max-sm:size-12" />
      </>
    ) : stage === 1 ? (
      <div className="relative flex h-40 w-full max-w-80 items-end justify-center gap-3">
        {[-1, 0, 1].map((position) => (
          <div
            key={position}
            className={cn(
              "relative flex h-28 w-24 min-w-0 flex-col justify-between rounded-md border p-4",
              position === 0
                ? "-translate-y-6 border-primary/50 bg-background-rich shadow-[0_0_40px_-20px_var(--color-primary)]"
                : "border-accent-foreground bg-background",
            )}
          >
            <CommerceBasketShoppingIcon
              className={cn(
                "size-9",
                position === 0 ? "text-primary-text" : "text-foreground-dimmed",
              )}
            />
            <div className="space-y-2">
              <span className="block h-px w-full bg-accent-foreground" />
              <span className="block h-px w-2/3 bg-primary/40" />
            </div>
          </div>
        ))}
      </div>
    ) : stage === 2 ? (
      <div className="w-full max-w-80 rounded-md border border-accent-foreground bg-background-rich p-4 font-mono text-xs leading-8 sm:text-sm">
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
                  className="min-h-28 items-center py-7 pr-7 text-foreground-rich hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-solid focus-visible:-outline-offset-4 max-sm:pr-4"
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
                  <div className="grid min-w-0 pr-7 pb-7 max-sm:pr-4 md:grid-cols-[1fr_1fr]">
                    <div className="min-w-0 pb-4 md:pr-7">
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
