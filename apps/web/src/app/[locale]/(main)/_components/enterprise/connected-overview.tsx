import { ArrowRightIcon } from "@zenncore/icons";
import type { AppConfig } from "next-intl";
import { MarketingActionButton } from "@/components/marketing/action-button";
import { MarketingBand } from "@/components/marketing/primitives";
import { OverviewArtwork } from "./overview-artwork";

export const ConnectedOverview = ({ copy }: ConnectedOverview.Props) => (
  <MarketingBand
    data-nav-tone="dark"
    data-home-hero
    className="marketing-dark enterprise-blue enterprise-journey mx-2 -mt-18 mb-2 overflow-hidden rounded-lg border-0 bg-linear-to-br from-primary-dimmed via-primary-text to-primary text-background-rich sm:mx-3 sm:-mt-17 sm:mb-3 [&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:border-x-background-rich/15 [&>.marketing-rail]:before:hidden [&>.marketing-rail]:after:hidden"
  >
    <div className="relative flex flex-col items-center justify-center px-4 pt-24 pb-12 text-center sm:min-h-dvh sm:px-8 sm:pt-28 sm:pb-16">
      <OverviewArtwork {...copy.artwork} />
      <p className="mt-4 font-medium text-background-rich text-sm sm:mt-6">
        {copy.eyebrow}
      </p>
      <h1 className="mt-4 max-w-4xl text-balance font-medium text-3xl text-background-rich leading-none tracking-tight sm:text-5xl lg:text-6xl">
        {copy.title}
      </h1>
      <p className="mt-4 max-w-2xl text-pretty text-background-rich text-sm leading-relaxed sm:text-lg">
        {copy.description}
      </p>
      <div className="marketing-actions mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
        {copy.actions.map((action, index) => (
          <MarketingActionButton
            key={action.href}
            color={index === 0 ? "primary" : "neutral"}
            href={action.href}
            label={action.label}
            labelClassName="max-w-52 whitespace-normal sm:max-w-none"
            dashboardForMembers={action.href === "/demo"}
            className={
              index === 0
                ? undefined
                : "border-background-rich from-background-rich to-background-rich text-primary-text hover:from-background hover:to-background focus-visible:ring-background-rich/60"
            }
          >
            <ArrowRightIcon className="size-4" />
          </MarketingActionButton>
        ))}
      </div>
    </div>
  </MarketingBand>
);

export namespace ConnectedOverview {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["hero"];
  };
}
