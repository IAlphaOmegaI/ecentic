"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import type { ReactNode } from "react";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
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
    <h3 className="font-heading text-2xl text-background-rich leading-tight tracking-tight sm:text-3xl">
      {title}
    </h3>
    <div className="flex min-w-0 flex-col items-start">
      <p className="max-w-2xl text-background-rich/75 text-base leading-relaxed">
        {step.body}
      </p>
      <div className="mt-4 flex flex-wrap">
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
    </div>
  </>
);

/** The original connected animation, with each job explained in the same place. */
export const Journey = ({ copy, artwork }: Journey.Props) => {
  const journey = useHeroJourney(copy.steps.length, 8000);

  return (
    <section
      aria-label={copy.title}
      className="w-full text-left text-background-rich"
    >
      <div data-home-product-story data-story-stage={journey.active}>
        <header className="relative border-background-rich/15 border-y px-4 py-6 sm:px-8">
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <h2 className="max-w-2xl font-heading text-background-rich text-xl leading-tight tracking-tight sm:text-2xl">
            {copy.title}
          </h2>
          <p className="mt-4 max-w-2xl text-background-rich/75 text-base leading-relaxed">
            {copy.description}
          </p>
        </header>
        <div className="relative grid border-background-rich/15 border-b lg:grid-cols-3">
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div
            ref={journey.container}
            role="img"
            aria-label={artwork.descriptions[journey.active]}
            data-home-story-workbench
            data-journey-playing={journey.playing}
            className="relative min-w-0 px-4 pt-6 pb-8 sm:px-8 lg:col-span-2"
          >
            <ConnectedWorkflow
              copy={artwork}
              active={journey.active}
              enhanced={journey.enhanced && journey.playing}
              playing={journey.playing}
            />
          </div>
          <div
            className="grid min-w-0 border-background-rich/15 border-t motion-reduce:hidden lg:border-t-0 lg:border-l"
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
                  "col-start-1 row-start-1 flex items-center px-4 py-6 sm:px-8 sm:py-8",
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
                  className="grid gap-4"
                >
                  <Explanation step={step} title={artwork.stages[index]} />
                </Motion.Item>
              </div>
            ))}
          </div>
          <ol className="hidden min-w-0 divide-y divide-background-rich/15 border-background-rich/15 border-t motion-reduce:block lg:border-t-0 lg:border-l">
            {copy.steps.map((step, index) => (
              <li key={step.id} className="grid gap-4 px-4 py-6 sm:px-8">
                <Explanation step={step} title={artwork.stages[index]} />
              </li>
            ))}
          </ol>
        </div>
        <noscript>
          <ol className="divide-y divide-background-rich/15 motion-reduce:hidden">
            {copy.steps.slice(1).map((step, index) => (
              <li key={step.id} className="grid gap-4 px-4 py-6 sm:px-8">
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
