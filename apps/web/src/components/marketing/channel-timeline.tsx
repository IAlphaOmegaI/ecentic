"use client";

import {
  Tooltip,
  TooltipPopup,
  TooltipPositioner,
  TooltipTrigger,
} from "@zenncore/web/components/tooltip";
import { useMediaQuery } from "@zenncore/web/hooks";
import type { AppConfig } from "next-intl";
import { useId } from "react";
import { Motion } from "@/components/motion";
import { commerceTimeline } from "@/content/marketing-evidence";
import { Link } from "@/i18n/navigation";
import { fonts } from "./fonts";

const illustrations = {
  googleUcp: `
         _______________
        /______________/|
       |  +---+ +---+  ||
       |  | / | | / |  ||
    ___|__+---+_+---+__||___
   /_______________________/|
  |  [ ]   [ ]   [ ]   [ ] ||
  |_______________________|/
       +------+------+
       |      |      |
      [#]    [#]    [#]
`,
  amazonAlexa: String.raw`
           .--------.
        .-'   ____   '-.
       /    .\||||/.    \
      |    /  .--.  \    |
  ----|---|  ( oo )  |---|----
      |    \  '--'  /    |
       \    '\||||/'    /
        '-.   ||   .-'
           '--||--'
              ||
          .___||___.
`,
  metaMuse: String.raw`
            .------.
         .-' +    + '-.
       .'  .--------.  '.
      /   /  o    o  \   \
     |   |     __     |   |
     |   |    /__/    |   |
      \   '----------'   /
       '.___    __  ___.'
           /___/  \/
        +     *       +
            +     *
`,
  googleCart: String.raw`
       __
      /_/_________________
       \  |  |  |  |  |  /|
        \_|__|__|__|__|_/ |
         \|  |  |  |  |/  /
          +--+--+--+--+  /
          |____________|/
          /          /
         /__________/
          (__)  (__)
          +        +
`,
  shopifyAgentTools: String.raw`
          _____________
         /____________/|
        |  < >  { }  | |
        |  .-------. | |
     ___|__|_______|_|_|___
    /_____________________/|
   |  [ / ] [ + ] [ > ]  | |
   |_____________________|/
          /   |   \
         +    +    +
        [ ]  [ ]  [ ]
`,
  amazonWorkspace: `
         +-------------+
        /             /|
       +-------------+ |
       |  +-------+  | |
       |  |  >>>  |  | |
       |  +-------+  | |
       |  ___   ___  | /
       +-------------+/
          |       |
      ____|_______|____
     /________________/
`,
} as const;

export const ChannelTimeline = ({ events, locale }: ChannelTimeline.Props) => {
  const tooltip = useId();
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", {});
  const date = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return (
    <div className="relative mt-10">
      <ol
        className="marketing-grid marketing-section-grid grid grid-cols-3 border-accent-foreground border-b max-sm:grid-cols-1 max-[801px]:grid-cols-2"
        data-columns="3"
      >
        {commerceTimeline.map((event, index) => (
          <li
            key={event.id}
            className="relative min-w-0 border-accent-foreground border-t border-r px-6 py-8 max-sm:border-r-0 max-sm:px-4"
          >
            <div className="relative mb-8 flex h-40 items-center justify-center overflow-visible">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-radial from-primary/10 to-70% to-transparent"
              />
              <Motion.Item
                aria-hidden
                initial={false}
                animate={
                  reduced
                    ? { transform: "translateY(0px) rotate(0deg)" }
                    : {
                        transform: [
                          "translateY(4px) rotate(-2deg)",
                          "translateY(-4px) rotate(2deg)",
                          "translateY(4px) rotate(-2deg)",
                        ],
                      }
                }
                transition={
                  reduced
                    ? { duration: 0 }
                    : {
                        duration: 8,
                        delay: index * 0.4,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }
                }
                className="motion-reduce:transform-none! pointer-events-none relative select-none text-primary-text"
              >
                <pre className="m-0 overflow-visible whitespace-pre bg-transparent p-0 font-mono text-[12px] leading-[1.08] [font-variant-ligatures:none] max-sm:text-[13px]">
                  {illustrations[event.id]}
                </pre>
              </Motion.Item>
            </div>
            <Tooltip>
              <TooltipTrigger
                aria-describedby={`${tooltip}-${event.id}`}
                render={<Link href={event.source.url} />}
                className="group block h-auto w-full rounded-xs p-0 text-left text-foreground hover:bg-transparent focus-visible:outline-primary-text data-popup-open:bg-transparent"
              >
                <time
                  dateTime={event.date}
                  className="block font-heading text-3xl text-primary-text"
                >
                  {date.format(new Date(`${event.date}T12:00:00Z`))}
                </time>
                <span className="mt-4 block text-base leading-relaxed underline decoration-accent-foreground underline-offset-4 group-hover:decoration-primary-text">
                  {events[event.id].title}
                </span>
              </TooltipTrigger>
              <TooltipPositioner keepMounted sideOffset={8} className="z-100">
                <TooltipPopup
                  id={`${tooltip}-${event.id}`}
                  role="tooltip"
                  className={`${fonts} max-w-[min(340px,calc(100vw-32px))] rounded-md border-accent-foreground bg-background-rich p-4 font-body text-foreground text-sm leading-relaxed shadow-none`}
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
