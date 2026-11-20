"use client";

import Image from "next/image";
import type { AppConfig } from "next-intl";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import {
  heroProduct,
  OverviewChannels,
  OverviewSource,
  OverviewWorkbench,
} from "./overview-journey-scenes";
import { useHeroJourney } from "./use-hero-journey";

const connections = [
  {
    id: "catalog",
    path: "M180 170 H280 Q304 170 304 194 V286 Q304 344 476 344",
  },
  { id: "ecentic", path: "M512 320 V280" },
  {
    id: "channels",
    path: "M844 170 H744 Q720 170 720 194 V286 Q720 344 548 344",
  },
] as const;

/** The same scene drives the reusable banner and the homepage walkthrough. */
export const ConnectedWorkflow = ({
  copy,
  active,
  enhanced,
  playing,
}: ConnectedWorkflow.Props) => (
  <div
    aria-hidden
    data-connected-workflow
    data-record-stage={active}
    className="relative h-120 md:h-112"
  >
    <div className="pointer-events-none absolute inset-0 hidden md:block">
      {connections.map((connection, index) => (
        <div key={connection.id} className="absolute inset-0">
          <svg
            viewBox="0 0 1024 384"
            preserveAspectRatio="none"
            fill="none"
            className="size-full text-background-rich/25"
          >
            <path
              d={connection.path}
              stroke="currentColor"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <Motion.Item
            key={`${connection.id}-${active}`}
            data-hero-connection={connection.id}
            initial={
              enhanced
                ? {
                    clipPath:
                      index === 2
                        ? "inset(0% 100% 0% 0%)"
                        : "inset(0% 0% 0% 100%)",
                    opacity: 0,
                  }
                : false
            }
            animate={{
              clipPath: "inset(0% 0% 0% 0%)",
              opacity: index === 2 && active < 3 ? 0.25 : 1,
            }}
            transition={{
              duration: enhanced ? 1 : 0,
              delay: enhanced ? index * 0.2 : 0,
            }}
            className="absolute inset-0 text-background-rich/80"
          >
            <svg
              viewBox="0 0 1024 384"
              preserveAspectRatio="none"
              fill="none"
              className="size-full"
            >
              <path
                d={connection.path}
                stroke="currentColor"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </Motion.Item>
        </div>
      ))}
      {enhanced && playing && active === 0 && (
        <Motion.Item
          key={`feed-${active}`}
          data-hero-packet="feed"
          initial={{ opacity: 0, left: "18%", top: "44%" }}
          animate={{
            left: ["18%", "27%", "30%", "30%", "46%"],
            top: ["44%", "44%", "50%", "75%", "89%"],
            opacity: [0, 1, 1, 1, 0],
            rotate: [0, 0, 8, 8, 0],
          }}
          transition={{
            duration: 2,
            delay: 0.25,
            times: [0, 0.2, 0.35, 0.65, 1],
            ease: "easeInOut",
          }}
          className="absolute z-3 grid h-9 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-sm border border-primary/30 bg-background-rich font-mono text-primary-text text-xs shadow-emphasis/15 shadow-sm"
        >
          {"{ }"}
        </Motion.Item>
      )}
      {enhanced && playing && (active === 1 || active === 3) && (
        <Motion.Item
          key={`listing-${active}`}
          data-hero-packet="listing"
          initial={{ opacity: 0, left: "50%", top: "89%" }}
          animate={{
            left:
              active === 3
                ? ["46%", "30%", "30%", "27%", "18%"]
                : ["54%", "70%", "70%", "73%", "82%"],
            top: ["89%", "75%", "50%", "44%", "44%"],
            opacity: [0, 1, 1, 1, 0],
            rotate: [0, -8, -8, 0, 0],
          }}
          transition={{
            duration: 2,
            delay: 0.5,
            times: [0, 0.35, 0.65, 0.8, 1],
            ease: "easeInOut",
          }}
          className="absolute z-3 size-10 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-sm border border-primary/30 bg-background-rich shadow-emphasis/15 shadow-sm"
        >
          <Image
            src={heroProduct.image}
            width={80}
            height={80}
            alt=""
            sizes="40px"
            className="size-full object-contain mix-blend-multiply"
          />
        </Motion.Item>
      )}
    </div>
    <div className="pointer-events-none absolute inset-x-8 top-10 h-20 md:hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-background-rich/40" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-background-rich/40" />
      <Motion.Item
        key={active}
        initial={enhanced ? { scaleY: 0 } : false}
        animate={{ scaleY: 1 }}
        transition={{ duration: enhanced ? 0.8 : 0 }}
        className="absolute inset-y-0 left-1/2 w-px origin-top bg-background-rich"
      />
    </div>

    <Motion.Item
      initial={false}
      animate={{ rotate: -4, y: active === 0 ? -4 : 0 }}
      transition={{ duration: enhanced ? 0.55 : 0 }}
      className="absolute top-24 left-2 hidden w-1/5 max-w-48 md:block"
    >
      <OverviewSource />
    </Motion.Item>
    <div className="absolute top-4 left-0 w-2/5 md:hidden">
      <OverviewSource compact />
    </div>

    <Motion.Item
      initial={false}
      animate={{ rotate: 4, y: active >= 3 ? -4 : 0 }}
      transition={{ duration: enhanced ? 0.55 : 0 }}
      className="absolute top-24 right-2 hidden w-1/5 max-w-48 md:block"
    >
      <OverviewChannels active={active} enhanced={enhanced} copy={copy} />
    </Motion.Item>
    <div className="absolute top-4 right-0 w-2/5 md:hidden">
      <OverviewChannels
        active={active}
        enhanced={enhanced}
        copy={copy}
        compact
      />
    </div>

    <div className="absolute top-28 left-1/2 h-88 w-full max-w-96 -translate-x-1/2 md:top-0 md:w-5/12">
      <div className="pointer-events-none absolute -inset-x-8 inset-y-8 rounded-full bg-primary-rich/25 blur-2xl" />
      <div className="absolute inset-2 -rotate-3 rounded-lg border border-background-rich/30 bg-background-rich/20" />
      <OverviewWorkbench active={active} enhanced={enhanced} copy={copy} />
    </div>

    <div className="pointer-events-none absolute top-5 left-1/2 z-2 h-12 w-10 -translate-x-1/2 md:top-auto md:bottom-0 md:h-20 md:w-24">
      <Motion.Item
        initial={false}
        animate={{
          opacity: active === 0 ? 0.35 : 0.7,
          scale: active === 0 ? 0.9 : 1,
        }}
        transition={{ duration: enhanced ? 0.5 : 0 }}
        className="absolute inset-0 rounded-full bg-primary-rich/60 blur-xl"
      />
      <Image
        src="/images/logo.svg"
        width={1225}
        height={1107}
        alt=""
        unoptimized
        className="relative size-full object-contain"
      />
    </div>
    <Plus className="absolute right-1/4 bottom-4 hidden size-3 text-background-rich/35 md:block" />
    <Plus className="absolute bottom-4 left-1/4 hidden size-3 text-background-rich/35 md:block" />
  </div>
);

export namespace ConnectedWorkflow {
  export type Props = {
    copy: OverviewArtwork.Props;
    active: number;
    enhanced: boolean;
    playing: boolean;
  };
}

/** A single connected system: the product stays in place while the work becomes visible. */
export const OverviewArtwork = (copy: OverviewArtwork.Props) => {
  const journey = useHeroJourney(copy.stages.length);
  const active = journey.enhanced ? journey.active : 2;

  return (
    <section
      ref={journey.container}
      aria-label={copy.label}
      data-home-hero-artwork
      data-record-stage={active}
      data-journey-playing={journey.playing}
      className="relative isolate m-0 w-full max-w-5xl shrink-0 text-background-rich"
    >
      <ConnectedWorkflow
        copy={copy}
        active={active}
        enhanced={journey.enhanced}
        playing={journey.playing}
      />
      <div className="relative mx-auto grid min-h-20 max-w-2xl px-2 pt-4 text-center">
        {copy.descriptions.map((description, index) => (
          <Motion.Item
            key={description}
            initial={false}
            animate={{
              opacity: active === index ? 1 : 0,
              y: active === index ? 0 : 4,
            }}
            transition={{ duration: journey.enhanced ? 0.35 : 0 }}
            aria-hidden={active !== index}
            className="col-start-1 row-start-1 text-pretty text-background-rich/90 text-sm leading-relaxed sm:text-base"
          >
            {description}
          </Motion.Item>
        ))}
      </div>
    </section>
  );
};

export namespace OverviewArtwork {
  export type Props =
    AppConfig["Messages"]["enterpriseHome"]["hero"]["artwork"];
}
