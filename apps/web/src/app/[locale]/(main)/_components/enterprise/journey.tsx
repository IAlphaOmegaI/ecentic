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
    <p className="font-heading text-background-rich text-lg leading-tight tracking-tight sm:text-xl">
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
      className="w-full text-center text-background-rich"
    >
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
          <div
            className="mx-auto grid min-w-0 max-w-3xl px-4 pt-4 motion-reduce:hidden sm:px-8"
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
                  journey.active !== index && "pointer-events-none invisible",
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
          <ol className="mx-auto hidden min-w-0 max-w-3xl divide-y divide-background-rich/15 px-4 motion-reduce:block sm:px-8">
            {copy.steps.map((step, index) => (
              <li
                key={step.id}
                className="grid justify-items-center gap-2 py-6"
              >
                <Explanation step={step} title={artwork.stages[index]} />
              </li>
            ))}
          </ol>
        </div>
        <noscript>
          <ol className="mx-auto max-w-3xl divide-y divide-background-rich/15 px-4 motion-reduce:hidden sm:px-8">
            {copy.steps.slice(1).map((step, index) => (
              <li
                key={step.id}
                className="grid justify-items-center gap-2 py-6"
              >
                <Explanation step={step} title={artwork.stages[index + 1]} />
              </li>
            ))}
          </ol>
        </noscript>
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
