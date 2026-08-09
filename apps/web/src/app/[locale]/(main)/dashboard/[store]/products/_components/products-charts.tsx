"use client";

import { BoxMinusIcon, TrendDownIcon, TrendUpIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { motion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
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
import { SectionKicker } from "../../../_components/grid";

const modelBarColors: Record<string, string> = {
  ChatGPT: "bg-primary",
  Claude: "bg-warning",
  Gemini: "bg-success",
  Perplexity: "bg-info",
};

const getLogo = (label: string) => {
  switch (label) {
    case "ChatGPT":
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

export namespace ProductsModelRates {
  export type Props = {
    models: { label: string; rate: number }[];
  };
}

export const ProductsModelRates = ({ models }: ProductsModelRates.Props) => {
  const shared = useTranslations("dashboard.shared.performance");

  if (models.length === 0)
    return (
      <p className="flex h-26 flex-col items-center justify-center gap-2 border-accent-foreground border-y px-4 text-foreground-dimmed">
        <BoxMinusIcon className="size-12" />
        {shared("noModelData")}
      </p>
    );

  return (
    // Size to the model count — a hardcoded grid-cols-4 left a phantom empty
    // 4th column with only 3 models.
    <div
      className="grid divide-x divide-accent-foreground border-accent-foreground border-y px-4"
      style={{
        gridTemplateColumns: `repeat(${models.length}, minmax(0, 1fr))`,
      }}
    >
      {models.map(({ label, rate }) => {
        return (
          <div
            key={label}
            className="flex flex-col items-center gap-1 p-6 first:pl-0 last:pr-0"
          >
            <div className="flex w-full flex-row items-center justify-between">
              <Image
                src={getLogo(label)}
                alt={label}
                width={64}
                height={64}
                className="size-8"
              />
              <span className="font-bold text-2xl text-foreground-rich tabular-nums tracking-[-0.02em]">
                {rate}{" "}
                <span className="font-medium text-foreground-dimmed text-sm">
                  %
                </span>
              </span>
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-accent-foreground">
              <motion.div
                className={cn("h-full rounded-full", modelBarColors[label])}
                initial={{ width: 0 }}
                animate={{ width: `${rate}%` }}
                transition={{ ...Spring.Gentle, delay: 0.4 }}
              />
            </div>
          </div>
        );
      })}
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
}: QualityDistribution.Props) => {
  const translate = useTranslations("dashboard.products.quality");

  return (
    <div className="flex size-full flex-col p-4">
      <div className="flex items-start justify-between">
        <div>
          <SectionKicker>{translate("kicker")}</SectionKicker>
          <p className="mt-2 font-semibold text-foreground-rich text-lg">
            {translate("distribution")}
          </p>
        </div>
        <div className="text-right">
          <span className="font-bold text-3xl text-foreground-rich tabular-nums tracking-[-0.02em]">
            {averageQuality}
            <span className="ml-0.5 font-medium text-foreground-dimmed text-lg">
              %
            </span>
          </span>
          <p className="text-foreground-dimmed text-xs">
            {translate("avgQuality")}
          </p>
        </div>
      </div>

      <div className="mt-auto flex h-1 w-full overflow-hidden rounded-full bg-accent-foreground">
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
            <div
              className={cn("size-2 shrink-0 rounded-[2px]", segment.color)}
            />
            <span className="text-foreground-dimmed text-xs">
              {segment.label}
            </span>
            <span className="ml-auto font-semibold text-foreground-rich text-sm tabular-nums">
              {segment.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

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
  const translate = useTranslations("dashboard.products.optimization");
  const segments = [
    { label: translate("optimized"), count: optimized, color: "bg-success" },
    { label: translate("pending"), count: pending, color: "bg-warning" },
    { label: translate("unoptimized"), count: unoptimized, color: "bg-error" },
  ];

  return (
    <div className="flex h-full flex-col p-4">
      <div>
        <SectionKicker>{translate("kicker")}</SectionKicker>
        <p className="mt-2 font-semibold text-foreground-rich text-lg">
          {translate("readiness")}
        </p>
      </div>

      <div className="mt-auto flex h-1 w-full overflow-hidden rounded-full bg-accent-foreground">
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
              <div
                className={cn("size-2 shrink-0 rounded-[2px]", segment.color)}
              />
              <span className="text-foreground-dimmed text-xs">
                {segment.label}
              </span>
            </div>
            <p className="mt-1 ml-4.5 font-bold text-2xl text-foreground-rich tabular-nums tracking-[-0.02em]">
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
  const shared = useTranslations("dashboard.shared.performance");

  if (data.length < 2)
    return (
      <div className="flex h-64 min-h-64 flex-1 flex-col items-center justify-center gap-2 text-center text-foreground-dimmed">
        <TrendDownIcon className="size-24" />
        {shared("notEnoughTrendData")} <br />
        {shared("runMoreSimulationsHint")}
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
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between p-4">
        <p className="text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
          {shared("winRateTrend")}
        </p>
        {change !== 0 && (
          <span
            className={cn(
              "flex items-center gap-1 font-medium text-xs",
              change > 0 ? "text-success" : "text-error",
            )}
          >
            {change > 0 ? (
              <TrendUpIcon className="size-4" />
            ) : (
              <TrendDownIcon className="size-4" />
            )}
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        )}
      </div>
      <div className="h-full min-h-64 w-full flex-1 px-4 pb-4">
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
    </div>
  );
};
