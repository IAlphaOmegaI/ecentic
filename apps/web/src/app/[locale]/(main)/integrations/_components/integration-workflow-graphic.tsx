"use client";

import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Motion } from "@/components/motion";

export const IntegrationWorkflowGraphic = ({
  kind,
  integration,
  large = false,
}: {
  kind:
    | "compare"
    | "publish"
    | "tracking"
    | "checkout"
    | "sync"
    | "audit"
    | "readiness"
    | "connect";
  integration: "shopify" | "woocommerce" | "googleMerchant" | "productFeeds";
  large?: boolean;
}) => {
  const { ready, reduced } = useInteractive();
  return (
    <div
      aria-hidden
      data-integration-graphic={kind}
      className={cn(
        "relative isolate mt-6 flex min-w-0 items-center justify-center overflow-hidden px-7",
        large ? "min-h-80 flex-1" : "h-44",
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-1 bg-radial-[at_50%_100%] from-primary/15 via-transparent to-transparent" />
      {kind === "compare" ? (
        <div className="relative h-80 w-full max-w-96">
          <div className="pointer-events-none absolute inset-x-10 top-6 h-20 rounded-[50%] border-primary-rich/25 border-t" />
          <div
            data-assistant-arc
            className="absolute inset-x-2 top-2 isolate grid grid-cols-3 items-start justify-items-center gap-3 sm:inset-x-7"
          >
            {(["chatgpt", "claude", "gemini"] as const).map(
              (provider, index) => (
                <Motion.Item
                  key={provider}
                  initial={false}
                  whileInView={ready && !reduced ? { y: [8, 0] } : { y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{
                    duration: 0.6,
                    delay: index * 0.06,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  style={{ rotate: `${(index - 1) * 8}deg` }}
                  className={cn(
                    "relative grid size-12 place-items-center rounded-xl border border-background-rich/40 bg-background-rich shadow-emphasis-dimmed/30 shadow-lg sm:size-14",
                    index !== 1 && "mt-5",
                  )}
                >
                  {provider === "chatgpt" ? (
                    <Image
                      src="/images/chatgpt.svg"
                      alt=""
                      width={32}
                      height={32}
                      className="size-8"
                      unoptimized
                    />
                  ) : (
                    <ProviderLogo
                      provider={provider}
                      decorative
                      className="size-8 rounded-none object-center"
                    />
                  )}
                </Motion.Item>
              ),
            )}
          </div>
          <div className="absolute inset-x-10 top-20 bottom-0 bg-linear-to-b from-primary/5 via-primary/20 to-transparent [clip-path:polygon(30%_0,70%_0,100%_100%,0_100%)]" />
          {[-1, 0, 1].map((position) => (
            <Motion.Item
              key={position}
              data-comparison-card
              initial={false}
              whileInView={
                ready && !reduced && position === 0 ? { y: [12, 0] } : { y: 0 }
              }
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.75, ease: [0.23, 1, 0.32, 1] }}
              style={{
                left: `${35 + position * 28}%`,
                top: position === 0 ? "42%" : "49%",
                rotate: `${position * 7}deg`,
              }}
              className={cn(
                "absolute flex h-36 w-[30%] flex-col justify-between rounded-lg border p-4",
                position === 0
                  ? "z-1 border-primary-rich/65 bg-linear-to-br from-primary-dimmed to-emphasis-dimmed shadow-[0_0_50px_-20px_var(--color-primary)]"
                  : "border-background-rich/20 bg-linear-to-br from-emphasis-rich to-emphasis-dimmed",
              )}
            >
              <CommerceBasketShoppingIcon
                className={cn(
                  "mx-auto size-10",
                  position === 0
                    ? "text-primary-rich"
                    : "text-background-rich/50",
                )}
              />
              <div className="space-y-2">
                <div className="h-px w-full bg-background-rich/35" />
                <div className="h-px w-3/4 bg-background-rich/20" />
                <div className="h-px w-1/2 bg-primary-rich/50" />
              </div>
            </Motion.Item>
          ))}
        </div>
      ) : kind === "publish" ? (
        <div className="w-full max-w-96 rounded-md border border-background-rich/15 bg-emphasis/70 px-5 py-4 font-mono text-sm leading-7">
          <span className="text-background-rich/45">{"{"}</span>
          <p>
            <span className="text-primary-rich">
              {integration === "woocommerce" ? '  "name"' : '  "title"'}
            </span>
            <span className="text-background-rich/60">{': "…",'}</span>
          </p>
          <p>
            <span className="text-warning">{'  "description"'}</span>
            <span className="text-background-rich/60">{': "…"'}</span>
          </p>
          <span className="text-background-rich/45">{"}"}</span>
        </div>
      ) : kind === "tracking" ? (
        <div className="flex h-24 w-full max-w-80 items-end gap-4 border-background-rich/15 border-b">
          {[28, 44, 37, 58, 48, 72, 62, 82, 67].map((height) => (
            <div
              key={height}
              style={{ height: `${height}%` }}
              className="flex-1 rounded-t-sm bg-linear-to-t from-primary/15 to-primary-rich/65"
            />
          ))}
        </div>
      ) : kind === "readiness" ? (
        <CommerceFigure
          kind="hub"
          surface="dark"
          className="aspect-auto h-44 w-full max-w-80"
        />
      ) : kind === "audit" ? (
        <div className="flex w-full max-w-80 items-center gap-8">
          <CommerceFileShieldIcon className="size-20 shrink-0 text-primary-rich" />
          <div className="flex-1 space-y-4">
            {["title", "description", "product_url"].map((field) => (
              <div
                key={field}
                className="flex items-center gap-3 border-background-rich/15 border-b pb-2"
              >
                <span className="size-1.5 rounded-full bg-primary-rich" />
                <code className="text-background-rich/65 text-xs">{field}</code>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex w-full max-w-96 items-center justify-between gap-5">
          <ProviderLogo
            provider={
              integration === "googleMerchant"
                ? "shopify"
                : integration === "productFeeds"
                  ? "woocommerce"
                  : integration
            }
            decorative
            className="h-12 max-w-28 shrink-0 max-sm:max-w-20"
          />
          <div className="relative h-px flex-1 bg-linear-to-r from-primary-rich/20 via-primary-rich/70 to-primary-rich/20">
            <ArrowRightIcon className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-primary-rich" />
          </div>
          {kind === "sync" ? (
            <ProviderLogo
              provider="googleMerchant"
              decorative
              className="h-12 max-w-28 shrink-0 max-sm:max-w-20"
            />
          ) : kind === "checkout" ? (
            <CommerceBasketShoppingIcon className="size-14 shrink-0 text-primary-rich" />
          ) : (
            <CommercePlug_3SparkleIcon className="size-14 shrink-0 text-primary-rich" />
          )}
        </div>
      )}
    </div>
  );
};
