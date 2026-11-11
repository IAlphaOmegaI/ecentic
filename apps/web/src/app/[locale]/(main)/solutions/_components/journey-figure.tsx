"use client";

import {
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Motion } from "@/components/motion";

const icons = [
  CommercePlug_3SparkleIcon,
  CommerceChartActivity_2Icon,
  CommerceFilePenIcon,
  CommerceBasketShoppingIcon,
  CommerceFileShieldIcon,
] as const;

/** Decorative geometry. The adjacent copy contains the complete sample and its limits. */
export const JourneyFigure = ({
  stage,
  large = false,
  animate = false,
}: {
  stage: number;
  large?: boolean;
  animate?: boolean;
}) => {
  const { ready, reduced } = useInteractive();
  const Icon = icons[stage % icons.length] ?? CommerceFileShieldIcon;
  return (
    <div
      aria-hidden
      className={cn(
        "relative isolate h-52 overflow-hidden",
        large && "h-64 sm:h-80",
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-1 bg-radial-[at_50%_60%] from-primary/20 via-primary/5 to-transparent" />
      <div className="absolute inset-x-[12%] top-1/2 h-px bg-linear-to-r from-transparent via-primary-rich/70 to-transparent" />
      {animate && ready && !reduced && (
        <Motion.Item
          initial={{ opacity: 0, x: "-45%" }}
          whileInView={{ opacity: [0, 0.7, 0], x: "145%" }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{
            duration: 1.8,
            ease: [0.22, 1, 0.36, 1],
            delay: stage * 0.08,
          }}
          className="absolute top-1/2 left-[15%] h-px w-1/2 bg-linear-to-r from-transparent via-primary-rich to-transparent"
        />
      )}
      {stage === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center gap-4 sm:gap-8">
          <div className="isolate flex -space-x-4">
            {(["shopify", "woocommerce"] as const).map((provider) => (
              <div
                key={provider}
                className="relative flex size-14 items-center justify-center rounded-xl border border-background-rich/60 bg-background-rich! p-2 shadow-emphasis-dimmed/20 shadow-lg first:z-1 sm:size-18 sm:p-3"
              >
                <ProviderLogo
                  provider={provider}
                  decorative
                  className="h-8 w-full max-w-full rounded-none object-center sm:h-10"
                />
              </div>
            ))}
          </div>
          <div className="relative h-px w-6 bg-linear-to-r from-primary-rich/20 to-primary-rich/70 sm:w-10" />
          <div className="relative w-28 rounded-lg border border-primary-rich/50 bg-linear-to-br from-primary-dimmed to-emphasis-dimmed p-4 shadow-emphasis-dimmed/30 shadow-lg sm:w-36 sm:p-6">
            <Icon className="size-7 text-primary-rich" />
            <div className="mt-5 h-px w-4/5 bg-background-rich/50" />
            <div className="mt-3 h-px w-full bg-background-rich/25" />
            <div className="mt-3 h-px w-2/3 bg-background-rich/25" />
          </div>
        </div>
      ) : stage === 1 ? (
        <div className="absolute inset-0 flex items-center justify-center gap-3">
          {[0, 1, 2].map((position) => (
            <div
              key={position}
              className={cn(
                "flex h-28 w-20 flex-col items-center rounded-md border border-background-rich/20 bg-emphasis-dimmed p-3",
                position === 1 &&
                  "-translate-y-5 border-primary-rich/60 bg-linear-to-b from-primary-dimmed to-emphasis-dimmed",
              )}
            >
              <div className="flex size-10 items-center justify-center rounded border border-background-rich/35">
                <Icon className="size-5 text-background-rich/70" />
              </div>
              <div className="mt-auto h-px w-full bg-background-rich/45" />
              <div className="mt-2 h-px w-2/3 self-start bg-background-rich/20" />
            </div>
          ))}
        </div>
      ) : stage === 2 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-56 rounded-lg border border-background-rich/20 bg-emphasis-dimmed p-5 font-mono text-xs">
            <span className="text-background-rich/50">{"{"}</span>
            <div className="my-4 border-primary-rich/50 border-l pl-4">
              <span className="text-primary-rich">title</span>
              <span className="ml-3 text-background-rich/65">: "…"</span>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-info-rich">description</span>
                <Icon className="size-4 text-primary-rich" />
              </div>
            </div>
            <span className="text-background-rich/50">{"}"}</span>
          </div>
        </div>
      ) : stage === 3 ? (
        <div className="absolute inset-0 flex items-center justify-center gap-6">
          <ProviderLogo
            provider="woocommerce"
            decorative
            className="h-9 max-w-28 object-contain"
          />
          <span className="h-2 w-2 rounded-full bg-primary-rich" />
          <div className="flex size-20 items-center justify-center rounded-xl border border-primary-rich/50 bg-linear-to-br from-primary-dimmed to-emphasis-dimmed">
            <Icon className="size-9 text-background-rich" />
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center gap-5">
          <div className="relative size-28 rounded-full border border-primary-rich/25 p-3">
            <div className="flex size-full items-center justify-center rounded-full border border-primary-rich/40">
              <Icon className="size-9 text-primary-rich" />
            </div>
            <span className="absolute top-1 right-4 size-2 rounded-full bg-primary-rich" />
          </div>
          <div className="grid w-20 gap-4">
            {[0, 1, 2].map((value) => (
              <div key={value} className="flex items-center gap-3">
                <span className="size-1.5 rounded-full bg-primary-rich/60" />
                <span className="h-px flex-1 bg-background-rich/35" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
