"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import type { MarketingPage } from "@/components/marketing/page";
import { MarketingActions } from "@/components/marketing/primitives";

const setupArtwork = ["bag", "commerce", "console", "cart"] as const;

const ShopifySetupArtwork = ({ stage }: { stage: number }) => (
  <div
    aria-hidden="true"
    data-shopify-stage={stage}
    className="relative aspect-[73.2/56] min-w-0 overflow-hidden bg-linear-to-br from-primary/5 via-transparent to-primary/10 text-primary"
  >
    <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
      <EvolvingAscii artwork={setupArtwork[stage] ?? "bag"} fit="cover" />
    </div>
  </div>
);

export const ShopifySetupJourney = ({
  title,
  items,
}: ShopifySetupJourney.Props) => (
  <Tabs defaultValue={0} className="border-accent-foreground border-t">
    <TabsList
      aria-label={title}
      className="grid w-full grid-cols-4 overflow-visible rounded-none border-0 border-accent-foreground border-b max-sm:grid-cols-2"
    >
      {items.map((item, index) => (
        <Tab
          key={item.title}
          value={index}
          className="group relative h-auto min-h-36 min-w-0 flex-col items-start justify-start gap-5 border-accent-foreground bg-background px-7 py-6 text-left text-foreground-dimmed outline-offset-[-4px] hover:bg-background-dimmed/60 data-[active]:bg-background-dimmed data-selected:bg-background-dimmed data-[active]:text-primary-text data-selected:text-primary-text max-sm:min-h-36 max-sm:px-4 max-sm:[&:nth-child(-n+2)]:border-b max-sm:[&:nth-child(2)]:border-r-0"
        >
          <span className="flex w-full items-center gap-4" aria-hidden="true">
            <span className="font-heading text-3xl leading-none">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 border-current border-t border-dashed opacity-35" />
            <span className="text-lg">
              {index === items.length - 1 ? "+" : ">"}
            </span>
          </span>
          <span className="max-w-[24ch] text-base leading-snug">
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
        <div className="grid min-h-[430px] grid-cols-[1.6fr_1fr] bg-background-dimmed max-md:grid-cols-1">
          <ShopifySetupArtwork stage={index} />
          <div className="flex min-w-0 flex-col justify-center border-accent-foreground border-l px-7 py-10 max-sm:px-4 max-sm:py-8 max-md:border-t max-md:border-l-0">
            <h3>{item.title}</h3>
            <p className="mt-5 max-w-[46ch] text-foreground-dimmed leading-relaxed">
              {item.body}
            </p>
            {item.href && (
              <MarketingActions
                actions={[{ label: item.label ?? item.title, href: item.href }]}
              />
            )}
          </div>
        </div>
      </TabsPanel>
    ))}
  </Tabs>
);

export namespace ShopifySetupJourney {
  export type Props = {
    title: string;
    items: NonNullable<MarketingPage.Section["items"]>;
  };
}
