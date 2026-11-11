"use client";

import {
  Tooltip,
  TooltipPopup,
  TooltipPositioner,
  TooltipTrigger,
} from "@zenncore/web/components/tooltip";
import type { AppConfig } from "next-intl";
import { useId } from "react";
import { commerceTimeline } from "@/content/marketing-evidence";
import { Link } from "@/i18n/navigation";
import { fonts } from "./fonts";

export const ChannelTimeline = ({ copy, locale }: ChannelTimeline.Props) => {
  const tooltip = useId();
  const date = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return (
    <div className="relative mt-8">
      <svg
        viewBox="0 0 1128 320"
        preserveAspectRatio="none"
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden h-80 w-full lg:block"
      >
        <path d="M 0 160 H 1128" className="stroke-accent-foreground" />
        {commerceTimeline.map((event, index) => (
          <g key={event.id}>
            <path
              d={`M ${94 + index * 188} 160 V ${index % 2 === 0 ? 136 : 184}`}
              className="stroke-accent-foreground"
            />
            <circle
              cx={94 + index * 188}
              cy="160"
              r="4"
              className="fill-primary"
            />
          </g>
        ))}
      </svg>
      <ol className="grid lg:grid-cols-6">
        {commerceTimeline.map((event, index) => (
          <li
            key={event.id}
            className="relative border-accent-foreground border-l pb-8 pl-7 last:pb-0 lg:h-80 lg:border-0 lg:px-2 lg:pb-0"
          >
            <svg
              viewBox="0 0 10 10"
              aria-hidden
              className="absolute top-2 -left-[5px] size-[9px] lg:hidden"
            >
              <circle cx="5" cy="5" r="4" className="fill-primary" />
            </svg>
            <Tooltip>
              <TooltipTrigger
                aria-describedby={`${tooltip}-${event.id}`}
                render={<Link href={event.source.url} />}
                className={`block h-auto w-full rounded-xs p-2 text-left text-foreground hover:bg-transparent focus-visible:outline-primary-text data-popup-open:bg-transparent lg:text-center ${index % 2 === 0 ? "lg:pb-12" : "lg:pt-48"}`}
              >
                <time
                  dateTime={event.date}
                  className="block font-heading text-foreground-rich text-xl"
                >
                  {date.format(new Date(`${event.date}T12:00:00Z`))}
                </time>
                <span className="mt-3 block text-sm leading-snug underline decoration-accent-foreground underline-offset-4">
                  {copy.events[event.id].title}
                </span>
              </TooltipTrigger>
              <TooltipPositioner keepMounted sideOffset={8} className="z-100">
                <TooltipPopup
                  id={`${tooltip}-${event.id}`}
                  role="tooltip"
                  className={`${fonts} max-w-[min(340px,calc(100vw-32px))] rounded-xs border-accent-foreground bg-background-rich p-4 font-body text-foreground text-sm leading-relaxed shadow-none`}
                >
                  <p>
                    {date.format(new Date(`${event.date}T12:00:00Z`))} 2026 ·{" "}
                    {copy.events[event.id].detail}
                  </p>
                  <p className="mt-2 text-foreground-dimmed">
                    {copy.events[event.id].source}
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
    copy: AppConfig["Messages"]["enterpriseEvidence"]["timeline"];
    locale: string;
  };
}
