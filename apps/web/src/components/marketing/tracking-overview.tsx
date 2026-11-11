"use client";

import {
  BarChartIcon,
  ChartCircularIcon,
  FileSearchIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
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

const RecordGraphic = ({ index }: { index: number }) => (
  <div
    aria-hidden
    className="relative flex h-40 items-center justify-center overflow-hidden border-accent-foreground border-l bg-linear-to-br from-primary/8 via-background to-background max-sm:h-32 max-md:border-t max-md:border-l-0"
  >
    <div className="absolute left-1/2 h-full border-accent-foreground border-l" />
    <div className="relative grid w-48 grid-cols-[24px_1fr] gap-x-4 gap-y-4 border border-accent-foreground bg-background px-6 py-6">
      {["title", "details", "source"].map((field, row) => (
        <div key={field} className="contents">
          <span
            className={cn(
              "size-3 self-center rounded-full border",
              row === index % 3
                ? "border-primary bg-primary/20"
                : "border-cross bg-background",
            )}
          />
          <span
            className={cn(
              "h-1 self-center",
              row === index % 3 ? "w-full bg-primary/60" : "w-3/4 bg-cross/30",
            )}
          />
        </div>
      ))}
    </div>
  </div>
);

const Description = ({
  item,
  index,
}: {
  item: TrackingOverview.Props["items"][number];
  index: number;
}) => (
  <div className="grid grid-cols-[1.5fr_1fr] border-accent-foreground border-t max-md:grid-cols-1">
    <p className="self-center px-8 py-8 text-foreground-dimmed text-xl leading-relaxed max-sm:px-4 max-sm:text-lg">
      {item.body}
    </p>
    <RecordGraphic index={index} />
  </div>
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
              <h3 className="flex items-center gap-4 px-8 py-8 text-2xl text-foreground-rich max-sm:px-4 max-sm:text-xl">
                <Icon
                  aria-hidden
                  className="size-8 shrink-0 text-primary-text"
                />
                {item.title}
              </h3>
              <Description item={item} index={index} />
            </article>
          );
        })}
      </section>
    );
  return (
    <Accordion
      defaultValue={["0"]}
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
              className="items-center px-8 py-8 text-2xl text-foreground-rich hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 data-panel-open:text-primary-text max-sm:px-4 max-sm:text-xl"
              classList={{ trigger: { icon: "size-4 shrink-0" } }}
            >
              <span className="flex items-center gap-4">
                <Icon
                  aria-hidden
                  className="size-8 shrink-0 text-primary-text"
                />
                {item.title}
              </span>
            </AccordionTrigger>
            <AccordionPanel className="duration-200 motion-reduce:transition-none">
              <Description item={item} index={index} />
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
