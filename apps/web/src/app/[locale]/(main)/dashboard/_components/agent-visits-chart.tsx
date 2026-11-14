"use client";

import { CommerceChartActivity_2Icon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useLocale, useTranslations } from "next-intl";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrafficTimeSeriesPoint } from "@/server/app/tracking";

// The accessor groups provider families, including their crawlers. These are
// deliberately not labelled as visits from the corresponding chat products.
const PROVIDERS = [
  { key: "chatgpt", label: "OpenAI", color: "var(--color-primary)" },
  { key: "claude", label: "Anthropic", color: "var(--color-warning)" },
  { key: "gemini", label: "Google", color: "var(--color-success)" },
] as const;

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
  const translate = useTranslations("dashboard.traffic.chart");
  const number = new Intl.NumberFormat(locale);
  const compactNumber = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const maximum = Math.max(
    0,
    ...data.flatMap((point) => [point.chatgpt, point.claude, point.gemini]),
  );
  const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });

  return (
    <figure className={cn("m-0 min-w-0", className)}>
      <figcaption>
        <h3 className="font-semibold text-base text-foreground-rich">
          {translate("title")}
        </h3>
        <p className="mt-1 text-foreground-dimmed text-sm leading-5">
          {translate("scope")}
        </p>
      </figcaption>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {PROVIDERS.map((provider) => (
          <li key={provider.key} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="h-0.5 w-4"
              style={{ backgroundColor: provider.color }}
            />
            <span className="text-foreground">{provider.label}</span>
          </li>
        ))}
      </ul>

      {maximum === 0 ? (
        <div className="flex min-h-56 flex-col justify-center gap-3 py-6">
          <CommerceChartActivity_2Icon
            aria-hidden
            className="size-8 text-primary"
          />
          <p className="max-w-sm text-foreground-dimmed text-sm leading-6">
            {translate("empty")}
          </p>
        </div>
      ) : (
        <div className="mt-6 h-56 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart
              accessibilityLayer
              aria-label={translate("accessibleLabel")}
              data={data}
              margin={{ top: 8, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                stroke="var(--color-accent-foreground)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{
                  fill: "var(--color-foreground-dimmed)",
                  fontSize: "var(--text-xs)",
                }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                interval="preserveStartEnd"
                tickMargin={10}
              />
              <YAxis
                width={38}
                domain={[0, Math.max(1, Math.ceil(maximum * 1.1))]}
                allowDecimals={false}
                tickCount={4}
                tickFormatter={(value: number) => compactNumber.format(value)}
                tick={{
                  fill: "var(--color-foreground-dimmed)",
                  fontSize: "var(--text-xs)",
                }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{
                  stroke: "var(--color-foreground-dimmed)",
                  strokeOpacity: 0.4,
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;

                  return (
                    <div className="rounded-lg border border-background-rich/15 bg-emphasis-dimmed px-4 py-3 text-background-rich shadow-lg">
                      <p className="mb-2 text-background-rich/70 text-xs">
                        {formatDate(String(label))}
                      </p>
                      {PROVIDERS.map((provider) => {
                        const entry = payload.find(
                          (item) => item.dataKey === provider.key,
                        );
                        const value =
                          typeof entry?.value === "number" ? entry.value : 0;

                        return (
                          <div
                            key={provider.key}
                            className="flex items-center justify-between gap-8 py-1 text-sm"
                          >
                            <span>{provider.label}</span>
                            <span className="font-semibold tabular-nums">
                              {number.format(value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />
              {PROVIDERS.map((provider) => (
                <Line
                  key={provider.key}
                  type="linear"
                  dataKey={provider.key}
                  stroke={provider.color}
                  strokeWidth={2}
                  dot={
                    data.length === 1
                      ? { r: 4, fill: provider.color, strokeWidth: 0 }
                      : false
                  }
                  activeDot={{
                    r: 4,
                    fill: "var(--color-background-rich)",
                    stroke: provider.color,
                    strokeWidth: 2,
                  }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-3 text-foreground-dimmed text-xs leading-5">
        {translate("hint")}
      </p>
    </figure>
  );
};
