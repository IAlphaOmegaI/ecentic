import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceFilePenIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { getMessages } from "next-intl/server";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import {
  MarketingEdgeCrosses,
  MarketingLightBand,
} from "@/components/marketing/light-band";
import type { MarketingPage } from "@/components/marketing/page";
import { MarketingEyebrow } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const artwork = ["bag", "console", "commerce", "cart"] as const;
const icons = [
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceFilePenIcon,
  CommercePlug_3SparkleIcon,
];

export const DemoAgenda = ({ section, copy }: DemoAgenda.Props) => (
  <MarketingLightBand id={section.id} className="scroll-mt-24">
    <header className="px-8 py-10 max-sm:px-4 max-sm:py-8">
      <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
      <h2>{section.title}</h2>
      <p className="mt-4 max-w-[60ch] text-foreground-dimmed">
        {copy.description}
      </p>
    </header>
    <div className="relative border-accent-foreground border-t">
      <MarketingEdgeCrosses />
      <ol className="grid grid-cols-2 max-md:grid-cols-1">
        {section.items?.map((item, index) => {
          const Icon = icons[index] ?? CommerceBasketShoppingIcon;
          return (
            <li
              key={item.title}
              className={cn(
                "relative flex min-w-0 flex-col border-accent-foreground border-b px-8 py-8 max-sm:px-4",
                index % 2 === 0 && "md:border-r",
              )}
            >
              {index > 1 && (
                <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
              )}
              <div className="flex items-center gap-4">
                <span className="font-heading text-3xl text-primary-text tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  aria-hidden="true"
                  className="h-px flex-1 bg-accent-foreground"
                />
                <Icon aria-hidden="true" className="size-8 text-primary-text" />
              </div>
              <div className="grid flex-1 grid-cols-[minmax(0,1.15fr)_minmax(100px,0.85fr)] items-center gap-3 py-6 max-sm:gap-1">
                <div className="relative z-1 min-w-0">
                  <h3 className="text-2xl leading-tight">{item.title}</h3>
                  <p className="mt-4 text-foreground-dimmed">{item.body}</p>
                </div>
                <div className="relative h-40 min-w-0 text-primary-text max-sm:h-36">
                  <EvolvingAscii artwork={artwork[index] ?? "bag"} />
                </div>
              </div>
              <dl className="grid gap-4 border-accent-foreground border-t pt-5 text-sm">
                <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-4 max-sm:grid-cols-1 max-sm:gap-1">
                  <dt className="text-foreground-dimmed">{copy.bringLabel}</dt>
                  <dd>{copy.items[index]?.bring}</dd>
                </div>
                <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-4 max-sm:grid-cols-1 max-sm:gap-1">
                  <dt className="text-foreground-dimmed">
                    {copy.exploreLabel}
                  </dt>
                  <dd>{copy.items[index]?.explore}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>
    </div>
    <div className="relative px-8 py-7 max-sm:px-4">
      <MarketingEdgeCrosses />
      <Button color="primary" render={<Link href="#request" />}>
        {copy.action.primary}
        <ArrowRightIcon className="size-4" />
      </Button>
    </div>
  </MarketingLightBand>
);

export namespace DemoAgenda {
  export type Props = {
    section: MarketingPage.Section;
    copy: Awaited<ReturnType<typeof getMessages>>["demoPage"]["agenda"];
  };
}
