"use client";

import {
  BarChartIcon,
  ChartCircularIcon,
  FileSearchIcon,
} from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Plus } from "@/components/plus";
import { useInteractive } from "./interactive/use-interactive";
import type { MarketingPage } from "./page";

const icons = [ChartCircularIcon, BarChartIcon, FileSearchIcon] as const;

const Description = ({
  item,
}: {
  item: TrackingOverview.Props["items"][number];
}) => (
  <p className="max-w-[72ch] px-8 pb-6 pl-20 text-base text-foreground-dimmed leading-relaxed max-sm:px-4 max-sm:pl-16">
    {item.body}
  </p>
);

/** A shared definition panel: clear labels, expandable context, no invented values. */
export const TrackingOverview = ({ items, label }: TrackingOverview.Props) => {
  const { ready, reduced } = useInteractive();
  if (!ready || reduced)
    return (
      <section
        aria-label={label}
        className="border-accent-foreground border-t"
        data-tracking-overview="static"
      >
        {items.map((item, index) => {
          const Icon = icons[index % icons.length] ?? FileSearchIcon;
          return (
            <article
              key={item.title}
              className="border-accent-foreground border-b last:border-b-0"
            >
              <h3 className="flex items-center gap-4 px-8 py-6 text-foreground-rich text-xl max-sm:px-4 max-sm:text-xl">
                <Icon
                  aria-hidden
                  className="size-6 shrink-0 text-primary-text"
                />
                {item.title}
              </h3>
              <Description item={item} />
            </article>
          );
        })}
      </section>
    );
  return (
    <Accordion
      defaultValue={[]}
      className="border-accent-foreground border-t"
      data-tracking-overview="interactive"
    >
      {items.map((item, index) => {
        const Icon = icons[index % icons.length] ?? FileSearchIcon;
        return (
          <AccordionItem
            key={item.title}
            value={String(index)}
            className="relative border-accent-foreground last:border-b-0"
          >
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-cross" />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 [&>span]:bg-cross" />
            <AccordionTrigger
              className="items-center px-8 py-6 text-foreground-rich text-xl hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 data-panel-open:text-primary-text max-sm:px-4 max-sm:text-xl"
              classList={{ trigger: { icon: "size-4 shrink-0" } }}
            >
              <span className="flex items-center gap-4">
                <Icon
                  aria-hidden
                  className="size-6 shrink-0 text-primary-text"
                />
                {item.title}
              </span>
            </AccordionTrigger>
            <AccordionPanel className="duration-200 motion-reduce:transition-none">
              <Description item={item} />
            </AccordionPanel>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
export namespace TrackingOverview {
  export type Props = {
    items: NonNullable<MarketingPage.Section["items"]>;
    label: string;
  };
}
