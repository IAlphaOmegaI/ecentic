"use client";

import {
  ArrowRightIcon,
  BellIcon,
  BoxMinusIcon,
  TrendDownIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
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
  "GPT-4": "bg-blue-500",
  Claude: "bg-orange-500",
  Gemini: "bg-green-500",
  Perplexity: "bg-teal-500",
};

const ActivityIcon = ({
  type,
  className,
}: {
  type: string;
  className?: string;
}) => {
  const icon = (() => {
    switch (type) {
      case "simulation_complete":
        return "✓";
      case "simulation_running":
        return "↻";
      default:
        return "·";
    }
  })();
  const color = (() => {
    switch (type) {
      case "simulation_complete":
        return "bg-success/10 text-success";
      case "simulation_running":
        return "bg-primary/10 text-primary";
      default:
        return "bg-foreground-dimmed/10 text-foreground-dimmed";
    }
  })();
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 items-center justify-center text-2xl",
        className,
        color,
      )}
    >
      {icon}
    </div>
  );
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
    const values = data;
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const padding = minimum === maximum ? 6 : 4;

    return [minimum - padding, maximum + padding];
  })();

  return (
    <div className={cn("h-64 min-h-64 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chart}
          margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="win-rate-area" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-primary)"
                stopOpacity={0.22}
              />
              <stop
                offset="100%"
                stopColor="var(--color-primary)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--color-foreground-dimmed)"
            strokeOpacity={0.14}
            vertical={false}
          />
          <XAxis dataKey="label" hide />
          <YAxis hide domain={[minimum, maximum]} />
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
                <div className="whitespace-nowrap border border-accent-foreground bg-background-rich px-2 py-1 shadow-sm">
                  <span className="text-foreground">{label}</span>
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
            fill="url(#win-rate-area)"
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
  const data = trend.map((point) => point.winRate);
  const labels = trend.map((point) => formatRelativeTime(new Date(point.date)));

  const change = (() => {
    if (data.length < 2) return 0;
    return (data[data.length - 1] ?? 0) - (data[0] ?? 0);
  })();

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
      <div className="bg-background-dimmed xl:col-span-2">
        <div className="flex items-start justify-between p-4">
          <div>
            <p className="font-light text-foreground-dimmed uppercase tracking-widest">
              Performance
            </p>
            <p className="mt-1 font-medium text-2xl text-foreground">
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
                        className="size-4"
                      />
                      <span className="text-foreground-dimmed uppercase tracking-widest">
                        {label}
                      </span>
                    </div>
                    <span className="font-medium text-foreground text-lg tabular-nums">
                      {rate}{" "}
                      <span className="font-light text-foreground-dimmed text-sm">
                        %
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 h-1 w-full bg-accent-foreground">
                    <motion.div
                      className={cn("h-full", modelBarColors[label])}
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

        <div>
          <div className="mb-4 flex items-center justify-between p-4">
            <p className="font-light text-foreground-dimmed uppercase tracking-widest">
              Win Rate Trend
            </p>
            {change !== 0 && (
              <span className={cn(change > 0 ? "text-success" : "text-error")}>
                {change > 0 ? "+" : ""}
                {change}%
              </span>
            )}
          </div>
          <WinRateLineChart data={data} labels={labels} />
          {labels.length >= 2 && (
            <div className="mt-2 flex justify-between font-light text-foreground-dimmed text-xs">
              <span>{labels[0]}</span>
              <span>{labels[labels.length - 1]}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-px bg-accent-foreground">
        <div className="flex-1 bg-background-dimmed">
          <div className="mb-2 flex items-center justify-between px-4 pt-4">
            <p className="font-light text-foreground-dimmed uppercase tracking-widest">
              Recent Activity
            </p>
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
                  className="flex items-start gap-2 border-accent-foreground border-b p-4 pb-4 first:border-t last:border-b-0"
                >
                  <ActivityIcon type={entry.type} className="size-6" />
                  <div>
                    <p className="font-light text-foreground leading-relaxed">
                      {entry.message}
                    </p>
                    {entry.detail && (
                      <p className="mt-0.5 font-light text-foreground-dimmed text-sm">
                        {entry.detail.impactDescription.slice(0, 100)}...
                      </p>
                    )}
                    <p className="mt-2 font-light text-primary-dimmed text-xs">
                      {formatRelativeTime(new Date(entry.timestamp))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between bg-background-dimmed p-4">
          <Button
            variant="outline"
            color="accent"
            render={<Link href="/dashboard/optimize" />}
          >
            Optimizations
          </Button>
          <Button
            variant="outline"
            color="primary"
            render={<Link href="/dashboard/products" />}
          >
            View all products <ArrowRightIcon className="size-4" />
          </Button>
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
