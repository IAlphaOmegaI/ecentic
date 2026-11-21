import { ArrowRightIcon } from "@zenncore/icons";
import type { AppConfig } from "next-intl";
import type { PropsWithChildren } from "react";
import { MarketingActionButton } from "@/components/marketing/action-button";
import { MarketingBand } from "@/components/marketing/primitives";

export const Overview = ({ copy, children }: Overview.Props) => (
  <MarketingBand
    data-nav-tone="dark"
    data-home-hero
    className="marketing-dark enterprise-blue enterprise-journey mx-2 -mt-18 mb-2 rounded-lg border-0 bg-linear-to-br from-primary-dimmed via-primary-text to-primary text-background-rich sm:mx-3 sm:-mt-17 sm:mb-3 [&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:border-x-0 [&>.marketing-rail]:before:hidden [&>.marketing-rail]:after:hidden"
  >
    <div className="relative w-full">{children}</div>
    <div className="relative z-2 flex flex-col items-center border-background-rich/15 border-x px-4 pt-8 pb-12 text-center sm:px-8 sm:pt-10 sm:pb-16">
      <p className="font-medium text-background-rich/85 text-sm">
        {copy.eyebrow}
      </p>
      <h1 className="mt-4 max-w-4xl whitespace-pre-line text-balance font-medium text-4xl text-background-rich leading-none tracking-tight sm:text-6xl lg:text-7xl">
        {copy.title}
      </h1>
      <p className="mt-4 max-w-2xl text-pretty text-background-rich/85 text-base leading-relaxed sm:text-lg">
        {copy.description}
      </p>
      <div className="marketing-actions mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-4">
        {copy.actions.map((action, index) => (
          <MarketingActionButton
            key={action.href}
            color={index === 0 ? "primary" : "neutral"}
            variant={index === 0 ? "default" : "soft"}
            tone={index === 0 ? "default" : "inverse"}
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
  </MarketingBand>
);

export namespace Overview {
  export type Props = PropsWithChildren<{
    copy: AppConfig["Messages"]["enterpriseHome"]["hero"];
  }>;
}
