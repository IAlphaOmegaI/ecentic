"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  CommerceBasketShoppingIcon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceGlobePointerIcon,
  CreditCardIcon,
  RadarIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { providerLogos } from "@/content/provider-logos";

const assistants = ["chatgpt", "claude", "gemini"] as const;

const Connect = () => (
  <div className="grid h-full grid-cols-[1fr_64px_1fr] items-center max-sm:grid-cols-[1fr_40px_1fr]">
    <div className="grid gap-4">
      {(["shopify", "woocommerce", "productFeeds"] as const).map((provider) => (
        <div
          key={provider}
          className="relative flex h-14 items-center justify-center rounded-md border border-accent-foreground bg-background-rich px-4 after:absolute after:top-1/2 after:-right-8 after:h-px after:w-8 after:bg-primary/35 max-sm:after:-right-5 max-sm:after:w-5"
        >
          <ProviderLogo
            provider={provider}
            decorative
            className="h-8 max-w-24 rounded-none object-center font-mono text-primary-text text-sm"
          />
        </div>
      ))}
    </div>
    <div className="relative h-36 justify-self-center border-primary/35 border-l before:absolute before:top-1/2 before:left-0 before:h-px before:w-8 before:bg-primary/35 max-sm:before:w-5">
      <ArrowRightIcon className="absolute top-1/2 left-6 size-4 -translate-y-1/2 text-primary max-sm:left-3" />
    </div>
    <div className="h-52 text-primary-text">
      <EvolvingAscii artwork="bag" />
    </div>
  </div>
);

const Simulate = () => (
  <div className="grid h-full grid-cols-[1fr_64px_1fr] items-center max-sm:grid-cols-[1fr_40px_1fr]">
    <div className="relative h-48">
      <div className="absolute top-0 left-0 h-36 w-4/5 rounded-md border border-accent-foreground bg-background text-foreground-dimmed/50">
        <EvolvingAscii artwork="bag" />
      </div>
      <div className="absolute right-0 bottom-0 h-36 w-4/5 rounded-md border border-primary/25 bg-background-rich text-primary-text">
        <EvolvingAscii artwork="bag" />
      </div>
    </div>
    <div className="relative h-36 justify-self-center border-primary/35 border-l before:absolute before:top-1/2 before:right-0 before:h-px before:w-8 before:bg-primary/35 max-sm:before:w-5" />
    <div className="grid gap-4">
      {assistants.map((provider) => (
        <div
          key={provider}
          className="relative flex h-14 items-center gap-4 rounded-md border border-accent-foreground bg-background-rich px-4 before:absolute before:top-1/2 before:-left-8 before:h-px before:w-8 before:bg-primary/35 max-sm:justify-center max-sm:gap-2 max-sm:px-2 max-sm:before:-left-5 max-sm:before:w-5"
        >
          <ProviderLogo provider={provider} decorative className="size-6" />
          <span className="text-foreground text-sm max-sm:text-xs">
            {providerLogos[provider].name}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const Fix = () => (
  <div className="grid h-full grid-cols-[1fr_48px_1fr] items-center max-sm:grid-cols-[1fr_32px_1fr]">
    <div className="relative flex h-44 flex-col gap-4 rounded-md border border-accent-foreground bg-background p-6 max-sm:p-4">
      <CommerceBasketShoppingIcon className="mb-2 size-8 text-foreground-dimmed" />
      <div className="h-2 w-3/4 rounded-xs bg-accent-foreground" />
      <div className="h-2 w-full rounded-xs bg-accent-foreground" />
      <div className="h-2 w-1/2 rounded-xs border border-foreground-dimmed/40 border-dashed" />
    </div>
    <ArrowRightIcon className="size-4 justify-self-center text-primary" />
    <div className="relative flex h-52 flex-col gap-4 rounded-md border border-primary/30 bg-background-rich p-6 max-sm:p-4">
      <CommerceFilePenIcon className="mb-2 size-8 text-primary" />
      {["w-3/4", "w-full", "w-4/5"].map((width) => (
        <div key={width} className="flex items-center gap-2">
          <div className={cn("h-2 rounded-xs bg-primary/35", width)} />
          <CheckIcon className="size-4 shrink-0 text-primary" />
        </div>
      ))}
      <CommerceCode_3Icon className="absolute -right-4 -bottom-4 size-12 rounded-md border border-primary/25 bg-background-rich p-2 text-primary max-sm:-right-2" />
    </div>
  </div>
);

const Sell = () => (
  <div className="relative flex h-full items-center justify-center">
    <div className="absolute inset-x-12 top-12 h-24 rounded-t-[48px] border border-primary/25 border-b-0 max-sm:inset-x-6" />
    <div className="absolute left-0 flex size-20 items-center justify-center rounded-md border border-accent-foreground bg-background-rich p-4 max-sm:size-16 max-sm:p-2">
      <ProviderLogo
        provider="woocommerce"
        decorative
        className="h-auto w-full rounded-none"
      />
    </div>
    <div className="h-52 w-3/5 text-primary-text">
      <EvolvingAscii artwork="cart" />
    </div>
    <div className="absolute right-0 flex size-20 items-center justify-center rounded-md border border-primary/25 bg-background-rich max-sm:size-16">
      <CreditCardIcon className="size-8 text-primary" />
    </div>
    <ArrowRightIcon className="absolute top-10 left-1/2 size-4 -translate-x-1/2 bg-background-rich text-primary" />
  </div>
);

const Track = () => (
  <div className="relative flex h-full items-center justify-center">
    <div className="absolute inset-x-12 inset-y-8 rounded-[64px] border border-primary/25 max-sm:inset-x-6" />
    <div className="relative grid size-36 place-items-center rounded-full border border-primary/20 bg-background-rich shadow-[0_0_0_20px_var(--color-background-rich),0_0_0_21px_color-mix(in_oklab,var(--color-primary)_10%,transparent)] max-sm:size-28">
      <RadarIcon className="size-16 text-primary" />
    </div>
    <div className="absolute top-4 left-8 flex size-12 items-center justify-center rounded-md border border-accent-foreground bg-background-rich max-sm:left-2">
      <ProviderLogo provider="shopify" decorative className="size-6" />
    </div>
    <div className="absolute right-8 bottom-4 flex size-12 items-center justify-center rounded-md border border-accent-foreground bg-background-rich max-sm:right-2">
      <CommerceGlobePointerIcon className="size-6 text-primary" />
    </div>
    <ArrowRightIcon className="absolute top-6 left-1/2 size-4 bg-background-rich text-primary" />
    <ArrowRightIcon className="absolute bottom-6 left-1/2 size-4 rotate-180 bg-background-rich text-primary" />
  </div>
);

export const JourneyArtwork = ({ stage }: JourneyArtwork.Props) => (
  <div
    aria-hidden="true"
    data-journey-artwork={stage}
    className="h-[296px] w-full overflow-hidden px-10 py-8 max-sm:h-[256px] max-sm:px-6 max-sm:py-6"
  >
    {(() => {
      switch (stage) {
        case "connect":
          return <Connect />;
        case "simulate":
          return <Simulate />;
        case "fix":
          return <Fix />;
        case "sell":
          return <Sell />;
        case "track":
          return <Track />;
        default:
          return null;
      }
    })()}
  </div>
);

export namespace JourneyArtwork {
  export type Props = {
    stage: string;
  };
}
