"use client";

import Image from "next/image";
import { type AppConfig, useFormatter } from "next-intl";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { heroProduct, OverviewJourneyScene } from "./overview-journey-scenes";
import { useHeroJourney } from "./use-hero-journey";

/** One illustrated purchase journey, with the same product and feed throughout. */
export const OverviewArtwork = (copy: OverviewArtwork.Props) => {
  const journey = useHeroJourney(copy.stages.length);
  const format = useFormatter();
  const price = format.number(heroProduct.price, {
    style: "currency",
    currency: heroProduct.currency,
    maximumFractionDigits: 0,
  });
  const supporting = [1, 2, 4].includes(journey.active);

  return (
    <section
      ref={journey.container}
      aria-label={copy.label}
      data-home-hero-artwork
      data-record-stage={journey.active}
      data-journey-playing={journey.playing}
      className="relative isolate m-0 h-80 w-full max-w-4xl shrink-0 text-background-rich"
    >
      <div
        aria-hidden
        className="mask-x-from-90% mask-x-to-100% absolute inset-x-0 top-0 h-72 overflow-hidden"
      >
        {copy.stages.map((title, index) => {
          const offset =
            ((index - journey.active + copy.stages.length + 2) %
              copy.stages.length) -
            2;
          const focused = offset === 0;
          const beforeBeginning =
            !journey.cycled && index > journey.active && offset < 0;
          return (
            <Motion.Item
              key={title}
              data-journey-scene={index}
              initial={false}
              animate={{
                x: `calc(-50% + ${offset * 112}%)`,
                y: focused ? 0 : 10,
                rotate: offset === 0 ? 0 : offset < 0 ? -5 : 5,
                scale: focused ? 1 : 0.88,
                opacity:
                  beforeBeginning || Math.abs(offset) > 1
                    ? 0
                    : focused
                      ? 1
                      : 0.6,
              }}
              transition={{
                duration: journey.enhanced ? 0.65 : 0,
                ease: [0.77, 0, 0.175, 1],
              }}
              className="absolute top-3 left-1/2 h-56 w-3/4 max-w-60 sm:w-1/3"
            >
              <OverviewJourneyScene
                index={index}
                active={focused}
                enhanced={journey.enhanced}
                copy={copy}
                price={price}
              />
            </Motion.Item>
          );
        })}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
      >
        {[
          { id: "incoming", path: "M166 216 C166 275 314 278 420 278" },
          { id: "ecentic", path: "M448 269 C448 260 448 250 448 236" },
          { id: "outgoing", path: "M730 216 C730 275 582 278 476 278" },
        ].map((connection) => (
          <div key={connection.id} className="absolute inset-0">
            <svg
              viewBox="0 0 896 320"
              preserveAspectRatio="none"
              fill="none"
              className="size-full text-background-rich/15"
            >
              <path
                d={connection.path}
                stroke="currentColor"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <Motion.Item
              key={journey.active}
              data-hero-connection={connection.id}
              initial={
                journey.enhanced ? { clipPath: "inset(100% 0 0 0)" } : false
              }
              animate={{
                opacity: connection.id === "ecentic" && supporting ? 1 : 0,
                clipPath: "inset(0% 0 0 0)",
              }}
              transition={{
                duration: journey.enhanced ? 0.65 : 0,
                delay: journey.enhanced ? 0.25 : 0,
              }}
              className="absolute inset-0 text-background-rich/65"
            >
              <svg
                viewBox="0 0 896 320"
                preserveAspectRatio="none"
                fill="none"
                className="size-full"
              >
                <path
                  d={connection.path}
                  stroke="currentColor"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </Motion.Item>
          </div>
        ))}
        <Motion.Item
          initial={false}
          animate={{
            opacity: supporting ? 0.8 : 0.2,
            scale: supporting ? 1 : 0.8,
          }}
          transition={{ duration: journey.enhanced ? 0.5 : 0 }}
          className="absolute bottom-4 left-1/2 h-24 w-32 -translate-x-1/2 rounded-full bg-primary-rich/45 blur-xl"
        />
        <Image
          src="/images/logo.svg"
          width={1225}
          height={1107}
          alt=""
          unoptimized
          className="absolute bottom-0 left-1/2 h-20 w-24 -translate-x-1/2 object-contain"
        />
        <Plus className="absolute right-1/4 bottom-8 hidden size-3 text-background-rich/30 sm:block" />
        <Plus className="absolute bottom-8 left-1/4 hidden size-3 text-background-rich/30 sm:block" />
      </div>
    </section>
  );
};

export namespace OverviewArtwork {
  export type Props =
    AppConfig["Messages"]["enterpriseHome"]["hero"]["artwork"];
}
