import type { AppConfig } from "next-intl";
import { MarketingHero } from "@/components/marketing/primitives";
import { OverviewArtwork } from "./overview-artwork";

export const Overview = ({ copy }: Overview.Props) => (
  <MarketingHero
    dark
    illustration={<OverviewArtwork />}
    eyebrow={copy.eyebrow}
    title={copy.title}
    description={copy.description}
    actions={copy.actions}
  >
    {copy.facts.map((fact) => (
      <p
        key={fact}
        className="mt-6 max-w-[70ch] text-background-rich/90 text-sm max-sm:max-w-[32ch]"
      >
        {fact}
      </p>
    ))}
  </MarketingHero>
);

export namespace Overview {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["hero"];
  };
}
