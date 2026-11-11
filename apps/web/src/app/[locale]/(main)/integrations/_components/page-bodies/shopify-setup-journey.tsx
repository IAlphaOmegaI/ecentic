"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { useMediaQuery } from "@zenncore/web/hooks";
import { useState } from "react";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import type { MarketingPage } from "@/components/marketing/page";
import { MarketingActions } from "@/components/marketing/primitives";
import { useDocument } from "@/hooks/use-document";

const setupArtwork = ["bag", "commerce", "console", "cart"] as const;

const ShopifySetupArtwork = ({ stage }: { stage: number }) => (
  <div
    aria-hidden="true"
    data-shopify-stage={stage}
    className="relative aspect-[73.2/56] min-w-0 overflow-hidden text-primary-text"
  >
    <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
      <EvolvingAscii artwork={setupArtwork[stage] ?? "bag"} fit="cover" />
    </div>
  </div>
);

export const ShopifySetupJourney = ({
  title,
  items,
}: ShopifySetupJourney.Props) => {
  const { window } = useDocument();
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", {});
  const [stage, setStage] = useState(0);

  if (!window || reduced)
    return (
      <ol
        aria-label={title}
        data-shopify-static-setup
        className="divide-y divide-accent-foreground border-accent-foreground border-t"
      >
        {items.map((item, index) => (
          <li
            key={item.title}
            className="grid grid-cols-[3rem_1fr] gap-6 px-7 py-8 max-sm:gap-4 max-sm:px-4"
          >
            <span className="font-heading text-3xl text-primary leading-none">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="text-foreground-rich">{item.title}</h3>
              <p className="mt-4 max-w-[70ch] text-foreground-dimmed leading-relaxed">
                {item.body}
              </p>
              {item.href && (
                <MarketingActions
                  actions={[
                    { label: item.label ?? item.title, href: item.href },
                  ]}
                />
              )}
            </div>
          </li>
        ))}
      </ol>
    );

  return (
    <Tabs
      value={stage}
      onValueChange={(value) => {
        if (typeof value === "number") setStage(value);
      }}
      className="border-accent-foreground border-t"
    >
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {items[stage]?.title}
      </p>
      <TabsList
        aria-label={title}
        className="grid w-full grid-cols-4 overflow-visible rounded-none border-0 border-accent-foreground border-b max-sm:grid-cols-2"
      >
        {items.map((item, index) => (
          <Tab
            key={item.title}
            value={index}
            className="group relative h-auto min-h-36 min-w-0 flex-col items-start justify-start gap-5 border-accent-foreground bg-background px-7 py-6 text-left text-foreground-dimmed outline-1 outline-transparent -outline-offset-1 transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:before:outline-0 data-[active]:text-primary data-selected:text-primary data-[active]:outline-primary data-selected:outline-primary motion-reduce:transition-none max-sm:min-h-36 max-sm:px-4 max-sm:[&:nth-child(-n+2)]:border-b max-sm:[&:nth-child(2)]:border-r-0"
          >
            <span className="flex w-full items-center gap-4" aria-hidden="true">
              <span className="font-heading text-3xl leading-none">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 border-current border-t border-dashed opacity-35" />
              <span className="size-2 shrink-0 rounded-full bg-foreground-dimmed group-data-[active]:bg-primary group-data-selected:bg-primary" />
            </span>
            <span className="max-w-[24ch] text-base leading-snug group-data-[active]:text-foreground-rich group-data-selected:text-foreground-rich">
              {item.title}
            </span>
          </Tab>
        ))}
      </TabsList>
      {items.map((item, index) => (
        <TabsPanel
          key={item.title}
          value={index}
          className="min-w-0 focus-visible:outline-primary-text focus-visible:-outline-offset-4"
        >
          <div className="grid min-h-[430px] grid-cols-[1.6fr_1fr] bg-background max-md:grid-cols-1">
            <ShopifySetupArtwork stage={index} />
            <div className="flex min-w-0 flex-col justify-center border-accent-foreground border-l px-7 py-10 max-sm:px-4 max-sm:py-8 max-md:border-t max-md:border-l-0">
              <h3 className="text-foreground-rich">{item.title}</h3>
              <p className="mt-5 max-w-[46ch] text-foreground-dimmed leading-relaxed">
                {item.body}
              </p>
              {item.href && (
                <MarketingActions
                  actions={[
                    { label: item.label ?? item.title, href: item.href },
                  ]}
                />
              )}
            </div>
          </div>
        </TabsPanel>
      ))}
    </Tabs>
  );
};

export namespace ShopifySetupJourney {
  export type Props = {
    title: string;
    items: NonNullable<MarketingPage.Section["items"]>;
  };
}
