"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";
import { Plus } from "@/components/plus";

export const TravelAndExperiencesRoadmap = ({
  copy,
}: TravelAndExperiencesRoadmap.Props) => (
  <Tabs defaultValue={copy.stages[0]?.id}>
    <TabsList
      aria-label={copy.label}
      className="grid w-full grid-cols-3 rounded-none border-x-0 bg-background-dimmed"
    >
      {copy.stages.map((stage, index) => (
        <Tab
          key={stage.id}
          value={stage.id}
          className="h-auto min-h-24 flex-col items-start gap-2 whitespace-normal px-4 py-4 text-left text-sm leading-snug before:hidden hover:bg-background-rich focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-4 data-[active]:bg-primary-text data-selected:bg-primary-text data-[active]:text-background-rich data-selected:text-background-rich data-[active]:focus-visible:outline-background-rich data-selected:focus-visible:outline-background-rich sm:flex-row sm:items-center sm:gap-4 sm:px-8 sm:text-base"
        >
          <span aria-hidden className="font-superior text-3xl">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>{stage.label}</span>
        </Tab>
      ))}
    </TabsList>
    {copy.stages.map((stage) => (
      <TabsPanel key={stage.id} value={stage.id} keepMounted>
        <div className="relative grid md:grid-cols-[1fr_1fr]">
          <Plus className="top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
          <div className="flex min-w-0 flex-col px-4 py-8 sm:px-8">
            <p className="text-foreground-dimmed text-sm!">{stage.status}</p>
            <h3 className="mt-6 max-w-[24ch] text-3xl!">{stage.title}</h3>
            <p className="mt-4 max-w-[48ch] text-foreground-dimmed">
              {stage.description}
            </p>
          </div>
          <div className="min-w-0 border-accent-foreground bg-background-dimmed px-4 py-8 max-md:border-t sm:px-8 md:border-l">
            <p className="text-foreground-dimmed text-sm!">{copy.diagram}</p>
            <ol className="mt-6">
              {stage.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="relative flex gap-4 pb-6 last:pb-0"
                >
                  {index < stage.steps.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute top-8 bottom-0 left-4 w-px -translate-x-1/2 bg-accent-rich"
                    />
                  )}
                  <span
                    aria-hidden
                    className="relative z-1 flex size-8 shrink-0 items-center justify-center border border-accent-rich bg-background"
                  >
                    <ArrowRightIcon className="size-4 rotate-90 text-primary-text" />
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="font-medium text-foreground-rich">
                      {step.title}
                    </p>
                    <p className="mt-2 max-w-[40ch] text-foreground-dimmed text-sm!">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="relative grid gap-4 border-accent-foreground border-t bg-background-dimmed/60 px-4 py-6 sm:px-8 md:grid-cols-[1fr_3fr]">
          <Plus className="top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
          <p className="font-medium text-foreground-rich">{copy.boundary}</p>
          <p className="max-w-[72ch] text-foreground-dimmed text-sm!">
            {stage.note}
          </p>
        </div>
      </TabsPanel>
    ))}
  </Tabs>
);

export namespace TravelAndExperiencesRoadmap {
  export type Props = {
    copy: AppConfig["Messages"]["travelPage"]["roadmap"];
  };
}
