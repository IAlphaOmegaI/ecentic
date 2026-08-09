"use client";

import {
  CircleBoltIcon,
  ClockIcon,
  GaugeIcon,
  RadarIcon,
  RocketIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import Image from "next/image";
import { useMessages, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildOptimizationRoadmap,
  type RoadmapPhase,
  type RoadmapPhaseId,
  type RoadmapProjection,
  type RoadmapWeek,
} from "@/lib/optimization-roadmap";
import {
  SectionKicker,
  StatLabel,
  StatusPill,
} from "../../../_components/grid";

const AGENT_LOGOS = [
  { label: "ChatGPT", src: "/images/chatgpt.svg" },
  { label: "Claude", src: "/images/claude.svg" },
  { label: "Gemini", src: "/images/gemini.svg" },
  { label: "Perplexity", src: "/images/perplexity.svg" },
] as const;

const PHASE_ICON: Record<RoadmapPhaseId, ReactNode> = {
  foundation: <CircleBoltIcon className="size-5 text-primary" />,
  traction: <RadarIcon className="size-5 text-warning" />,
  compound: <RocketIcon className="size-5 text-success" />,
};

const PHASE_TONE: Record<
  RoadmapPhaseId,
  "primary" | "warning" | "success" | "neutral"
> = {
  foundation: "primary",
  traction: "warning",
  compound: "success",
};

type PhaseMessages = Record<
  RoadmapPhaseId,
  {
    title: string;
    window: string;
    summary: string;
    outcomes: string[];
  }
>;

export namespace OptimizationRoadmap {
  export type Props = {
    baselineWinRate: number;
    averageLift: number;
    pendingCount: number;
    publishedCount: number;
    productCount: number;
    startedAt: string | Date | null;
    kicker?: string;
  };
}

const MetricCard = ({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) => (
  <div className="relative flex flex-col justify-between gap-4 bg-background-rich p-5">
    <StatLabel label={label} icon={icon} />
    <div>
      <p className="font-bold text-3xl text-foreground-rich tabular-nums tracking-[-0.02em]">
        {value}
      </p>
      <p className="mt-1 text-foreground-dimmed text-xs">{detail}</p>
    </div>
  </div>
);

const ChartTooltip = ({
  active,
  payload,
  phaseMessages,
  translate,
}: {
  active?: boolean;
  payload?: { payload: RoadmapWeek }[];
  phaseMessages: PhaseMessages;
  translate: ReturnType<typeof useTranslations<"dashboard.optimize.roadmap">>;
}) => {
  if (!active || !payload?.[0]) return null;

  const point = payload[0].payload;
  const phaseTitle = (() => {
    switch (point.phaseId) {
      case "foundation":
        return phaseMessages.foundation.title;
      case "traction":
        return phaseMessages.traction.title;
      case "compound":
        return phaseMessages.compound.title;
      default: {
        const exhaustive: never = point.phaseId;
        return exhaustive;
      }
    }
  })();

  return (
    <div className="min-w-52 rounded-md border border-accent-foreground bg-background-rich px-3 py-2.5 shadow-md">
      <div className="flex items-center justify-between gap-3">
        <span className="text-foreground-dimmed text-xs">
          {point.week === 0
            ? translate("chart.weekZero")
            : translate("chart.week", { week: point.week })}
        </span>
        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary">
          {phaseTitle}
        </span>
      </div>
      <p className="mt-1.5 font-bold text-2xl text-foreground-rich tabular-nums tracking-[-0.02em]">
        {point.winRate}
        <span className="ml-0.5 font-medium text-foreground-dimmed text-sm">
          {translate("chart.winRate")}
        </span>
      </p>
      <dl className="mt-2 space-y-1 border-accent-foreground border-t pt-2 text-xs">
        <div className="flex justify-between gap-4">
          <dt className="text-foreground-dimmed">
            {translate("chart.listingsOptimized")}
          </dt>
          <dd className="font-medium text-foreground-rich tabular-nums">
            {point.listingsOptimized}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-foreground-dimmed">
            {translate("chart.surfacesLive")}
          </dt>
          <dd className="font-medium text-foreground-rich tabular-nums">
            {point.surfacesLive}/4
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-foreground-dimmed">
            {translate("chart.signalIntensity")}
          </dt>
          <dd className="font-medium text-foreground-rich tabular-nums">
            {point.agentSignals}
          </dd>
        </div>
      </dl>
      <div className="mt-2.5 flex items-center gap-1.5 border-accent-foreground border-t pt-2">
        {AGENT_LOGOS.slice(0, point.surfacesLive).map((agent) => (
          <Image
            key={agent.label}
            src={agent.src}
            alt={agent.label}
            width={18}
            height={18}
            className="size-4"
          />
        ))}
      </div>
    </div>
  );
};

const PhaseCard = ({
  phase,
  active,
  projection,
  translate,
}: {
  phase: RoadmapPhase;
  active: boolean;
  projection: RoadmapProjection;
  translate: ReturnType<typeof useTranslations<"dashboard.optimize.roadmap">>;
}) => {
  const week = projection.weeks.find((point) => point.week === phase.weekEnd);
  const liftAtPhase = week ? week.winRate - projection.baselineWinRate : 0;

  return (
    <AccordionItem
      value={phase.id}
      className={cn(
        "border-accent-foreground border-b bg-background-rich last:border-b-0",
        active && "bg-primary/5",
      )}
    >
      <AccordionTrigger
        className="items-center px-5 py-4 hover:bg-background-dimmed/40"
        classList={{
          trigger: {
            icon: "size-4 shrink-0 text-foreground-dimmed group-data-panel-open:rotate-180",
          },
        }}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center border border-accent-foreground bg-background-dimmed">
            {PHASE_ICON[phase.id]}
          </span>
          <span className="min-w-0 text-left">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground-rich">
                {phase.title}
              </span>
              <StatusPill tone={PHASE_TONE[phase.id]}>
                {phase.window}
              </StatusPill>
              {active && (
                <StatusPill tone="primary">{translate("current")}</StatusPill>
              )}
            </span>
            <span className="mt-0.5 block truncate text-foreground-dimmed text-xs">
              {phase.summary}
            </span>
          </span>
        </span>
        {liftAtPhase > 0 && (
          <span className="mr-2 hidden shrink-0 items-center gap-1 font-medium text-success text-xs sm:inline-flex">
            <TrendUpIcon className="size-3.5" />
            {translate("liftPoints", { points: liftAtPhase })}
          </span>
        )}
      </AccordionTrigger>
      <AccordionPanel>
        <ul className="space-y-2 border-accent-foreground border-t px-5 py-4">
          {phase.outcomes.map((outcome) => (
            <li
              key={outcome}
              className="flex gap-2 text-foreground text-sm before:mt-2 before:size-1 before:shrink-0 before:rounded-full before:bg-primary before:content-['']"
            >
              {outcome}
            </li>
          ))}
        </ul>
      </AccordionPanel>
    </AccordionItem>
  );
};

export const OptimizationRoadmap = ({
  baselineWinRate,
  averageLift,
  pendingCount,
  publishedCount,
  productCount,
  startedAt,
  kicker,
}: OptimizationRoadmap.Props) => {
  const translate = useTranslations("dashboard.optimize.roadmap");
  const messages = useMessages();
  const phaseMessages = messages.dashboard.optimize.roadmap
    .phases as PhaseMessages;

  const projection = buildOptimizationRoadmap({
    baselineWinRate,
    averageLift,
    pendingCount,
    publishedCount,
    productCount,
    startedAt: startedAt ? new Date(startedAt) : null,
  });

  const translatedPhases = useMemo(
    () =>
      projection.phases.map((phase) => ({
        ...phase,
        title: phaseMessages[phase.id].title,
        window: phaseMessages[phase.id].window,
        summary: phaseMessages[phase.id].summary,
        outcomes: phaseMessages[phase.id].outcomes,
      })),
    [projection.phases, phaseMessages],
  );

  const currentPhase = useMemo(() => {
    const match = translatedPhases.find(
      (phase) => phase.id === projection.currentPhase.id,
    );
    return match ?? translatedPhases[0];
  }, [translatedPhases, projection.currentPhase.id]);

  const [minimum, maximum] = (() => {
    const lowest = Math.min(...projection.weeks.map((week) => week.winRate));
    const highest = Math.max(...projection.weeks.map((week) => week.winRate));
    const padding = 4;
    return [
      Math.max(0, Math.floor((lowest - padding) / 5) * 5),
      Math.min(100, Math.ceil((highest + padding) / 5) * 5),
    ];
  })();

  const delta = projection.targetWinRate - projection.baselineWinRate;

  return (
    <div>
      <div className="border-accent-foreground border-b p-4">
        <SectionKicker>{kicker ?? translate("kicker")}</SectionKicker>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-semibold text-foreground-rich text-lg">
              {translate("title")}
            </p>
            <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
              {translate("description", {
                trafficDays: projection.firstTrafficDays,
              })}
            </p>
          </div>
          <StatusPill tone={PHASE_TONE[projection.currentPhase.id]}>
            {translate("phaseLabel", { title: currentPhase.title })}
          </StatusPill>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px border-accent-foreground border-b bg-accent-foreground sm:grid-cols-3">
        <MetricCard
          label={translate("metrics.ceiling.label")}
          value={`${projection.targetWinRate}%`}
          detail={translate("metrics.ceiling.detail", {
            baseline: projection.baselineWinRate,
            delta,
          })}
          icon={<GaugeIcon className="size-7.5 text-primary" />}
        />
        <MetricCard
          label={translate("metrics.simulationLift.label")}
          value={`${projection.firstSimulationDays}d`}
          detail={translate("metrics.simulationLift.detail")}
          icon={<ClockIcon className="size-7.5 text-warning" />}
        />
        <MetricCard
          label={translate("metrics.trafficSignals.label")}
          value={`~${projection.firstTrafficDays}d`}
          detail={translate("metrics.trafficSignals.detail")}
          icon={<TrendUpIcon className="size-7.5 text-success" />}
        />
      </div>

      <div className="border-accent-foreground border-b p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
            {translate("chart.title")}
          </p>
          <p className="text-foreground-dimmed text-xs">
            {translate("chart.coverage", {
              coverage: projection.catalogCoverage,
            })}
          </p>
        </div>

        <div className="h-72 min-h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={projection.weeks}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                stroke="var(--color-foreground-dimmed)"
                strokeOpacity={0.14}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-foreground-dimmed)", fontSize: 11 }}
                interval={3}
                dy={8}
              />
              <YAxis
                domain={[minimum, maximum]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-foreground-dimmed)", fontSize: 11 }}
                tickFormatter={(value: number) => `${value}%`}
                allowDecimals={false}
                tickCount={5}
                width={44}
              />
              <Tooltip
                cursor={{
                  stroke: "var(--color-warning)",
                  strokeDasharray: "4 4",
                  strokeOpacity: 0.8,
                }}
                content={
                  <ChartTooltip
                    phaseMessages={phaseMessages}
                    translate={translate}
                  />
                }
              />
              <ReferenceLine
                x={projection.weeks[projection.todayWeek]?.label}
                stroke="var(--color-warning)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: translate("chart.today"),
                  position: "insideTopRight",
                  fill: "var(--color-warning)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              <Area
                type="monotone"
                dataKey="winRate"
                stroke="var(--color-primary)"
                strokeWidth={1.75}
                fill="var(--color-primary)"
                fillOpacity={0.1}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "var(--color-background-rich)",
                  stroke: "var(--color-primary)",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Accordion
        className="text-foreground"
        defaultValue={[projection.currentPhase.id]}
        multiple
      >
        {translatedPhases.map((phase) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            active={phase.id === projection.currentPhase.id}
            projection={projection}
            translate={translate}
          />
        ))}
      </Accordion>
    </div>
  );
};
