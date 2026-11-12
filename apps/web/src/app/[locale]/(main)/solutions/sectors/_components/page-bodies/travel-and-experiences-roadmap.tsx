"use client";

import {
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
} from "@zenncore/icons";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { useMediaQuery } from "@zenncore/web/hooks";
import type { AppConfig } from "next-intl";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";

const stages = [
  { icon: CommerceGlobePointerIcon, figure: "suitcase" },
  { icon: CommerceFilePenIcon, figure: "documentStack" },
  { icon: CommerceFileShieldIcon, figure: "relay" },
] as const;

export const TravelAndExperiencesRoadmap = ({
  copy,
}: TravelAndExperiencesRoadmap.Props) => {
  const desktop = useMediaQuery("(min-width: 1024px)", {});
  return (
    <Tabs
      defaultValue={copy.stages[0]?.id}
      orientation={desktop ? "vertical" : "horizontal"}
      data-travel-workbench
      className="relative grid min-w-0 border-background-rich/20 border-y lg:grid-cols-[minmax(240px,1fr)_3fr]"
    >
      <MarketingEdgeCrosses />
      <MarketingEdgeCrosses edge="bottom" />
      <div className="min-w-0 border-background-rich/20 border-b lg:border-r lg:border-b-0">
        <TabsList
          aria-label={copy.label}
          className="grid w-full grid-cols-3 rounded-none border-0 p-0 lg:grid-cols-1"
        >
          {copy.stages.map((stage, index) => {
            const Icon = stages[index]?.icon ?? CommerceGlobePointerIcon;
            return (
              <Tab
                key={stage.id}
                value={stage.id}
                className="group relative h-auto min-h-24 flex-col items-start justify-center gap-3 rounded-none border-background-rich/20 border-r bg-transparent px-4 py-6 text-left text-background-rich/75 before:hidden hover:bg-background-rich/10 hover:text-background-rich focus-visible:outline-2 focus-visible:outline-background-rich! focus-visible:-outline-offset-2 data-[active]:bg-background-rich/10 data-selected:bg-background-rich/10 data-[active]:text-background-rich data-selected:text-background-rich max-sm:px-3 lg:flex-row lg:items-center lg:justify-start lg:gap-4 lg:border-r-0 lg:border-b lg:px-8 lg:last:border-b-0"
              >
                <Icon
                  aria-hidden
                  className="size-6 shrink-0 text-background-rich"
                />
                <span className="whitespace-normal font-heading text-base leading-snug lg:text-lg">
                  {stage.label}
                </span>
                <span
                  aria-hidden
                  className="absolute inset-y-6 left-0 w-px bg-background-rich opacity-0 group-data-[active]:opacity-100"
                />
              </Tab>
            );
          })}
        </TabsList>
      </div>
      {copy.stages.map((stage, index) => (
        <TabsPanel
          key={stage.id}
          value={stage.id}
          className="min-w-0 data-ending-style:hidden"
        >
          <div className="grid min-w-0 border-background-rich/20 border-b md:grid-cols-2">
            <div className="flex min-w-0 flex-col justify-center px-4 py-8 sm:px-8">
              <p className="text-background-rich/75 text-sm">{stage.status}</p>
              <h3 className="mt-4 max-w-[24ch] font-heading text-3xl! text-background-rich">
                {stage.title}
              </h3>
              <p className="mt-5 max-w-[48ch] text-background-rich/85 leading-relaxed">
                {stage.description}
              </p>
            </div>
            <div className="min-w-0 self-center px-4 py-4">
              <CommerceFigure
                kind={stages[index]?.figure ?? "suitcase"}
                surface="dark"
                className="mx-auto aspect-[4/3] max-w-[400px] bg-transparent"
              />
            </div>
          </div>
          <dl className="px-4 sm:px-8">
            {stage.steps.map((step) => (
              <div
                key={step.title}
                className="grid gap-3 border-background-rich/20 border-b py-5 last:border-b-0 sm:grid-cols-[1fr_2fr] sm:gap-8"
              >
                <dt className="font-medium text-background-rich text-sm">
                  {step.title}
                </dt>
                <dd className="text-background-rich/85 text-sm leading-relaxed">
                  {step.body}
                </dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-3 border-background-rich/20 border-t px-4 py-6 sm:grid-cols-[1fr_2fr] sm:gap-8 sm:px-8">
            <p className="font-medium text-background-rich text-sm">
              {copy.boundary}
            </p>
            <p className="text-background-rich/75 text-sm leading-relaxed">
              {stage.note}
            </p>
          </div>
        </TabsPanel>
      ))}
    </Tabs>
  );
};

export namespace TravelAndExperiencesRoadmap {
  export type Props = { copy: AppConfig["Messages"]["travelPage"]["roadmap"] };
}
