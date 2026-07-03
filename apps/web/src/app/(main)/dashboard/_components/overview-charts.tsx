"use client";

import {
  ArrowRightIcon,
  BellIcon,
  BoxMinusIcon,
  CheckCircleIcon,
  LoaderIcon,
  TrendDownIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Spring } from "@/lib/animations";
import { formatRelativeTime } from "@/lib/date";
import type * as Simulate from "@/server/app/intelligence/simulate";
import { SectionKicker } from "./grid";

type ModelRate = { label: string; rate: number };
type TrendPoint = { date: string; winRate: number };
type ActivityEntry = {
  id: string;
  type: "simulation_complete" | "simulation_running";
  message: string;
  detail: Simulate.TopFinding | null;
  timestamp: string;
};

const modelBarColors: Record<string, string> = {
  "GPT-4": "bg-primary",
  Claude: "bg-warning",
  Gemini: "bg-success",
  Perplexity: "bg-info",
};

const ActivityIcon = ({
  type,
  className,
}: {
  type: string;
  className?: string;
}) => {
  const { icon, color } = (() => {
    switch (type) {
      case "simulation_complete":
        return {
          icon: <CheckCircleIcon className="size-7.5" />,
          color: "text-success",
        };
      case "simulation_running":
        return {
          icon: <LoaderIcon className="size-7.5 animate-spin" />,
          color: "text-primary",
        };
      default:
        return {
          icon: <BellIcon className="size-7.5" />,
          color: "text-foreground-dimmed",
        };
    }
  })();

  return <div className={cn("shrink-0", className, color)}>{icon}</div>;
};

export namespace WinRateLineChart {
  export type Props = {
    data: number[];
    labels: string[];
    className?: string;
  };
}

const WinRateLineChart = ({
  data,
  labels,
  className = "h-20",
}: WinRateLineChart.Props) => {
  if (data.length < 2)
    return (
      <div
        className={cn(
          "flex h-64 min-h-64 flex-col items-center justify-center gap-2 text-center text-foreground-dimmed",
          className,
        )}
      >
        <TrendDownIcon className="size-24" />
        Not enough data for trend. <br />
        Get started by running a simulation.
      </div>
    );

  const chart = data.map((winRate, index) => ({
    label: labels[index] ?? "",
    winRate,
  }));

  const [minimum, maximum] = (() => {
    const lowest = Math.min(...data);
    const highest = Math.max(...data);
    const padding = lowest === highest ? 6 : 4;

    return [
      Math.max(0, Math.floor((lowest - padding) / 5) * 5),
      Math.min(100, Math.ceil((highest + padding) / 5) * 5),
    ];
  })();

  return (
    <div className={cn("h-64 min-h-64 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chart}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
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
            interval="preserveStartEnd"
            minTickGap={64}
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
              stroke: "var(--color-foreground-dimmed)",
              strokeOpacity: 0.35,
            }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const value = payload[0]?.value;
              if (typeof value !== "number") return null;

              return (
                <div className="flex items-baseline gap-3 whitespace-nowrap rounded-md border border-accent-foreground bg-background-rich px-3 py-1.5 shadow-md">
                  <span className="text-foreground-dimmed text-sm">
                    {label}
                  </span>
                  <span className="font-medium text-primary">{value}%</span>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="winRate"
            stroke="var(--color-primary)"
            strokeWidth={1.5}
            fill="var(--color-primary)"
            fillOpacity={0.08}
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
  );
};

export const OverviewCharts = ({
  models,
  trend,
  activity,
}: OverviewCharts.Props) => {
  const { store } = useParams<{ store: string }>();
  const data = trend.map((point) => point.winRate);
  const labels = trend.map((point) => formatRelativeTime(new Date(point.date)));

  const change = (() => {
    if (data.length < 2) return 0;
    return (data[data.length - 1] ?? 0) - (data[0] ?? 0);
  })();

  return (
    <div>
      <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
        <div className="flex flex-col bg-background-rich xl:col-span-2">
          <div className="flex items-start justify-between p-4">
            <div>
              <SectionKicker>01 — Performance</SectionKicker>
              <p className="mt-2 font-semibold text-foreground-rich text-lg">
                Win Rate by Model
              </p>
            </div>
          </div>

          {models.length > 0 ? (
            <div className="grid grid-cols-4 divide-x divide-accent-foreground border-accent-foreground border-y px-4">
              {models.map(({ label, rate }) => {
                return (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1 p-6 first:pl-0 last:pr-0"
                  >
                    <div className="flex w-full flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Image
                          src={getLogo(label)}
                          alt={label}
                          width={64}
                          height={64}
                          className="size-8"
                        />
                        <span className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                          {label}
                        </span>
                      </div>
                      <span className="font-bold text-2xl text-foreground-rich tabular-nums tracking-[-0.02em]">
                        {rate}{" "}
                        <span className="font-medium text-foreground-dimmed text-sm">
                          %
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 h-1 w-full rounded-full bg-accent-foreground">
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          modelBarColors[label],
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${rate}%` }}
                        transition={{ ...Spring.Gentle, delay: 0.4 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="flex h-26 flex-col items-center justify-center gap-2 border-accent-foreground border-y px-4 text-foreground-dimmed">
              <BoxMinusIcon className="size-12" />
              Run a simulation to see per-model performance.
            </p>
          )}

          <div className="flex flex-1 flex-col">
            <div className="mb-4 flex items-center justify-between p-4">
              <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                Win Rate Trend
              </p>
              {change !== 0 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-semibold text-[11px]",
                    change > 0
                      ? "bg-success/10 text-success"
                      : "bg-error/10 text-error",
                  )}
                >
                  {change > 0 ? "+" : ""}
                  {change}%
                </span>
              )}
            </div>
            <WinRateLineChart
              data={data}
              labels={labels}
              className="h-full flex-1 px-4 pb-4"
            />
          </div>
        </div>

        <div className="flex flex-col gap-px bg-accent-foreground">
          <div className="flex-1 bg-background-rich">
            <div className="mb-2 flex items-center justify-between px-4 pt-4">
              <SectionKicker>01.5 — Recent Activity</SectionKicker>
            </div>
            {activity.length === 0 ? (
              <div className="flex size-full flex-col items-center items-center justify-center gap-2 p-4 text-center font-normal text-foreground-dimmed">
                <BellIcon className="size-24" />
                <p className="text-foreground-dimmed">
                  No activity yet. Run your <br />
                  first simulation to see results here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {activity.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 border-accent-foreground border-b p-4 first:border-t last:border-b-0"
                  >
                    <ActivityIcon type={entry.type} />
                    <div>
                      <p className="text-foreground leading-relaxed">
                        {entry.message}
                      </p>
                      {entry.detail && (
                        <p className="mt-0.5 text-foreground-dimmed text-sm">
                          {entry.detail.impactDescription.slice(0, 100)}...
                        </p>
                      )}
                      <p className="mt-2 text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
                        {formatRelativeTime(new Date(entry.timestamp))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between bg-background-rich p-4">
            <Button
              color="accent"
              render={<Link href={`/dashboard/${store}/optimize`} />}
            >
              Optimizations
            </Button>
            <Button
              color="primary"
              render={<Link href={`/dashboard/${store}/products`} />}
            >
              View all products <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export namespace OverviewCharts {
  export type Props = {
    models: ModelRate[];
    trend: TrendPoint[];
    activity: ActivityEntry[];
  };
}

const getLogo = (label: string) => {
  switch (label) {
    case "GPT-4":
      return "/images/chatgpt.svg";
    case "Claude":
      return "/images/claude.svg";
    case "Gemini":
      return "/images/gemini.svg";
    case "Perplexity":
      return "/images/perplexity.svg";
    default:
      throw new Error(`Unknown model: ${label}`);
  }
};
