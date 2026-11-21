"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import type { ReactNode } from "react";
import { Motion } from "@/components/motion";
import { Link } from "@/i18n/navigation";
import { ConnectedWorkflow } from "./overview-artwork";
import { useHeroJourney } from "./use-hero-journey";

const Explanation = ({
  step,
  title,
}: {
  step: Journey.Props["copy"]["steps"][number];
  title: ReactNode;
}) => (
  <>
    <p className="font-heading text-lg text-primary-rich leading-tight tracking-tight sm:text-xl">
      {title}
    </p>
    <div className="flex min-w-0 flex-col items-center">
      <p className="max-w-2xl text-pretty text-background-rich/80 text-sm leading-relaxed sm:text-base">
        {step.body}
      </p>
      <div className="mt-4 flex flex-wrap">
        <Button
          variant="soft"
          tone="inverse"
          className="max-w-full whitespace-normal text-center"
          render={<Link href={step.href} />}
        >
          <span className="min-w-0">{step.label}</span>
          <ArrowRightIcon aria-hidden className="size-4 shrink-0" />
        </Button>
      </div>
    </div>
  </>
);

/** The original connected animation, with each job explained in the same place. */
export const Journey = ({ copy, artwork }: Journey.Props) => {
  const journey = useHeroJourney(copy.steps.length, 8000);

  return (
    <section
      aria-label={copy.title}
      className="relative isolate w-full py-8 text-center text-background-rich [--cutout-depth:calc(var(--spacing)*4)] [--cutout-shoulder:calc(var(--spacing)*12)] sm:py-12"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 -z-1 w-dvw -translate-x-1/2 [&>div]:[clip-path:polygon(0_var(--cutout-depth),calc(var(--cutout-shoulder)_-_var(--cutout-depth))_var(--cutout-depth),var(--cutout-shoulder)_0,calc(100%_-_var(--cutout-shoulder))_0,calc(100%_-_var(--cutout-shoulder)_+_var(--cutout-depth))_var(--cutout-depth),100%_var(--cutout-depth),100%_calc(100%_-_var(--cutout-depth)),calc(100%_-_var(--cutout-shoulder)_+_var(--cutout-depth))_calc(100%_-_var(--cutout-depth)),calc(100%_-_var(--cutout-shoulder))_100%,var(--cutout-shoulder)_100%,calc(var(--cutout-shoulder)_-_var(--cutout-depth))_calc(100%_-_var(--cutout-depth)),0_calc(100%_-_var(--cutout-depth)))]"
      >
        <div className="absolute inset-0 bg-background-rich/20" />
        <div className="absolute inset-px bg-emphasis-dimmed" />
      </div>
      <div data-home-product-story data-story-stage={journey.active}>
        <div className="relative">
          <div
            ref={journey.container}
            role="img"
            aria-label={artwork.descriptions[journey.active]}
            data-home-story-workbench
            data-journey-playing={journey.playing}
            className="relative mx-auto w-full min-w-0 max-w-5xl px-4 sm:px-8"
          >
            <ConnectedWorkflow
              copy={artwork}
              active={journey.active}
              enhanced={journey.enhanced && journey.playing}
              playing={journey.playing}
            />
          </div>
          <div className="mx-auto min-w-0 max-w-3xl px-4 pt-4 sm:px-8">
            <div
              data-home-story-caption
              className="relative isolate py-4 before:pointer-events-none before:absolute before:-top-4 before:left-1/2 before:h-4 before:w-px before:bg-background-rich/30"
            >
              <div
                className="grid min-w-0 motion-reduce:hidden"
                onFocusCapture={journey.pause}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget))
                    journey.resume();
                }}
              >
                {copy.steps.map((step, index) => (
                  <div
                    key={step.id}
                    aria-hidden={journey.active !== index}
                    inert={journey.active !== index}
                    className={cn(
                      "col-start-1 row-start-1 flex items-start justify-center",
                      journey.active !== index &&
                        "pointer-events-none invisible",
                    )}
                  >
                    <Motion.Item
                      initial={false}
                      animate={{
                        opacity: journey.active === index ? 1 : 0,
                        y: journey.active === index ? 0 : 4,
                      }}
                      transition={{ duration: journey.enhanced ? 0.2 : 0 }}
                      className="grid w-full justify-items-center gap-2"
                    >
                      <Explanation step={step} title={artwork.stages[index]} />
                    </Motion.Item>
                  </div>
                ))}
              </div>
              <ol className="hidden min-w-0 divide-y divide-background-rich/15 motion-reduce:block">
                {copy.steps.map((step, index) => (
                  <li
                    key={step.id}
                    className="grid justify-items-center gap-2 py-6 first:pt-0 last:pb-0"
                  >
                    <Explanation step={step} title={artwork.stages[index]} />
                  </li>
                ))}
              </ol>
              <noscript>
                <ol className="mt-6 divide-y divide-background-rich/15 border-background-rich/15 border-t motion-reduce:hidden">
                  {copy.steps.slice(1).map((step, index) => (
                    <li
                      key={step.id}
                      className="grid justify-items-center gap-2 py-6 last:pb-0"
                    >
                      <Explanation
                        step={step}
                        title={artwork.stages[index + 1]}
                      />
                    </li>
                  ))}
                </ol>
              </noscript>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export namespace Journey {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["loop"];
    artwork: AppConfig["Messages"]["enterpriseHome"]["hero"]["artwork"];
  };
}
