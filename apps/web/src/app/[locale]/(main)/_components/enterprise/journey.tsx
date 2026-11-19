"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { MarketingFeatureBand } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { useDocument } from "@/hooks/use-document";
import { Link } from "@/i18n/navigation";
import { OverviewWorkbench } from "./overview-journey-scenes";

/** The reader's scroll advances one product through the five actual jobs. */
export const Journey = ({ copy, artwork }: Journey.Props) => {
  const container = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [active, setActive] = useState(0);
  const { window } = useDocument();
  const { ready, reduced } = useInteractive();
  const enhanced = ready && !reduced;

  useEffect(() => {
    if (!window || !container.current) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const chapters = Array.from(
      container.current.querySelectorAll<HTMLElement>("[data-journey-stage]"),
    );
    const update = () => {
      frame.current = null;
      if (!desktop.matches) return;
      const readingLine = window.innerHeight * 0.45;
      const index = chapters.findIndex((chapter) => {
        const bounds = chapter.getBoundingClientRect();
        return bounds.top <= readingLine && bounds.bottom > readingLine;
      });
      if (index >= 0) setActive(index);
    };
    const schedule = () => {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [window]);

  return (
    <MarketingFeatureBand tone="dark" className="enterprise-journey-panel">
      <div ref={container} data-home-product-story>
        <header className="relative border-background-rich/15 border-y px-4 py-8 sm:px-8 sm:py-12">
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <h2 className="max-w-2xl font-heading text-3xl leading-tight tracking-tight xl:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-4 max-w-2xl text-background-rich/75 text-base leading-relaxed">
            {copy.description}
          </p>
        </header>
        <div className="relative grid border-background-rich/15 border-b lg:grid-cols-2">
          <ol className="min-w-0">
            {copy.steps.map((step, index) => (
              <li
                key={step.id}
                data-journey-stage={step.id}
                className="relative flex min-w-0 flex-col justify-center border-background-rich/15 border-b px-4 py-8 last:border-b-0 sm:px-8 sm:py-12 lg:min-h-112 lg:py-16"
              >
                <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                <h3 className="flex items-baseline gap-4 font-heading text-2xl leading-tight tracking-tight sm:text-3xl">
                  <span className="shrink-0 text-primary-rich tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{step.title}</span>
                </h3>
                <p className="mt-6 max-w-md text-background-rich/75 text-base leading-relaxed">
                  {step.body}
                </p>
                <div className="mt-6 flex flex-wrap">
                  <Button
                    variant="soft"
                    tone="inverse"
                    className="max-w-full whitespace-normal text-left"
                    render={<Link href={step.href} />}
                  >
                    <span className="min-w-0">{step.label}</span>
                    <ArrowRightIcon aria-hidden className="size-4 shrink-0" />
                  </Button>
                </div>
                <div
                  role="img"
                  aria-label={artwork.descriptions[index]}
                  className="mt-6 h-80 w-full min-w-0 lg:hidden"
                >
                  <div aria-hidden className="h-full">
                    <OverviewWorkbench
                      detailed
                      active={index}
                      enhanced={false}
                      copy={artwork}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="relative hidden min-w-0 border-background-rich/15 border-l bg-linear-to-br from-primary/10 via-transparent to-transparent lg:block">
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <div
              aria-hidden
              data-home-story-workbench
              data-story-stage={active}
              className="sticky top-20 flex min-h-112 flex-col justify-center px-8 py-8"
            >
              <div className="h-88 min-w-0">
                <OverviewWorkbench
                  detailed
                  active={active}
                  enhanced={enhanced}
                  copy={artwork}
                />
              </div>
              <div className="mt-8 flex items-center gap-2">
                {copy.steps.map((step, index) => (
                  <span
                    key={step.id}
                    className={cn(
                      "h-px flex-1",
                      index <= active
                        ? "bg-primary-rich"
                        : "bg-background-rich/15",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingFeatureBand>
  );
};

export namespace Journey {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["loop"];
    artwork: AppConfig["Messages"]["enterpriseHome"]["hero"]["artwork"];
  };
}
