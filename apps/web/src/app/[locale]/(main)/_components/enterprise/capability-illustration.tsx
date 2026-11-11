"use client";

import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Motion } from "@/components/motion";

const cardPositions = [
  { left: "11%", top: "39%", rotation: -9 },
  { left: "38%", top: "22%", rotation: 0 },
  { left: "65%", top: "39%", rotation: 9 },
] as const;

export const CapabilityIllustration = ({
  kind,
  tags,
}: CapabilityIllustration.Props) => {
  const { ready, reduced } = useInteractive();
  const enhanced = ready && !reduced;
  const tall = kind === "simulations";

  return (
    <div
      data-capability-illustration={kind}
      className={cn(
        "relative isolate mt-8 overflow-hidden",
        tall ? "min-h-80 flex-1 sm:min-h-96" : "h-48",
      )}
    >
      {(tall || kind === "catalog" || kind === "checkout") && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-primary/4 to-primary/10"
        />
      )}
      {tall ? (
        <>
          <div className="relative z-1 flex justify-center gap-8 pt-5">
            {(["chatgpt", "claude", "gemini"] as const).map((provider) =>
              provider === "chatgpt" ? (
                <Image
                  key={provider}
                  src="/images/chatgpt.svg"
                  width={36}
                  height={36}
                  alt="ChatGPT"
                  className="size-9 brightness-0 invert"
                  unoptimized
                />
              ) : (
                <ProviderLogo
                  key={provider}
                  provider={provider}
                  className="h-9 w-9 rounded-none object-center"
                />
              ),
            )}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[18%] top-0 bottom-12 bg-linear-to-b from-primary-rich/10 via-primary/15 to-transparent [clip-path:polygon(34%_0,66%_0,100%_100%,0_100%)]"
          />
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-12 bottom-16 h-24 rounded-[50%] border border-background-rich/10 [transform:rotate(-8deg)]" />
            <div className="absolute inset-x-20 bottom-20 h-14 rounded-[50%] border border-primary-rich/20 [transform:rotate(-8deg)]" />
            {cardPositions.map((position, index) => (
              <Motion.Item
                key={position.left}
                initial={false}
                whileInView={
                  enhanced && index === 1
                    ? {
                        transform: [
                          "translateY(15px) rotate(0deg)",
                          "translateY(0px) rotate(0deg)",
                        ],
                      }
                    : { transform: `rotate(${position.rotation}deg)` }
                }
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                style={{
                  left: position.left,
                  top: position.top,
                  transform: `rotate(${position.rotation}deg)`,
                }}
                className={cn(
                  "absolute h-36 w-[24%] max-w-36 rounded-lg border p-4 sm:h-40",
                  index === 1
                    ? "z-1 border-primary-rich/70 bg-linear-to-br from-primary-dimmed via-emphasis to-emphasis-dimmed shadow-[0_0_48px_-18px_var(--color-primary)]"
                    : "border-background-rich/15 bg-linear-to-br from-emphasis-rich to-emphasis-dimmed",
                )}
              >
                <div className="flex h-full flex-col justify-between">
                  <div className="relative grid h-20 place-items-center rounded-md bg-background-rich/4">
                    <CommerceBasketShoppingIcon
                      className={cn(
                        "size-10",
                        index === 1
                          ? "text-primary-rich"
                          : "text-background-rich/45",
                      )}
                    />
                  </div>
                  <div className="space-y-2 pb-1">
                    <div className="h-px w-4/5 bg-background-rich/35" />
                    <div className="h-px w-3/5 bg-background-rich/20" />
                    <div className="h-px w-2/5 bg-primary-rich/50" />
                  </div>
                </div>
              </Motion.Item>
            ))}
          </div>
          <Motion.Item
            aria-hidden
            data-falling-light
            initial={false}
            style={{ opacity: 0 }}
            whileInView={
              enhanced
                ? {
                    transform: [
                      "translateY(-110%)",
                      "translateY(40%)",
                      "translateY(360%)",
                    ],
                    opacity: [0, 0.75, 0],
                  }
                : { opacity: 0 }
            }
            viewport={{ once: true, amount: 0.5 }}
            transition={{
              duration: 2.2,
              times: [0, 0.3, 1],
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute top-0 left-1/2 z-2 h-28 w-44 -translate-x-1/2 bg-linear-to-b from-transparent to-primary-rich/30 [mask-image:linear-gradient(90deg,transparent,black,transparent)] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-primary-rich"
          />
        </>
      ) : (
        <div aria-hidden className="absolute inset-0 px-7">
          {kind === "readiness" && (
            <div className="relative mx-auto flex h-full max-w-96 items-center justify-between gap-5 pb-5">
              <span className="absolute inset-x-4 top-[43%] h-px bg-linear-to-r from-transparent via-primary-rich/55 to-transparent" />
              {tags.map((tag, index) => (
                <div
                  key={tag}
                  className="relative flex min-w-0 flex-1 flex-col items-center gap-4"
                >
                  <span className="grid size-12 place-items-center bg-emphasis-dimmed text-primary-rich">
                    {index === 0 ? (
                      <CommerceFileShieldIcon className="size-9" />
                    ) : index === 1 ? (
                      <CommerceCode_3Icon className="size-9" />
                    ) : (
                      <CommerceFilePenIcon className="size-9" />
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
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
          {kind === "checkout" && (
            <div className="relative flex h-full items-center justify-center gap-5 pb-8">
              <CommerceBasketShoppingIcon className="size-12 text-background-rich/70" />
              <span className="h-px w-10 bg-primary-rich/40" />
              <div className="grid size-16 place-items-center border border-primary-rich/40 bg-linear-to-br from-primary-dimmed/70 to-emphasis-dimmed text-primary-rich [clip-path:polygon(20%_0,100%_0,100%_80%,80%_100%,0_100%,0_20%)]">
                <ArrowRightIcon className="size-7" />
              </div>
            </div>
          )}
          {kind === "developers" && (
            <div className="relative mx-auto mt-5 grid max-w-72 grid-cols-3 divide-x divide-background-rich/10 border-background-rich/10 border-y py-5 font-mono text-primary-rich text-sm">
              <span className="text-center">{"{ }"}</span>
              <span className="text-center">{"< >"}</span>
              <span className="text-center">{"$_"}</span>
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
