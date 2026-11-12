import {
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import type { ReactNode } from "react";
import { MarketingEdgeCrosses } from "./light-band";

const icons = {
  connect: CommercePlug_3SparkleIcon,
  catalog: CommerceFilePenIcon,
  compare: CommerceChartActivity_2Icon,
  checkout: CommerceBasketShoppingIcon,
  access: CommerceFileShieldIcon,
  website: CommerceGlobePointerIcon,
  code: CommerceCode_3Icon,
} as const;

/** Required stages stay visible; the same connected stations need no disclosure. */
export const JourneySteps = ({
  label,
  items,
  className,
  layout = "inline",
}: JourneySteps.Props) => (
  <ol
    aria-label={label}
    data-journey-steps
    data-layout={layout}
    className={cn(
      "relative m-0 min-w-0 list-none p-0",
      layout === "surface" && "border-accent-foreground border-t",
      className,
    )}
  >
    {items.map((item, index) => {
      const Icon = icons[item.icon ?? "catalog"];
      return (
        <li
          key={item.id}
          id={item.anchor}
          className={cn(
            "relative grid min-w-0 scroll-mt-28 grid-cols-[6rem_minmax(0,1fr)] max-sm:grid-cols-[4rem_minmax(0,1fr)]",
            layout === "surface" &&
              "border-accent-foreground not-first:border-t",
          )}
        >
          <div aria-hidden className="relative flex justify-center pt-8">
            {(layout === "surface" || index < items.length - 1) && (
              <span
                className={cn(
                  "absolute top-20 -bottom-8 w-px bg-linear-to-b from-primary/50 to-accent-foreground",
                  layout === "surface" && "bottom-0",
                )}
              />
            )}
            <span className="relative grid size-12 place-items-center rounded-md border border-accent-foreground bg-background text-primary-text">
              <Icon className="size-6" />
            </span>
          </div>
          <div
            className={cn(
              "min-w-0 py-8 pr-8 max-sm:pr-4",
              layout === "inline" &&
                index < items.length - 1 &&
                "border-accent-foreground border-b",
            )}
          >
            <div
              className={cn(
                "flex items-baseline gap-4",
                layout === "inline" && "mb-4",
              )}
            >
              <span className="font-heading text-2xl text-primary-text tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-heading text-2xl leading-tight max-sm:text-xl">
                {item.title}
              </h3>
            </div>
            {layout === "inline" && (
              <div className="min-w-0 text-foreground-dimmed leading-relaxed">
                {item.content}
              </div>
            )}
          </div>
          {layout === "surface" && (
            <div className="relative col-span-2 min-w-0" data-journey-surface>
              <MarketingEdgeCrosses />
              {item.content}
            </div>
          )}
        </li>
      );
    })}
  </ol>
);

export namespace JourneySteps {
  export type Props = {
    label: string;
    items: readonly ConnectedJourney.Item[];
    className?: string;
    /** Complete demonstrations span both the station and explanation columns. */
    layout?: "inline" | "surface";
  };
}

/** Connected stages share the Shopify setup journey's reading order and controls. */
export const ConnectedJourney = ({
  label,
  items,
  defaultValue = items[0]?.id,
  className,
}: ConnectedJourney.Props) => (
  <div
    className={cn(
      "relative min-w-0 border-accent-foreground border-t",
      className,
    )}
    data-connected-journey
  >
    <div
      aria-hidden
      className="pointer-events-none absolute top-12 bottom-12 left-12 w-px bg-linear-to-b from-primary/40 via-accent-foreground to-primary/20 max-sm:left-8"
    />
    <Accordion
      role="group"
      aria-label={label}
      defaultValue={defaultValue ? [defaultValue] : []}
      className="relative min-w-0 justify-start"
    >
      {items.map((item, index) => {
        const Icon = icons[item.icon ?? "catalog"];
        return (
          <AccordionItem
            key={item.id}
            id={item.anchor}
            value={item.id}
            className="group/journey relative min-w-0 border-0 pl-24 max-sm:pl-16"
          >
            <div
              aria-hidden
              className="absolute top-7 left-6 grid size-12 place-items-center rounded-md border border-accent-foreground bg-background text-foreground-dimmed group-data-open/journey:border-primary/40 group-data-open/journey:text-primary-text max-sm:left-2"
            >
              <Icon className="size-6" />
            </div>
            <div className="min-w-0 border-accent-foreground border-b group-last/journey:border-b-0">
              <AccordionTrigger
                className="min-h-26 items-center py-8 pr-8 text-foreground-rich hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-solid focus-visible:-outline-offset-4 max-sm:pr-4"
                classList={{
                  trigger: {
                    icon: "mr-0 size-4 shrink-0 motion-reduce:transition-none",
                  },
                }}
              >
                <span className="flex min-w-0 items-baseline gap-4 max-sm:flex-col max-sm:gap-2">
                  <span className="font-heading text-3xl text-primary-text tabular-nums max-sm:text-2xl">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-heading text-2xl leading-tight max-sm:text-xl">
                    {item.title}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionPanel className="transition-none">
                <div className="min-w-0 pr-8 pb-8 max-sm:pr-4">
                  {item.content}
                </div>
              </AccordionPanel>
            </div>
          </AccordionItem>
        );
      })}
    </Accordion>
  </div>
);

export namespace ConnectedJourney {
  export type Item = {
    id: string;
    anchor?: string;
    title: string;
    icon?: keyof typeof icons;
    content: ReactNode;
  };
  export type Props = {
    label: string;
    items: readonly Item[];
    defaultValue?: string;
    className?: string;
  };
}
