"use client";

import { CommercePlug_3SparkleIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { ProviderLogo } from "@/components/marketing/provider-logo";

export const CapabilityIllustration = ({
  kind,
}: CapabilityIllustration.Props) => {
  const tall = kind === "simulations";

  if (kind === "readiness" || kind === "checkout" || kind === "developers")
    return (
      <div
        data-capability-illustration={kind}
        className="relative mt-8 flex justify-center bg-emphasis-dimmed"
      >
        <CommerceFigure
          kind={
            kind === "readiness"
              ? "readinessScanner"
              : kind === "checkout"
                ? "checkout"
                : "document"
          }
          surface="dark"
          className="w-full max-w-64"
        />
      </div>
    );

  return (
    <div
      data-capability-illustration={kind}
      className={cn(
        "relative isolate mt-8 overflow-hidden",
        tall ? "min-h-[460px] shrink-0" : "h-48",
      )}
    >
      {(tall || kind === "catalog") && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-primary/4 to-primary/10"
        />
      )}
      {tall ? (
        <div className="relative flex min-h-96 flex-1 flex-col items-center justify-center gap-10 px-8 py-12 max-sm:min-h-80">
          <div className="flex w-full max-w-64 items-center justify-between gap-8">
            {(["chatgpt", "claude", "gemini"] as const).map((provider) =>
              provider === "chatgpt" ? (
                <Image
                  key={provider}
                  src="/images/chatgpt.svg"
                  width={40}
                  height={40}
                  alt="ChatGPT"
                  className="size-10 brightness-0 invert"
                  unoptimized
                />
              ) : (
                <ProviderLogo
                  key={provider}
                  provider={provider}
                  className="h-10 w-10 rounded-none object-center"
                />
              ),
            )}
          </div>
          <div
            aria-hidden
            className="relative h-14 w-full max-w-64 rounded-b-[50%] border-primary-rich/30 border-x border-b before:absolute before:top-full before:left-1/2 before:h-10 before:w-px before:bg-primary-rich/45"
          />
          <Image
            src="/images/logo.svg"
            width={1225}
            height={1107}
            alt="ecentic"
            className="relative mt-3 h-auto w-full max-w-52 object-contain max-sm:max-w-40"
          />
        </div>
      ) : (
        <div aria-hidden className="absolute inset-0 px-7">
          {kind === "catalog" && (
            <div className="mx-auto mt-2 max-w-96 overflow-hidden rounded-lg border border-background-rich/15 bg-linear-to-br from-emphasis-rich/80 to-emphasis-dimmed px-5 py-4 font-mono text-xs leading-7">
              <p className="text-background-rich/40">{"{"}</p>
              <p className="flex gap-4">
                <span className="text-primary-rich">"title"</span>
                <span className="mt-3 h-px flex-1 bg-background-rich/30" />
              </p>
              <p className="flex gap-4">
                <span className="text-primary-rich">"description"</span>
                <span className="mt-3 h-px flex-1 bg-background-rich/30" />
              </p>
              <p className="text-background-rich/40">{"}"}</p>
            </div>
          )}
          {kind === "merchant-center" && (
            <div className="relative flex h-full items-center justify-center gap-7 pb-8">
              <ProviderLogo
                provider="shopify"
                className="h-10 w-10 rounded-none object-center"
              />
              <div className="relative flex h-px w-20 items-center justify-center bg-linear-to-r from-background-rich/15 via-primary-rich/60 to-background-rich/15">
                <CommercePlug_3SparkleIcon className="size-8 bg-emphasis-dimmed text-primary-rich" />
              </div>
              <ProviderLogo
                provider="googleMerchant"
                className="h-11 w-11 rounded-none object-center"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export namespace CapabilityIllustration {
  export type Props = {
    kind:
      | "simulations"
      | "readiness"
      | "catalog"
      | "merchant-center"
      | "checkout"
      | "developers";
    tags: readonly string[];
  };
}
