import type { AppConfig } from "next-intl";
import {
  MarketingActions,
  MarketingBand,
  MarketingEyebrow,
} from "@/components/marketing/primitives";
import { OverviewArtwork } from "./overview-artwork";

export const Overview = ({ copy }: Overview.Props) => (
  <MarketingBand className="enterprise-blue enterprise-journey mx-3 -mt-[68px] mb-3 min-h-dvh overflow-hidden rounded-xl border-0 bg-linear-to-r from-primary-text via-primary-text to-primary text-background-rich [--rail-color:color-mix(in_oklab,var(--color-background-rich)_22%,transparent)] [--rail-cross:transparent] max-sm:mx-2 max-sm:-mt-[72px] max-sm:mb-2 max-sm:rounded-lg [&>.marketing-rail]:flex [&>.marketing-rail]:min-h-dvh [&>.marketing-rail]:items-center [&>.marketing-rail]:border-x-background-rich/15 [&>.marketing-rail]:border-y-0 [&_.marketing-eyebrow]:text-background-rich">
    <OverviewArtwork />
    <div className="marketing-cell relative z-1 w-full min-w-0 px-7 pt-36 pb-24 max-sm:px-4 max-sm:pt-32 max-sm:pb-16">
      <div className="enterprise-copy relative max-w-[920px]">
        <MarketingEyebrow>{copy.eyebrow}</MarketingEyebrow>
        <h1 className="max-w-[920px] text-[clamp(3rem,5.2vw,4.8rem)] text-background-rich leading-[1.025] tracking-[-0.043em] max-sm:text-[43px] max-sm:tracking-[-0.036em]">
          {copy.title}
        </h1>
        <p className="mt-8 max-w-[720px] text-background-rich/90 text-lg leading-relaxed max-sm:mt-6 max-sm:text-base">
          {copy.description}
        </p>
        <MarketingActions actions={copy.actions} tone="inverse" />
        {copy.facts.map((fact) => (
          <p
            key={fact}
            className="mt-6 max-w-[70ch] text-background-rich/80 text-sm max-sm:max-w-[32ch]"
          >
            {fact}
          </p>
        ))}
      </div>
    </div>
  </MarketingBand>
);

export namespace Overview {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["hero"];
  };
}
