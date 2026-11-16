"use client";

import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceChartActivity_2Icon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useTranslations } from "next-intl";
import { PlatformProviderStack } from "./provider-stack";

export const platformStageIcons = {
  connect: CommercePlug_3SparkleIcon,
  simulate: CommerceChartActivity_2Icon,
  fix: CommerceFilePenIcon,
  sell: CommerceBasketShoppingIcon,
  track: CommerceCode_3Icon,
} as const;

const Record = ({ active = false }: { active?: boolean }) => (
  <div
    className={cn(
      "relative flex h-36 w-24 flex-col gap-4 rounded-lg border p-4",
      active
        ? "border-primary-rich/60 bg-linear-to-br from-primary-dimmed to-emphasis-dimmed shadow-lg shadow-primary/20"
        : "border-background-rich/20 bg-linear-to-br from-emphasis-rich to-emphasis-dimmed",
    )}
  >
    <CommerceBasketShoppingIcon
      className={cn(
        "size-8",
        active ? "text-primary-rich" : "text-background-rich/60",
      )}
    />
    <span className="mt-auto h-px w-full bg-background-rich/40" />
    <span className="h-px w-2/3 bg-primary-rich/60" />
  </div>
);

/** The diagrams show relationships, never fabricated scan results or measurements. */
export const PlatformStageArtwork = ({ kind }: { kind: string }) => {
  const translate = useTranslations("enterprisePlatform.artworkStages");
  return (
    <div
      aria-hidden
      data-stage-artwork={kind}
      className="relative isolate flex min-h-80 flex-col items-center justify-center overflow-hidden px-7 py-10 max-sm:px-5"
    >
      {kind === "connect" && (
        <>
          <PlatformProviderStack
            providers={["shopify", "woocommerce", "googleMerchant"]}
          />
          <div className="h-8 w-px bg-primary-rich/45" />
          <div className="relative w-full max-w-72 rounded-lg border border-primary-rich/40 bg-linear-to-br from-primary-dimmed to-emphasis-dimmed p-5 shadow-lg shadow-primary/20">
            <div className="flex items-center gap-3 border-background-rich/15 border-b pb-4 font-mono text-primary-rich text-xs">
              <CommerceCode_3Icon className="size-5" />
              product.json
            </div>
            <div className="mt-5 grid gap-4 font-mono text-xs">
              {["title", "description", "source"].map((field, index) => (
                <div key={field} className="flex items-center gap-5">
                  <span
                    className={
                      index === 1 ? "text-info-foreground" : "text-primary-rich"
                    }
                  >
                    {field}
                  </span>
                  <span className="h-px flex-1 bg-background-rich/25" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {kind === "simulate" && (
        <>
          <PlatformProviderStack providers={["chatgpt", "claude", "gemini"]} />
          <div className="relative mt-8 flex items-center -space-x-3">
            <div className="translate-y-4 -rotate-9">
              <Record />
            </div>
            <div className="z-1">
              <Record active />
            </div>
            <div className="translate-y-4 rotate-9">
              <Record />
            </div>
          </div>
        </>
      )}
      {kind === "fix" && (
        <div className="w-full max-w-80">
          <div className="relative ml-8 rounded-lg border border-background-rich/15 bg-emphasis-rich/50 p-5 font-mono text-background-rich/60 text-sm">
            <span className="text-primary-rich">title</span>
            <div className="mt-3 h-px w-4/5 bg-background-rich/30" />
            <div className="mt-3 h-px w-1/2 bg-background-rich/20" />
          </div>
          <div className="relative z-1 -mt-5 mr-6 rounded-lg border border-primary-rich/40 bg-linear-to-br from-primary-dimmed to-emphasis-dimmed p-5 shadow-lg shadow-primary/20">
            <CommerceFilePenIcon className="mb-4 size-8 text-primary-rich" />
            <div className="space-y-4 font-mono text-xs">
              {["title", "description"].map((field) => (
                <div key={field} className="flex items-center gap-3">
                  <span className="text-info-foreground">{field}</span>
                  <span className="h-px flex-1 bg-primary-rich/35" />
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto h-6 w-px bg-primary-rich/40" />
          <PlatformProviderStack providers={["shopify", "woocommerce"]} />
        </div>
      )}
      {kind === "sell" && (
        <>
          <div className="flex items-center gap-5">
            <CommerceBasketShoppingIcon className="size-12 text-primary-rich" />
            <span className="h-px w-10 bg-primary-rich/40" />
            <div className="grid size-24 place-items-center rounded-lg border border-primary-rich/40 bg-linear-to-br from-primary-dimmed to-emphasis-dimmed shadow-lg shadow-primary/20">
              <CommerceFileShieldIcon className="size-12 text-info-foreground" />
            </div>
          </div>
          <div className="mt-7 flex w-full max-w-72 items-center justify-between border-background-rich/15 border-y py-4 font-mono text-primary-rich text-xs">
            <span>{translate("product")}</span>
            <ArrowRightIcon className="size-4" />
            <span>{translate("cart")}</span>
            <ArrowRightIcon className="size-4" />
            <span>{translate("checkout")}</span>
          </div>
          <div className="mt-7">
            <PlatformProviderStack providers={["woocommerce"]} />
          </div>
        </>
      )}
      {kind === "track" && (
        <>
          <PlatformProviderStack
            providers={["chatgpt", "perplexity", "gemini"]}
          />
          <div className="h-8 w-px bg-primary-rich/40" />
          <div className="w-full max-w-80 overflow-hidden rounded-lg border border-primary-rich/35 bg-linear-to-br from-primary-dimmed/70 to-emphasis-dimmed font-mono text-xs">
            {["chatgpt.com", "perplexity.ai", "gemini.google.com"].map(
              (source, index) => (
                <div
                  key={source}
                  className="flex items-center gap-3 border-background-rich/10 border-b px-4 py-4 last:border-b-0"
                >
                  <span className="size-1.5 rounded-full bg-primary-rich" />
                  <span
                    className={
                      index === 1
                        ? "text-info-foreground"
                        : "text-background-rich/80"
                    }
                  >
                    {source}
                  </span>
                  <ArrowRightIcon className="ml-auto size-4 text-primary-rich" />
                </div>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
};
