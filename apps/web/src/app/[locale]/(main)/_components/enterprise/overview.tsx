import { ArrowRightIcon } from "@zenncore/icons";
import type { AppConfig } from "next-intl";
import { MarketingActionButton } from "@/components/marketing/action-button";
import { MarketingBand } from "@/components/marketing/primitives";
import { CommerceHeroScene } from "./commerce-hero-scene";

export const Overview = ({ copy }: Overview.Props) => (
  <MarketingBand
    data-nav-tone="light"
    data-home-hero
    className="enterprise-spotlight -mt-18 overflow-hidden border-0 bg-background text-foreground-rich sm:-mt-17 [&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:before:hidden [&>.marketing-rail]:after:hidden"
  >
    <div className="relative z-2 flex flex-col items-center px-4 pt-28 text-center sm:px-8 sm:pt-24">
      <p className="font-medium text-primary-text text-sm">{copy.eyebrow}</p>
      <h1 className="mt-4 max-w-4xl whitespace-pre-line text-balance font-medium text-4xl text-foreground-rich leading-none tracking-tight sm:text-6xl lg:text-7xl">
        {copy.spotlight.title}
      </h1>
      <p className="mt-4 max-w-2xl text-pretty text-base text-foreground leading-relaxed sm:text-lg">
        {copy.spotlight.description}
      </p>
      <div className="marketing-actions mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-4">
        {copy.actions.map((action, index) => (
          <MarketingActionButton
            key={action.href}
            color={index === 0 ? "primary" : "neutral"}
            variant={index === 0 ? "default" : "soft"}
            href={action.href}
            label={action.label}
            labelClassName="max-w-52 whitespace-normal sm:max-w-none"
            dashboardForMembers={action.href === "/demo"}
          >
            <ArrowRightIcon aria-hidden className="size-4 shrink-0" />
          </MarketingActionButton>
        ))}
      </div>
    </div>
    <CommerceHeroScene label={copy.spotlight.label} />
  </MarketingBand>
);

export namespace Overview {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["hero"];
  };
}
