"use client";

import { cn } from "@zenncore/utils";
import { useLocale } from "next-intl";
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
import type { TrafficTimeSeriesPoint } from "@/server/app/tracking";

const MODELS = [
  {
    key: "chatgpt" as const,
    label: "ChatGPT",
    color: "var(--color-primary)",
    logo: "/images/chatgpt.svg",
  },
  {
    key: "claude" as const,
    label: "Claude",
    color: "var(--color-warning)",
    logo: "/images/claude.svg",
  },
  {
    key: "gemini" as const,
    label: "Gemini",
    color: "var(--color-success)",
    logo: "/images/gemini.svg",
  },
  {
    key: "perplexity" as const,
    label: "Perplexity",
    color: "var(--color-info)",
    logo: "/images/perplexity.svg",
  },
];

const formatDate = (date: string, locale: string) => {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString(locale, { month: "short", day: "numeric" });
};

export namespace AgentVisitsChart {
  export type Props = {
    data: TrafficTimeSeriesPoint[];
    className?: string;
  };
}

export const AgentVisitsChart = ({
  data,
  className,
}: AgentVisitsChart.Props) => {
  const locale = useLocale();
  const maximum = Math.max(
    1,
    ...data.map((point) => point.chatgpt + point.claude + point.gemini),
  );

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-6">
        {MODELS.map((model) => (
          <div key={model.key} className="flex items-center gap-2">
            <Image
              src={model.logo}
              alt={model.label}
              width={16}
              height={16}
              className="size-4"
            />
            <span className="text-foreground-dimmed text-sm">
              {model.label}
            </span>
          </div>
        ))}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 6, right: 0, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              stroke="var(--color-foreground-dimmed)"
              strokeOpacity={0.14}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => formatDate(value, locale)}
              tick={{
                fill: "var(--color-foreground-dimmed)",
                fontSize: 11,
              }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              hide
              domain={[0, Math.ceil(maximum * 1.1)]}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{
                stroke: "var(--color-foreground-dimmed)",
                strokeOpacity: 0.35,
              }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;

                return (
                  <div className="rounded-md border border-accent-foreground bg-background-rich px-3 py-2 shadow-md">
                    <p className="mb-1.5 text-foreground-dimmed text-xs">
                      {formatDate(String(label), locale)}
                    </p>
                    {MODELS.map((model) => {
                      const entry = payload.find(
                        (item) => item.dataKey === model.key,
                      );
                      const value =
                        typeof entry?.value === "number" ? entry.value : 0;

                      return (
                        <div
                          key={model.key}
                          className="flex items-center justify-between gap-6 py-0.5"
                        >
                          <div className="flex items-center gap-2">
                            <Image
                              src={model.logo}
                              alt={model.label}
                              width={20}
                              height={20}
                              className="size-5"
                            />
                            <span className="text-foreground text-sm">
                              {model.label}
                            </span>
                          </div>
                          <span className="font-medium text-foreground-rich text-sm tabular-nums">
                            {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            {MODELS.map((model) => (
              <Area
                key={model.key}
                type="monotone"
                dataKey={model.key}
                stroke={model.color}
                strokeWidth={1.5}
                fill="var(--color-primary)"
                fillOpacity={0.08}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "var(--color-background-rich)",
                  stroke: model.color,
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
