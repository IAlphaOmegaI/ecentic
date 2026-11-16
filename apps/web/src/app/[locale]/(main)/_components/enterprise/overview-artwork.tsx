"use client";

import { CheckIcon } from "@zenncore/icons";
import Image from "next/image";
import type { AppConfig } from "next-intl";
import { useSequence } from "@/components/marketing/interactive/use-sequence";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { OverviewCatalog } from "./overview-catalog";

const sources = ["shopify", "woocommerce", "adobe", "wix"] as const;
const models = ["chatgpt", "claude", "gemini", "perplexity"] as const;

/** One illuminated catalog connects the store to the channels that read it. */
export const OverviewArtwork = (copy: OverviewArtwork.Props) => {
  const { container, active, enhanced } = useSequence({
    length: 4,
    delay: 1400,
  });
  const stage = enhanced ? active : 3;

  return (
    <figure
      ref={container}
      role="img"
      data-home-hero-artwork
      data-record-stage={stage}
      aria-label={copy.label}
      className="relative isolate m-0 h-88 w-full max-w-xs shrink-0 text-background-rich sm:h-80 sm:max-w-3xl"
    >
      <div aria-hidden className="absolute inset-0">
        <Motion.Item
          data-catalog-light
          initial={false}
          animate={{
            opacity: stage >= 2 ? 1 : 0.12,
            scaleX: stage >= 2 ? 1 : 0.65,
          }}
          transition={{ duration: enhanced ? 0.65 : 0 }}
          className="absolute top-1/2 right-16 -translate-y-1/2 -rotate-90 sm:top-auto sm:right-auto sm:bottom-12 sm:left-1/2 sm:-translate-x-1/2 sm:translate-y-0 sm:rotate-0"
        >
          <div className="h-0 w-0 border-x-64 border-x-transparent border-t-160 border-t-primary-rich/30 blur-md sm:border-x-128 sm:border-t-224 sm:blur-lg" />
          <div className="absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2 border-x-40 border-x-transparent border-t-160 border-t-background-rich/15 blur-md sm:border-x-80 sm:border-t-224" />
        </Motion.Item>
        {[
          {
            id: "store",
            ready: stage >= 1,
            mobile: "M140 60 C218 60 182 136 250 168",
            desktop: "M134 192 C134 245 220 268 352 268",
          },
          {
            id: "catalog",
            ready: stage >= 2,
            mobile: "M128 176 C188 150 212 150 252 170",
            desktop: "M408 164 C450 194 436 238 384 254",
          },
          {
            id: "channels",
            ready: stage === 3,
            mobile: "M140 294 C218 294 182 216 250 184",
            desktop: "M634 192 C634 245 548 268 416 268",
          },
        ].map((connection) => (
          <Motion.Item
            key={connection.id}
            data-hero-connection={connection.id}
            initial={false}
            animate={{ opacity: connection.ready ? 1 : 0.15 }}
            transition={{ duration: enhanced ? 0.6 : 0 }}
            className="absolute inset-0 text-background-rich/45"
          >
            <svg
              viewBox="0 0 320 352"
              preserveAspectRatio="none"
              fill="none"
              className="size-full sm:hidden"
            >
              <path
                d={connection.mobile}
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <svg
              viewBox="0 0 768 320"
              preserveAspectRatio="none"
              fill="none"
              className="hidden size-full sm:block"
            >
              <path
                d={connection.desktop}
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </Motion.Item>
        ))}
        <div className="absolute inset-y-3 left-2 z-1 flex w-1/2 flex-col items-center justify-between gap-2 sm:inset-x-6 sm:inset-y-auto sm:top-2 sm:h-48 sm:w-auto sm:flex-row sm:gap-0.5">
          <Motion.Item
            data-hero-store
            initial={false}
            animate={{ x: stage >= 1 ? 0 : -4, rotate: stage >= 1 ? -6 : -8 }}
            transition={{ duration: enhanced ? 0.55 : 0 }}
            className="w-full max-w-28 shrink-0 sm:w-1/3 sm:max-w-44 sm:translate-y-4"
          >
            <div className="relative h-24 rounded-lg border border-foreground/15 bg-linear-to-br from-background-rich to-background-dimmed shadow-emphasis/10 shadow-sm sm:h-44">
              <div className="absolute -inset-x-1 -top-2 h-4 rounded-t-lg border border-foreground/15 bg-linear-to-b from-background-rich to-background-dimmed sm:-top-3 sm:h-6" />
              <div className="absolute -inset-x-1 top-2 z-1 grid h-4 grid-cols-5 sm:top-3 sm:h-6">
                {[0, 1, 2, 3, 4].map((stripe) => (
                  <div
                    key={stripe}
                    className={
                      stripe % 2 === 0
                        ? "rounded-b-sm border-foreground/10 border-b bg-linear-to-b from-background-rich to-background-dimmed"
                        : "rounded-b-sm border-foreground/10 border-b bg-linear-to-b from-primary/10 to-primary/20"
                    }
                  />
                ))}
              </div>
              <div className="absolute top-8 right-1/3 bottom-3 left-1 rounded-lg border border-foreground/15 bg-linear-to-br from-primary/5 to-background-rich sm:top-12 sm:bottom-4 sm:left-2">
                <div
                  data-source-provider-logos
                  className="absolute inset-0 grid grid-cols-2 place-items-center gap-1 p-1 sm:gap-2 sm:p-2"
                >
                  {sources.map((provider) => (
                    <ProviderLogo
                      key={provider}
                      provider={provider}
                      decorative
                      className={
                        provider === "shopify"
                          ? "size-5 object-center sm:size-8"
                          : "h-5 w-6 object-center sm:h-8 sm:w-10"
                      }
                    />
                  ))}
                </div>
              </div>
              <div className="absolute top-8 right-1 bottom-0 w-1/4 rounded-t-lg border border-foreground/15 bg-linear-to-br from-primary/10 to-background-rich sm:top-12 sm:right-2">
                <div className="absolute top-1/2 right-1 h-3 w-0.5 rounded-full bg-foreground/55 sm:right-2 sm:h-4" />
                <div className="absolute inset-x-1 top-1/3 h-px bg-foreground/15" />
              </div>
              <div className="absolute -inset-x-1 -bottom-1 h-1.5 rounded-full border border-foreground/15 bg-background-rich" />
            </div>
          </Motion.Item>
          <Motion.Item
            data-hero-catalog
            initial={false}
            animate={{ y: stage >= 2 ? -4 : 0, rotate: stage >= 2 ? 0 : -3 }}
            transition={{ duration: enhanced ? 0.6 : 0 }}
            className="relative w-full max-w-28 shrink-0 sm:w-2/5 sm:max-w-48"
          >
            <Motion.Item
              initial={false}
              animate={{ opacity: stage >= 2 ? 0.7 : 0 }}
              transition={{ duration: enhanced ? 0.65 : 0 }}
              className="absolute inset-0 rounded-full bg-primary-rich/40 blur-xl"
            />
            <OverviewCatalog
              view={stage === 1 ? "json" : "catalog"}
              animated={enhanced}
              className="relative w-full"
            />
          </Motion.Item>
          <Motion.Item
            data-hero-channels
            initial={false}
            animate={{ y: stage === 3 ? 0 : 4, rotate: stage === 3 ? 6 : 8 }}
            transition={{ duration: enhanced ? 0.55 : 0 }}
            className="w-full max-w-28 shrink-0 sm:w-1/4 sm:max-w-44 sm:translate-y-4"
          >
            <div className="relative h-20 rounded-lg border border-foreground/15 bg-linear-to-br from-background-rich to-background-dimmed shadow-emphasis/10 shadow-sm sm:h-36">
              <div
                data-comparison-provider-logos
                className={
                  stage === 3
                    ? "absolute inset-x-1 top-1 grid h-5 grid-cols-4 place-items-center gap-0.5 sm:inset-x-3 sm:top-2 sm:h-6 sm:gap-2"
                    : "absolute inset-0 grid grid-cols-2 place-items-center gap-2 p-2 sm:gap-4 sm:p-4"
                }
              >
                {models.map((provider) => (
                  <Motion.Item
                    key={provider}
                    layout={enhanced}
                    initial={false}
                    transition={{ duration: enhanced ? 0.45 : 0 }}
                    className={
                      stage === 3 ? "size-3 sm:size-5" : "size-5 sm:size-8"
                    }
                  >
                    <ProviderLogo
                      provider={provider}
                      decorative
                      className={
                        provider === "perplexity"
                          ? "size-full object-center brightness-0"
                          : "size-full object-center"
                      }
                    />
                  </Motion.Item>
                ))}
              </div>
              <Motion.Item
                data-selected-product="espresso-cup"
                initial={false}
                animate={{
                  opacity: stage === 3 ? 1 : 0,
                  y: stage === 3 ? 0 : 8,
                  scale: stage === 3 ? 1 : 0.9,
                }}
                transition={{ duration: enhanced ? 0.45 : 0 }}
                className="absolute inset-x-2 top-7 bottom-3 flex items-center justify-center sm:inset-x-4 sm:top-11 sm:bottom-4"
              >
                <Image
                  src="/images/marketing/hero-espresso-cup.webp"
                  width={512}
                  height={512}
                  alt=""
                  sizes="(min-width: 640px) 96px, 48px"
                  className="h-full w-auto max-w-full object-contain mix-blend-multiply"
                />
                <span className="absolute right-0 bottom-0 grid size-3 place-items-center rounded-full bg-primary-rich text-emphasis-dimmed sm:right-1 sm:size-5">
                  <CheckIcon className="size-2 sm:size-3" />
                </span>
              </Motion.Item>
              <Motion.Item
                initial={false}
                animate={{ opacity: stage === 3 ? 1 : 0.2 }}
                transition={{ duration: enhanced ? 0.45 : 0 }}
                className="absolute inset-x-2 bottom-0 h-px bg-linear-to-r from-transparent via-primary-rich to-transparent sm:inset-x-5"
              />
            </div>
            <div className="mx-auto h-3 w-1/4 border-foreground/15 border-x bg-linear-to-r from-background-dimmed to-background-rich sm:h-6" />
            <div className="mx-auto h-1 w-1/2 rounded-full border border-foreground/15 bg-background-rich sm:h-2" />
          </Motion.Item>
        </div>
        <div className="absolute top-1/2 right-0 flex -translate-y-1/2 flex-col items-center sm:top-auto sm:right-auto sm:bottom-3 sm:left-1/2 sm:-translate-x-1/2 sm:translate-y-0">
          <Motion.Item
            initial={false}
            animate={{
              opacity: stage >= 2 ? 0.8 : 0.15,
              scale: stage >= 2 ? 1 : 0.7,
            }}
            transition={{ duration: enhanced ? 0.65 : 0 }}
            className="absolute top-3 h-8 w-16 rounded-full bg-primary-rich/50 blur-xl sm:w-24"
          />
          <Image
            src="/images/logo.svg"
            width={1225}
            height={1107}
            alt=""
            className="relative h-20 w-24 object-contain"
            unoptimized
          />
        </div>
        <Plus className="absolute right-1/4 bottom-10 hidden size-3 text-background-rich/35 sm:block" />
        <Plus className="absolute bottom-10 left-1/4 hidden size-3 text-background-rich/35 sm:block" />
      </div>
    </figure>
  );
};

export namespace OverviewArtwork {
  export type Props =
    AppConfig["Messages"]["enterpriseHome"]["hero"]["artwork"];
}
