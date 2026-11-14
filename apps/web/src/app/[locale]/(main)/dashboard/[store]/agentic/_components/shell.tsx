"use client";
import {
  BookIcon,
  CheckBadgeIcon,
  GaugeIcon,
  GlobeSearchIcon,
  RobotIcon,
} from "@zenncore/icons";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SectionHeader } from "../../../_components/grid";
import {
  ChannelSection,
  ChannelsWorkspace,
} from "../../channels/_components/workspace";
export const AgenticShell = ({
  scan,
  score,
  journey,
  competitors,
  checks,
  methodology,
}: {
  scan: ReactNode;
  score: ReactNode;
  journey: ReactNode;
  competitors: ReactNode;
  checks: ReactNode;
  methodology: ReactNode;
}) => {
  const translate = useTranslations("dashboard.agentic");
  const channels = useTranslations("dashboard.channels");
  return (
    <ChannelsWorkspace
      subject="agentic"
      title={channels("tools.checks")}
      description={translate("description")}
    >
      <ChannelSection>{scan}</ChannelSection>
      <Tabs defaultValue="score" className="min-w-0">
        <div className="max-w-full overflow-x-auto border-accent-foreground border-b px-4 py-4 sm:px-6">
          <TabsList className="min-w-max">
            <TabsIndicator />
            <Tab value="score">{translate("score.title")}</Tab>
            <Tab value="checks">{translate("checks.title")}</Tab>
            <Tab value="journey">{translate("journey.title")}</Tab>
            <Tab value="competitors">{translate("competitors.title")}</Tab>
            <Tab value="methodology">{translate("methodology.title")}</Tab>
          </TabsList>
        </div>
        <TabsPanel value="score" className="min-w-0">
          <ChannelSection>
            <SectionHeader
              icon={<GaugeIcon aria-hidden className="size-5" />}
              title={translate("score.title")}
              description={translate("score.description")}
            />
            {score}
          </ChannelSection>
        </TabsPanel>
        <TabsPanel value="checks" className="min-w-0">
          <ChannelSection>
            <SectionHeader
              icon={<CheckBadgeIcon aria-hidden className="size-5" />}
              title={translate("checks.title")}
              description={translate("checks.description")}
            />
            {checks}
          </ChannelSection>
        </TabsPanel>
        <TabsPanel value="journey" className="min-w-0">
          <ChannelSection>
            <SectionHeader
              icon={<RobotIcon aria-hidden className="size-5" />}
              title={translate("journey.title")}
              description={translate("journey.description")}
            />
            {journey}
          </ChannelSection>
        </TabsPanel>
        <TabsPanel value="competitors" className="min-w-0">
          <ChannelSection>
            <SectionHeader
              icon={<GlobeSearchIcon aria-hidden className="size-5" />}
              title={translate("competitors.title")}
              description={translate("competitors.description")}
            />
            {competitors}
          </ChannelSection>
        </TabsPanel>
        <TabsPanel value="methodology" className="min-w-0">
          <ChannelSection>
            <SectionHeader
              icon={<BookIcon aria-hidden className="size-5" />}
              title={translate("methodology.title")}
              description={translate("methodology.description")}
            />
            {methodology}
          </ChannelSection>
        </TabsPanel>
      </Tabs>
    </ChannelsWorkspace>
  );
};
const BAR_ROWS = [
  "discovery",
  "accessibility",
  "usability",
  "payments",
] as const;
const CHECK_ROWS = ["a", "b", "c", "d", "e", "f"] as const;

/** Matches ScoreContent: grade + score cells, then one bar per layer. */
export const ScoreSkeleton = () => (
  <div className="flex flex-col">
    <div className="grid gap-px bg-accent-foreground sm:grid-cols-2">
      {["grade", "score"].map((key) => (
        <div
          key={key}
          className="relative flex flex-col justify-between gap-6 bg-background-rich p-5"
        >
          <div className="h-3 w-24 animate-pulse bg-foreground/10" />
          <div className="h-10 w-16 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
    <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2">
      {BAR_ROWS.map((key) => (
        <div
          key={key}
          className="flex min-w-0 flex-col overflow-hidden bg-background-rich"
        >
          <div className="border-accent-foreground border-b px-4 py-3">
            <div className="h-3 w-24 animate-pulse bg-foreground/10" />
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div className="h-1.5 w-full animate-pulse rounded-full bg-foreground/10" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Matches ChecksContent: one collapsed accordion row per layer. */
export const ChecksSkeleton = () => (
  <div className="divide-y divide-accent-foreground">
    {CHECK_ROWS.map((key) => (
      <div key={key} className="flex items-center gap-3 p-4">
        <div className="h-4 w-40 animate-pulse bg-foreground/10" />
        <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-foreground/10" />
      </div>
    ))}
  </div>
);

/**
 * Matches ScanRunner's compact target, status, action and inline provider note.
 */
export const ScanSkeleton = () => (
  <div
    aria-hidden
    className="grid gap-x-6 gap-y-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6 sm:py-5 motion-reduce:[&_*]:animate-none"
  >
    <div className="min-w-0">
      <div className="flex items-start gap-3">
        <div className="mt-1 size-6 shrink-0 animate-pulse rounded-sm bg-foreground/10" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-5 w-36 animate-pulse bg-foreground/10" />
          <div className="h-4 w-full max-w-80 animate-pulse bg-foreground/10" />
        </div>
      </div>
      <div className="mt-3 h-4 w-36 animate-pulse bg-foreground/10" />
    </div>
    <div className="h-10 w-full animate-pulse rounded-lg bg-foreground/10 sm:w-32" />
    <div className="h-4 w-full max-w-xl animate-pulse bg-foreground/10 sm:col-span-2" />
  </div>
);

/** Matches JourneyTrace: insight row plus a dark map well. */
export const JourneySkeleton = () => (
  <div className="flex flex-col">
    <div className="flex flex-col gap-3 border-accent-foreground border-b p-4">
      <div className="h-5 w-24 animate-pulse rounded-full bg-foreground/10" />
      <div className="h-4 w-full max-w-2xl animate-pulse bg-foreground/10" />
    </div>
    <div className="p-4">
      <div className="overflow-hidden bg-background-rich">
        <div className="min-h-48" />
        <div className="flex gap-6 border-accent-foreground border-t px-4 py-3">
          <div className="h-3 w-16 animate-pulse bg-foreground/10" />
          <div className="h-3 w-28 animate-pulse bg-foreground/10" />
          <div className="h-3 w-20 animate-pulse bg-foreground/10" />
        </div>
      </div>
    </div>
  </div>
);

/** Matches CompetitorScans: a flush table with a coverage header. */
export const CompetitorsSkeleton = () => (
  <div aria-hidden className="min-w-0 motion-reduce:[&_*]:animate-none">
    <div className="overflow-hidden">
      <div className="flex items-center gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <div className="h-9 w-20 animate-pulse rounded-sm bg-foreground/10" />
        <div className="space-y-2">
          <div className="h-4 w-48 animate-pulse bg-foreground/10" />
          <div className="h-1 w-40 animate-pulse rounded-full bg-foreground/10" />
        </div>
      </div>
      {["a", "b", "c"].map((key) => (
        <div
          key={key}
          className="flex items-center gap-4 border-accent-foreground border-b px-4 py-3 last:border-b-0"
        >
          <div className="h-4 w-40 animate-pulse bg-foreground/10" />
          <div className="ml-auto h-4 w-24 animate-pulse bg-foreground/10" />
          <div className="h-9 w-20 animate-pulse rounded-sm bg-foreground/10" />
        </div>
      ))}
    </div>
  </div>
);

/** Matches MethodologySection: a short stack of headings and paragraphs. */
export const MethodologySkeleton = () => (
  <div className="flex flex-col gap-3 p-4">
    {["a", "b", "c", "d"].map((key) => (
      <div
        key={key}
        className="h-4 w-full max-w-3xl animate-pulse bg-foreground/10"
      />
    ))}
  </div>
);
