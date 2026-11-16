"use client";

import { cn } from "@zenncore/utils";
import {
  Tooltip,
  TooltipPopup,
  TooltipPositioner,
  TooltipTrigger,
} from "@zenncore/web/components/tooltip";
import type { AppConfig } from "next-intl";
import { useId } from "react";
import { Crosshair } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { commerceTimeline } from "@/content/marketing-evidence";
import { Link } from "@/i18n/navigation";
import { AsciiRoad } from "./ascii-road";
import { fonts } from "./fonts";
import { ProviderLogo } from "./provider-logo";

const positions = [
  "md:col-start-1 md:row-start-1",
  "md:col-start-2 md:row-start-1",
  "md:col-start-2 md:row-start-2",
  "md:col-start-1 md:row-start-2",
  "md:col-start-1 md:row-start-3",
  "md:col-start-2 md:row-start-3",
] as const;

export const ChannelTimeline = ({ events, locale }: ChannelTimeline.Props) => {
  const tooltip = useId();
  const date = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return (
    <div className="marketing-section-grid relative -mx-7 mt-10 border-accent-foreground border-y bg-background max-sm:-mx-4">
      <Crosshair className="top-0 left-0 size-4 -translate-x-1/2 -translate-y-1/2 text-cross [&>path]:[vector-effect:non-scaling-stroke]" />
      <Crosshair className="top-0 right-0 size-4 translate-x-1/2 -translate-y-1/2 text-cross [&>path]:[vector-effect:non-scaling-stroke]" />
      <Crosshair className="bottom-0 left-0 size-4 -translate-x-1/2 translate-y-1/2 text-cross [&>path]:[vector-effect:non-scaling-stroke]" />
      <Crosshair className="right-0 bottom-0 size-4 translate-x-1/2 translate-y-1/2 text-cross [&>path]:[vector-effect:non-scaling-stroke]" />
      <AsciiRoad />
      <AsciiRoad compact />
      <ol className="relative grid grid-cols-1 md:grid-cols-2 md:grid-rows-[repeat(3,minmax(288px,auto))]">
        {commerceTimeline.map((event, index) => (
          <li
            key={event.id}
            className={cn(
              "relative min-w-0 py-8 pr-6 pl-16 md:px-8 md:text-center",
              positions[index],
            )}
          >
            <Tooltip>
              <TooltipTrigger
                aria-describedby={`${tooltip}-${event.id}`}
                render={<Link href={event.source.url} />}
                className="group block h-auto w-full rounded-sm p-0 text-left text-foreground hover:bg-transparent focus-visible:outline-primary-text data-popup-open:bg-transparent md:text-center"
              >
                <span className="flex items-center gap-4 md:justify-center">
                  <ProviderLogo
                    provider={event.provider}
                    decorative
                    className="size-8 shrink-0 object-center md:size-10"
                  />
                  <time
                    dateTime={event.date}
                    className="block font-heading text-4xl text-primary-text md:text-5xl md:leading-none"
                  >
                    {date.format(new Date(`${event.date}T12:00:00Z`))}
                  </time>
                </span>
                <span
                  aria-hidden
                  className="absolute top-12 left-6 size-4 rounded-full border-4 border-background bg-primary ring-1 ring-primary/30 md:relative md:top-auto md:left-auto md:mx-auto md:my-6 md:block md:size-3 md:border-0 md:ring-4 md:ring-background"
                />
                <span className="mt-4 block max-w-[26ch] font-medium text-foreground text-lg leading-relaxed underline decoration-accent-foreground underline-offset-4 group-hover:text-primary-text group-hover:decoration-primary-text md:mx-auto md:mt-0">
                  <span className="bg-background [box-decoration-break:clone] md:px-2">
                    {events[event.id].title}
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipPositioner keepMounted sideOffset={8} className="z-100">
                <TooltipPopup
                  id={`${tooltip}-${event.id}`}
                  role="tooltip"
                  className={`${fonts} max-w-[min(340px,calc(100vw-32px))] rounded-sm border-accent-foreground bg-background-rich p-4 font-body text-foreground text-sm leading-relaxed shadow-none`}
                >
                  <p>
                    {date.format(new Date(`${event.date}T12:00:00Z`))} 2026 ·{" "}
                    {events[event.id].detail}
                  </p>
                  <p className="mt-2 text-foreground-dimmed">
                    {events[event.id].source}
                  </p>
                </TooltipPopup>
              </TooltipPositioner>
            </Tooltip>
          </li>
        ))}
      </ol>
    </div>
  );
};

export namespace ChannelTimeline {
  export type Props = {
    events: AppConfig["Messages"]["enterpriseEvidence"]["timeline"]["events"];
    locale: string;
  };
}
