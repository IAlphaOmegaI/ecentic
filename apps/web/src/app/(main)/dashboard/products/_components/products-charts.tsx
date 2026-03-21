"use client";

import { BoxMinusIcon, TrendDownIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { motion } from "motion/react";
import Image from "next/image";
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

const modelBarColors: Record<string, string> = {
  "GPT-4": "bg-blue-500",
  Claude: "bg-orange-500",
  Gemini: "bg-green-500",
};

const getLogo = (label: string) => {
  switch (label) {
    case "GPT-4":
      return "/images/chatgpt.svg";
    case "Claude":
      return "/images/claude.svg";
    case "Gemini":
      return "/images/gemini.svg";
    default:
      throw new Error(`Unknown model: ${label}`);
  }
};

export namespace ProductsModelRates {
  export type Props = {
    models: { label: string; rate: number }[];
  };
}

export const ProductsModelRates = ({ models }: ProductsModelRates.Props) => {
  if (models.length === 0)
    return (
      <p className="flex h-26 flex-col items-center justify-center gap-2 text-foreground-dimmed">
        <BoxMinusIcon className="size-12" />
        Run a simulation to see per-model performance.
      </p>
    );

  return (
    <div className="grid grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-y px-4">
      {models.map(({ label, rate }) => (
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
                className="size-6"
              />
              <span className="text-foreground-dimmed uppercase tracking-widest">
                {label}
              </span>
            </div>
            <span className="font-medium text-4xl text-foreground tabular-nums">
              {rate}{" "}
              <span className="font-light text-foreground-dimmed text-xl">
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
      ))}
    </div>
  );
};

export namespace QualityDistribution {
  export type Props = {
    segments: { label: string; count: number; color: string }[];
    total: number;
    averageQuality: number;
  };
}

export const QualityDistribution = ({
  segments,
  total,
  averageQuality,
}: QualityDistribution.Props) => (
  <div className="p-4 size-full flex flex-col">
    <div className="flex items-start justify-between">
      <div>
        <p className="font-medium text-2xl text-foreground">
          Quality Distribution
        </p>
      </div>
      <div className="text-right">
        <span className="font-medium text-4xl text-foreground tabular-nums">
          {averageQuality}
          <span className="font-light text-foreground-dimmed text-xl">%</span>
        </span>
        <p className="font-light text-foreground-dimmed text-sm">
          avg. quality
        </p>
      </div>
    </div>

    <div className="flex h-2 w-full overflow-hidden bg-accent-foreground mt-auto">
      {segments.map((segment) => {
        const width = total > 0 ? (segment.count / total) * 100 : 0;
        if (width === 0) return null;

        return (
          <motion.div
            key={segment.label}
            className={cn("h-full", segment.color)}
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            transition={{ ...Spring.Gentle, delay: 0.3 }}
          />
        );
      })}
    </div>

    <div className="mt-4 grid grid-cols-3 gap-4">
      {segments.map((segment) => (
        <div key={segment.label} className="flex items-center gap-2">
          <div className={cn("size-2.5 shrink-0", segment.color)} />
          <span className="font-light text-foreground-dimmed text-xs">
            {segment.label}
          </span>
          <span className="ml-auto font-medium text-foreground text-sm tabular-nums">
            {segment.count}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export namespace OptimizationBreakdown {
  export type Props = {
    optimized: number;
    pending: number;
    unoptimized: number;
    total: number;
  };
}

export const OptimizationBreakdown = ({
  optimized,
  pending,
  unoptimized,
  total,
}: OptimizationBreakdown.Props) => {
  const segments = [
    { label: "Optimized", count: optimized, color: "bg-success" },
    { label: "Pending", count: pending, color: "bg-warning" },
    { label: "Unoptimized", count: unoptimized, color: "bg-error" },
  ];

  return (
    <div className="p-4">
      <p className="font-medium text-2xl text-foreground">Product Readiness</p>

      <div className="mt-6 flex h-2 w-full overflow-hidden bg-accent-foreground">
        {segments.map((segment) => {
          const width = total > 0 ? (segment.count / total) * 100 : 0;
          if (width === 0) return null;

          return (
            <motion.div
              key={segment.label}
              className={cn("h-full", segment.color)}
              initial={{ width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{ ...Spring.Gentle, delay: 0.3 }}
            />
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {segments.map((segment) => (
          <div key={segment.label}>
            <div className="flex items-center gap-2">
              <div className={cn("size-2.5 shrink-0", segment.color)} />
              <span className="font-light text-foreground-dimmed text-sm">
                {segment.label}
              </span>
            </div>
            <p className="mt-1 ml-4.5 font-medium text-2xl text-foreground tabular-nums">
              {segment.count}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export namespace ProductsWinRateTrend {
  export type Props = {
    data: number[];
    labels: string[];
    change: number;
  };
}

export const ProductsWinRateTrend = ({
  data,
  labels,
  change,
}: ProductsWinRateTrend.Props) => {
  if (data.length < 2)
    return (
      <div className="flex h-64 min-h-64 flex-col items-center justify-center gap-2 text-center text-foreground-dimmed">
        <TrendDownIcon className="size-24" />
        Not enough data for trend. <br />
        Run more simulations to see history.
      </div>
    );

  const chart = data.map((winRate, index) => ({
    label: labels[index] ?? "",
    winRate,
  }));

  const [minimum, maximum] = (() => {
    const minimum = Math.min(...data);
    const maximum = Math.max(...data);
    const padding = minimum === maximum ? 6 : 4;
    return [minimum - padding, maximum + padding];
  })();

  return (
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
      <div className="h-64 min-h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chart}
            margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="products-win-rate-area"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
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
                    <span className="text-foreground">{label} </span>
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
              fill="url(#products-win-rate-area)"
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
      {labels.length >= 2 && (
        <div className="mt-2 flex justify-between px-4 font-light text-foreground-dimmed text-xs">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  );
};
