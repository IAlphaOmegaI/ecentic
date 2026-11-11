"use client";

import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { MarketingPage } from "@/components/marketing/page";
import { Link } from "@/i18n/navigation";

export const StoriesEvidence = ({
  title,
  figure,
  metric,
  period,
  note,
  method,
  permission,
  confirmed,
  source,
  sourceLabel,
  sections,
  action,
}: StoriesEvidence.Props) => (
  <Tabs defaultValue="result" className="min-w-0 bg-background-dimmed">
    <TabsList
      aria-label={title}
      className="grid w-full grid-cols-3 rounded-none border-0 border-accent-foreground border-b max-sm:grid-cols-1"
    >
      {sections.map((section, index) => (
        <Tab
          key={section.id}
          value={section.id}
          className="h-auto min-h-24 flex-col items-start justify-start gap-3 whitespace-normal px-6 py-5 text-left text-base leading-snug transition-none! hover:bg-accent/50 data-[active]:bg-primary data-selected:bg-primary data-[active]:text-background-rich data-selected:text-background-rich max-sm:min-h-16 max-sm:flex-row max-sm:items-center max-sm:gap-4 max-sm:border-r-0 max-sm:border-b max-sm:px-4 max-sm:py-4 max-sm:last:border-b-0"
        >
          <span aria-hidden className="text-sm opacity-70">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>{section.title}</span>
        </Tab>
      ))}
    </TabsList>
    {sections.map((section) => (
      <TabsPanel key={section.id} value={section.id} className="outline-none">
        <div className="flex min-h-[440px] flex-col px-8 py-10 max-sm:min-h-[400px] max-sm:px-4 max-sm:py-8">
          {section.id === "result" && (
            <>
              <p className="whitespace-nowrap font-body font-medium text-[clamp(6rem,11vw,10rem)] text-primary proportional-nums leading-none tracking-[-0.06em]">
                {figure}
              </p>
              <p className="mt-6 max-w-[28ch] text-2xl text-foreground-rich leading-tight max-sm:text-xl">
                {metric}
              </p>
              <p className="mt-4 text-foreground-dimmed">{period}</p>
              <p className="mt-auto max-w-[62ch] pt-8 text-foreground-dimmed text-sm leading-relaxed">
                {note}
              </p>
            </>
          )}
          {section.id === "method" && (
            <>
              <h3>{section.title}</h3>
              <p className="mt-6 max-w-[52ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                {method}
              </p>
              <p className="mt-auto max-w-[60ch] border-accent-foreground border-t pt-6 text-foreground-dimmed text-sm leading-relaxed">
                <span className="block font-medium text-foreground-rich">
                  {sourceLabel}
                </span>
                {source}
              </p>
            </>
          )}
          {section.id === "permission" && (
            <>
              <CheckIcon aria-hidden className="mb-8 size-8 text-primary" />
              <h3 className="max-w-[22ch]">{permission}</h3>
              <p className="mt-6 max-w-[46ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                {confirmed}
              </p>
              <p className="mt-auto max-w-[60ch] border-accent-foreground border-t pt-6 text-foreground-dimmed text-sm leading-relaxed">
                {source}
              </p>
            </>
          )}
        </div>
        <Link
          href={`${action.href}#${section.id}`}
          className="group flex min-h-20 items-center justify-between gap-6 border-accent-foreground border-t px-8 py-6 font-medium text-primary-text hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-offset-[-4px] max-sm:px-4"
        >
          <span>{action.label}</span>
          <ArrowRightIcon aria-hidden className="size-4 shrink-0" />
        </Link>
      </TabsPanel>
    ))}
  </Tabs>
);

export namespace StoriesEvidence {
  export type Props = {
    title: string;
    figure: string;
    metric: string;
    period: string;
    note: string;
    method: string;
    permission: string;
    confirmed: string;
    source: string;
    sourceLabel: string;
    sections: readonly Pick<MarketingPage.Section, "id" | "title">[];
    action: MarketingPage.Action;
  };
}
