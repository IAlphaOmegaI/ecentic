"use client";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  LoaderIcon,
  MinusIcon,
  TrendDownIcon,
  TrendUpIcon,
  XCircleIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "@/i18n/navigation";
import { formatRelativeTime } from "@/lib/date";
import type * as Simulate from "@/server/app/intelligence/simulate";
import { Crosshair } from "./grid";

type TrendPoint = { date: string; winRate: number };
type ActivityEntry = {
  id: string;
  type:
    | "simulation_complete"
    | "simulation_running"
    | "simulation_pending"
    | "simulation_failed";
  message: string;
  detail: Simulate.TopFinding | null;
  timestamp: string;
};

const ActivityIcon = ({ type }: { type: ActivityEntry["type"] }) => {
  switch (type) {
    case "simulation_complete":
      return <CheckCircleIcon aria-hidden className="size-6 text-success" />;
    case "simulation_running":
      return <LoaderIcon aria-hidden className="size-6 text-primary" />;
    case "simulation_pending":
      return (
        <ClockIcon aria-hidden className="size-6 text-foreground-dimmed" />
      );
    case "simulation_failed":
      return <XCircleIcon aria-hidden className="size-6 text-error" />;
  }
};

export namespace WinRateLineChart {
  export type Props = {
    data: number[];
    labels: string[];
    title: string;
    className?: string;
    emptyPrimary: string;
    emptySecondary: string;
  };
}

const WinRateLineChart = ({
  data,
  labels,
  title,
  className,
  emptyPrimary,
  emptySecondary,
}: WinRateLineChart.Props) => {
  const locale = useLocale();
  const description = useId();
  const percentage = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  });
  const date = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const timestamp = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const chart = data.map((winRate, index) => ({
    date: labels[index] ?? "",
    winRate,
  }));

  if (chart.length === 0)
    return (
      <div
        className={cn(
          "flex h-60 min-w-0 flex-col items-center justify-center gap-4 px-6 text-center sm:h-64",
          className,
        )}
      >
        <TrendDownIcon aria-hidden className="size-10 text-primary" />
        <div className="max-w-64 text-sm leading-relaxed">
          <p className="text-foreground-rich">{emptyPrimary}</p>
          <p className="mt-2 text-foreground-dimmed">{emptySecondary}</p>
        </div>
      </div>
    );

  return (
    <div className={cn("h-60 min-w-0 px-4 pb-4 sm:h-64 sm:px-6", className)}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          accessibilityLayer
          aria-label={title}
          aria-describedby={description}
          data={chart}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            stroke="var(--color-accent-foreground)"
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "var(--color-foreground-dimmed)",
              fontSize: "var(--text-xs)",
            }}
            tickFormatter={(value: string) => date.format(new Date(value))}
            interval="preserveStartEnd"
            minTickGap={48}
            dy={8}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "var(--color-foreground-dimmed)",
              fontSize: "var(--text-xs)",
            }}
            tickFormatter={(value: number) => percentage.format(value / 100)}
            width={42}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-primary)", strokeOpacity: 0.4 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length || typeof label !== "string")
                return null;
              const value = payload[0]?.value;
              if (typeof value !== "number") return null;

              return (
                <div className="rounded-lg border border-background-rich/15 bg-emphasis-dimmed px-4 py-3 text-background-rich shadow-lg">
                  <p className="text-background-rich/65 text-xs">
                    {timestamp.format(new Date(label))}
                  </p>
                  <p className="mt-1 font-semibold text-lg tabular-nums">
                    {percentage.format(value / 100)}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="linear"
            dataKey="winRate"
            name={title}
            stroke="var(--color-primary)"
            strokeWidth={1.5}
            fill="var(--color-primary)"
            fillOpacity={0.04}
            dot={
              chart.length === 1
                ? { r: 4, fill: "var(--color-primary)", strokeWidth: 0 }
                : false
            }
            activeDot={{
              r: 4,
              fill: "var(--color-primary)",
              stroke: "var(--color-background)",
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <ol id={description} className="sr-only">
        {chart.map((point) => (
          <li key={point.date}>
            {timestamp.format(new Date(point.date))}:{" "}
            {percentage.format(point.winRate / 100)}
          </li>
        ))}
      </ol>
    </div>
  );
};

export const OverviewCharts = ({
  trend,
  result,
  reportId,
}: OverviewCharts.Props) => {
  const locale = useLocale();
  const translate = useTranslations("dashboard.overview.charts");
  const summary = useTranslations("dashboard.overview.summary");
  const percentage = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  });
  const change = new Intl.NumberFormat(locale, {
    signDisplay: "exceptZero",
    maximumFractionDigits: 1,
  });
  const latest = trend.at(-1);

  return (
    <section className="flex min-w-0 flex-col font-normal text-foreground-rich">
      <header className="px-6 pt-5 pb-4">
        <h2 className="font-semibold text-base text-foreground-rich">
          {summary("latestWinRate")}
        </h2>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-heading font-semibold text-5xl tabular-nums leading-none tracking-tight">
              {latest ? percentage.format(latest.winRate / 100) : "—"}
            </p>
            <p className="mt-2 text-foreground-dimmed text-xs leading-relaxed">
              {result
                ? summary("latestResult", {
                    wins: result.wins,
                    total: result.total,
                  })
                : summary("noResult")}
            </p>
          </div>
          {result?.change !== null && result?.change !== undefined && (
            <div className="flex items-start gap-2">
              {result.change > 0 ? (
                <TrendUpIcon
                  aria-hidden
                  className="mt-0.5 size-5 text-success"
                />
              ) : result.change === 0 ? (
                <MinusIcon
                  aria-hidden
                  className="mt-0.5 size-5 text-foreground-dimmed"
                />
              ) : (
                <TrendDownIcon
                  aria-hidden
                  className="mt-0.5 size-5 text-warning"
                />
              )}
              <div>
                <p className="font-semibold text-sm">
                  {summary("change", { value: change.format(result.change) })}
                </p>
                <p className="mt-1 text-foreground-dimmed text-xs">
                  {translate("change")}
                </p>
              </div>
            </div>
          )}
        </div>
      </header>
      <WinRateLineChart
        data={trend.map((point) => point.winRate)}
        labels={trend.map((point) => point.date)}
        title={translate("winRateTrend")}
        className="h-48 sm:h-52"
        emptyPrimary={translate("states.noTrend")}
        emptySecondary={translate("states.noTrendHint")}
      />
      <footer className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-t px-6 py-3">
        <p className="max-w-sm text-foreground-dimmed text-xs leading-5">
          {translate("sampleNote")}
        </p>
        {reportId && (
          <Button
            color="neutral"
            variant="soft"
            className="min-h-9 whitespace-normal text-left text-sm"
            render={<Link href={`/share/${reportId}`} />}
          >
            {translate("action.primary")}
            <ArrowRightIcon aria-hidden className="size-4 shrink-0" />
          </Button>
        )}
      </footer>
    </section>
  );
};

export namespace OverviewCharts {
  export type Props = {
    trend: TrendPoint[];
    result?: { wins: number; total: number; change: number | null };
    reportId?: string;
  };
}

export const OverviewRecentScans = ({
  activity,
}: OverviewRecentScans.Props) => {
  const locale = useLocale();
  const { store } = useParams<{ store: string }>();
  const translate = useTranslations("dashboard.overview.charts");

  return (
    <section className="min-w-0 bg-background-rich font-normal">
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <ClockIcon aria-hidden className="size-6 text-primary" />
          <h2 className="font-semibold text-foreground-rich text-lg tracking-tight">
            {translate("recentActivity")}
          </h2>
        </div>
        <Button
          color="accent"
          render={<Link href={`/dashboard/${store}/simulations`} />}
        >
          {translate("action.tertiary")}
          <ArrowRightIcon aria-hidden className="size-4" />
        </Button>
      </header>
      {activity.length === 0 ? (
        <p className="border-accent-foreground border-t px-6 py-6 text-foreground-dimmed text-sm leading-relaxed">
          {translate("states.noActivity")}
        </p>
      ) : (
        <div className="relative border-accent-foreground border-t">
          <Crosshair className="top-0 left-0 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 -translate-y-1/2" />
          <ol className="divide-y divide-accent-foreground">
            {activity.slice(0, 3).map((entry) => (
              <li key={entry.id} className="group relative min-w-0">
                <Link
                  href={`/share/${entry.id}`}
                  className="relative flex min-w-0 items-center gap-4 px-6 py-4 outline-offset-[-3px] transition-colors hover:bg-primary/3 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-9 h-full w-px bg-accent-foreground group-last:hidden"
                  />
                  <span className="relative z-1 shrink-0 bg-background-rich py-1">
                    <ActivityIcon type={entry.type} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground-rich text-sm leading-relaxed">
                      {entry.message}
                    </p>
                    {entry.detail && entry.type === "simulation_complete" && (
                      <p className="mt-1 line-clamp-1 text-foreground-dimmed text-xs leading-relaxed">
                        {entry.detail.impactDescription}
                      </p>
                    )}
                    <time
                      dateTime={entry.timestamp}
                      className="mt-1 block text-foreground-dimmed text-xs sm:hidden"
                    >
                      {formatRelativeTime(new Date(entry.timestamp), locale)}
                    </time>
                  </div>
                  <time
                    dateTime={entry.timestamp}
                    className="hidden shrink-0 text-foreground-dimmed text-xs sm:block"
                  >
                    {formatRelativeTime(new Date(entry.timestamp), locale)}
                  </time>
                  <ArrowRightIcon
                    aria-hidden
                    className="size-4 shrink-0 text-foreground-dimmed transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
};

export namespace OverviewRecentScans {
  export type Props = { activity: ActivityEntry[] };
}
