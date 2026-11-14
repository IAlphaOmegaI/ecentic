"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { useMessages } from "next-intl";

export const TrackComparison = ({ content }: TrackComparison.Props) => (
  <Tabs defaultValue="visits" data-track-comparison>
    <div className="border-accent-foreground border-y px-8 py-6 max-sm:px-4">
      <p className="mb-4 text-foreground-dimmed">{content.comparisonHint}</p>
      <TabsList
        aria-label={content.comparisonLabel}
        className="grid w-full grid-cols-3 bg-background"
      >
        {content.signals.map((signal) => (
          <Tab
            key={signal.id}
            value={signal.id}
            className="h-auto min-h-14 min-w-0 px-4 py-4 text-base leading-snug data-active:bg-primary-text data-active:text-background-rich max-sm:px-2 max-sm:text-sm"
          >
            {signal.label}
          </Tab>
        ))}
      </TabsList>
    </div>
    {content.signals.map((signal) => (
      <TabsPanel
        key={signal.id}
        value={signal.id}
        keepMounted
        data-track-signal={signal.id}
        className="data-[hidden]:hidden"
      >
        <div className="grid min-w-0 lg:grid-cols-[5fr_7fr]">
          <div className="flex min-w-0 flex-col justify-center border-accent-foreground border-b bg-background-dimmed px-8 py-10 max-sm:px-4 lg:border-r lg:border-b-0">
            <div className="grid grid-cols-2 gap-6">
              {signal.inputs.map((input) => (
                <div
                  key={input}
                  className="flex min-h-20 min-w-0 items-center justify-center border border-accent-foreground bg-background px-4 py-4 text-center font-medium text-sm"
                >
                  {input}
                </div>
              ))}
            </div>
            <div aria-hidden="true" className="mx-auto grid w-1/2 grid-cols-2">
              <span className="h-6 border-accent-foreground border-b border-l" />
              <span className="h-6 border-accent-foreground border-r border-b" />
            </div>
            <span
              aria-hidden="true"
              className="mx-auto h-6 border-accent-foreground border-l"
            />
            <p className="border border-accent-foreground bg-background px-4 py-4 text-center font-medium">
              {signal.process}
            </p>
            <span
              aria-hidden="true"
              className="mx-auto h-8 text-center font-mono text-2xl text-primary-text leading-8"
            >
              ↓
            </span>
            <p className="text-center font-heading text-2xl text-primary-text leading-tight">
              {signal.output}
            </p>
          </div>
          <div className="min-w-0 px-8 py-10 max-sm:px-4">
            <h3 className="max-w-[24ch] text-3xl xl:text-4xl">
              {signal.title}
            </h3>
            <dl className="mt-8">
              <div>
                <dt className="font-medium text-foreground-rich">
                  {content.meaningLabel}
                </dt>
                <dd className="mt-2 max-w-[58ch] text-foreground-dimmed leading-relaxed">
                  {signal.meaning}
                </dd>
              </div>
              <div className="mt-6 border-accent-foreground border-t pt-6">
                <dt className="font-medium text-foreground-rich">
                  {content.limitLabel}
                </dt>
                <dd className="mt-2 max-w-[58ch] text-foreground-dimmed leading-relaxed">
                  {signal.limit}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </TabsPanel>
    ))}
  </Tabs>
);

export namespace TrackComparison {
  export type Props = {
    content: ReturnType<typeof useMessages>["trackPage"];
  };
}
