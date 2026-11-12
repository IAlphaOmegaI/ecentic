"use client";

import { CursorRaysIcon, FileSearchIcon, QuoteIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { useCallback, useState } from "react";
import { useSequence } from "@/components/marketing/interactive/use-sequence";
import type { MarketingPage } from "@/components/marketing/page";
import { MarketingHeading } from "@/components/marketing/primitives";
import { RiffleFigure } from "./riffle-figure";

const icons = [FileSearchIcon, CursorRaysIcon, QuoteIcon] as const;

export const SimulateRoadmap = ({
  section,
  labels,
  figureLabel,
}: SimulateRoadmap.Props) => {
  const {
    container,
    enhanced,
    playing,
    pause,
    toggle,
    active: finished,
  } = useSequence({ length: 2, delay: 22000 });
  const [current, setCurrent] = useState(0);
  const read = useCallback((value: string) => {
    const card = Number.parseInt(value, 10);
    if (Number.isNaN(card)) return;
    setCurrent(Math.min(2, Math.floor((8 - card) / 3)));
  }, []);
  const active = finished ? 2 : current;
  return (
    <div
      ref={container}
      data-simulate-roadmap
      data-current={active}
      data-playing={playing}
      onPointerDownCapture={(event) => {
        if (
          event.target instanceof Element &&
          !event.target.closest("[data-roadmap-playback]")
        )
          pause();
      }}
      onFocusCapture={(event) => {
        if (
          event.target instanceof Element &&
          !event.target.closest("[data-roadmap-playback]")
        )
          pause();
      }}
      className="grid min-w-0 md:grid-cols-[1.1fr_1fr]"
    >
      <div className="min-w-0">
        <MarketingHeading
          eyebrow={section.eyebrow}
          title={section.title}
          description={section.description}
          className="pb-8 max-sm:pb-6 [&>p]:text-background-rich/65 [&_.marketing-eyebrow]:text-primary-rich"
        />
        <RiffleFigure label={figureLabel} play={playing} onRead={read} />
      </div>
      <div className="flex min-w-0 flex-col border-[var(--rail-color)] border-t md:border-t-0 md:border-l">
        <div className="flex min-h-24 items-center justify-between gap-4 border-[var(--rail-color)] border-b px-8 py-6 max-sm:px-4">
          <p className="font-medium text-background-rich text-sm">
            {labels.title}
          </p>
          {enhanced && (
            <Button color="emphasis" data-roadmap-playback onClick={toggle}>
              {playing ? labels.pause : labels.play}
            </Button>
          )}
        </div>
        <ol aria-label={labels.title} className="flex flex-1 flex-col">
          {section.items?.map((item, index) => {
            const Icon = icons[index] ?? FileSearchIcon;
            return (
              <li
                key={item.title}
                className="relative grid flex-1 grid-cols-[80px_1fr] border-[var(--rail-color)] border-b last:border-b-0 max-sm:grid-cols-[64px_1fr]"
              >
                <div className="relative flex justify-center pt-8 before:absolute before:inset-y-0 before:left-1/2 before:border-[var(--rail-color)] before:border-l">
                  <span
                    aria-hidden
                    className={cn(
                      "relative grid size-12 place-items-center border bg-emphasis-dimmed",
                      enhanced && active === index
                        ? "border-primary-rich/50 text-primary-rich"
                        : "border-background-rich/20 text-background-rich/45",
                    )}
                  >
                    <Icon className="size-6" />
                  </span>
                </div>
                <div className="py-8 pr-8 max-sm:pr-4">
                  <p className="mb-4 text-primary-rich text-sm">
                    {labels.stages[index]}
                  </p>
                  <h3
                    className={cn(
                      "text-background-rich text-xl",
                      enhanced && active === index && "text-primary-rich",
                    )}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-4 max-w-[36ch] text-background-rich/65 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export namespace SimulateRoadmap {
  export type Props = {
    section: MarketingPage.Section;
    figureLabel: string;
    labels: {
      title: string;
      stages: readonly string[];
      play: string;
      pause: string;
    };
  };
}
