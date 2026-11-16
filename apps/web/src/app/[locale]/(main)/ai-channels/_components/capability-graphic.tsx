"use client";

import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceFileShieldIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Motion } from "@/components/motion";
import type { AiChannel } from "@/content/ai-channels";

const ChannelMark = ({
  channel,
  className,
}: {
  channel: AiChannel["key"];
  className: string;
}) =>
  channel === "chatgpt" ? (
    <Image
      src="/images/chatgpt.svg"
      alt=""
      width={40}
      height={40}
      className={cn("brightness-0 invert", className)}
      unoptimized
    />
  ) : (
    <ProviderLogo
      provider={channel}
      decorative
      className={cn(
        className,
        (channel === "perplexity" || channel === "amazon") &&
          "brightness-0 invert",
      )}
    />
  );

/** Concept diagrams only; the adjacent capability status states actual availability. */
export const CapabilityGraphic = ({
  capability,
  channel,
}: CapabilityGraphic.Props) => {
  const { ready, reduced } = useInteractive();
  return (
    <div
      aria-hidden
      data-channel-graphic={capability}
      className={cn(
        "relative isolate flex h-44 min-w-0 items-center justify-center overflow-hidden px-6",
        capability === "simulate" && "h-60 sm:h-72",
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-1 bg-radial-[at_50%_100%] from-primary/18 via-primary/4 to-transparent" />
      {capability === "simulate" ? (
        <div className="relative h-full w-full max-w-96">
          <ChannelMark
            channel={channel}
            className="absolute top-2 left-1/2 h-10 w-auto max-w-28 -translate-x-1/2 rounded-none object-center"
          />
          <div className="absolute inset-x-10 top-12 bottom-0 bg-linear-to-b from-primary/5 via-primary/20 to-transparent [clip-path:polygon(44%_0,56%_0,100%_100%,0_100%)]" />
          {[-1, 0, 1].map((position) => (
            <Motion.Item
              key={position}
              initial={false}
              whileInView={
                ready && !reduced && position === 0 ? { y: [12, 0] } : { y: 0 }
              }
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              style={{
                left: `${35 + position * 28}%`,
                top: position === 0 ? "30%" : "42%",
                rotate: `${position * 6}deg`,
              }}
              className={cn(
                "absolute flex h-32 w-[30%] flex-col justify-between rounded-lg border p-4",
                position === 0
                  ? "z-1 border-primary-rich/60 bg-linear-to-br from-primary-dimmed to-emphasis-dimmed shadow-lg shadow-primary/20"
                  : "border-background-rich/20 bg-linear-to-br from-emphasis-rich to-emphasis-dimmed",
              )}
            >
              <CommerceBasketShoppingIcon className="mx-auto size-10 text-primary-rich" />
              <div className="space-y-2">
                <span className="block h-px w-full bg-background-rich/45" />
                <span className="block h-px w-2/3 bg-background-rich/25" />
              </div>
            </Motion.Item>
          ))}
        </div>
      ) : capability === "fix" ? (
        <div className="w-full max-w-72 rounded-lg border border-background-rich/20 bg-linear-to-br from-emphasis-rich to-emphasis-dimmed p-4 font-mono text-sm leading-7">
          <span className="text-background-rich/50">{"{"}</span>
          <p>
            <span className="text-primary-rich">{'  "title"'}</span>
            <span className="text-background-rich/70">{': "…",'}</span>
          </p>
          <p>
            <span className="text-warning">{'  "description"'}</span>
            <span className="text-background-rich/70">{': "…"'}</span>
          </p>
          <span className="text-background-rich/50">{"}"}</span>
        </div>
      ) : capability === "checkout" ? (
        <div className="flex w-full max-w-80 items-center justify-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center rounded-lg border border-primary-rich/40 bg-linear-to-br from-primary-dimmed to-emphasis-dimmed">
            <CommerceBasketShoppingIcon className="size-10 text-primary-rich" />
          </div>
          <div className="relative h-px min-w-8 flex-1 bg-linear-to-r from-primary-rich/25 to-primary-rich/60">
            <ArrowRightIcon className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-primary-rich" />
          </div>
          <div className="grid size-20 shrink-0 place-items-center rounded-lg border border-background-rich/20 bg-emphasis-dimmed">
            <CommerceFileShieldIcon className="size-10 text-background-rich/70" />
          </div>
        </div>
      ) : (
        <div className="flex w-full max-w-80 items-center gap-6">
          <div className="relative grid size-24 shrink-0 place-items-center rounded-full border border-primary-rich/25">
            <div className="grid size-16 place-items-center rounded-full border border-primary-rich/50">
              <ChannelMark
                channel={channel}
                className="h-8 w-auto max-w-10 rounded-none object-center"
              />
            </div>
            <span className="absolute top-0 left-1/2 size-2 -translate-y-1/2 rounded-full bg-primary-rich" />
          </div>
          <div className="flex-1 space-y-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <span className="size-2 shrink-0 rounded-full bg-primary-rich/55" />
                <span className="h-px flex-1 bg-linear-to-r from-background-rich/50 to-transparent" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export namespace CapabilityGraphic {
  export type Props = {
    channel: AiChannel["key"];
    capability: "simulate" | "fix" | "checkout" | "track";
  };
}
