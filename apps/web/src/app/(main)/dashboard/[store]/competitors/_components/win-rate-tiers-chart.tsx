"use client";

import { cn } from "@zenncore/utils";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const tierColors: Record<string, string> = {
  "bg-primary": "var(--color-primary)",
  "bg-info": "var(--color-info)",
  "bg-warning": "var(--color-warning)",
  "bg-error": "var(--color-error)",
};

export namespace WinRateTiersChart {
  export type Tier = {
    label: string;
    count: number;
    color: string;
  };

  export type Props = {
    tiers: Tier[];
    total: number;
  };
}

export const WinRateTiersChart = ({
  tiers,
  total,
}: WinRateTiersChart.Props) => {
  const data = tiers.filter((tier) => tier.count > 0);

  return (
    <div className="flex h-full flex-1 flex-col px-4 pb-4">
      <div className="min-h-56 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {data.map((tier) => (
                <Cell
                  key={tier.label}
                  fill={
                    tierColors[tier.color] ?? "var(--color-foreground-dimmed)"
                  }
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const entry = payload[0];
                if (!entry) return null;

                const share = (() => {
                  if (total <= 0) return null;
                  if (typeof entry.value !== "number") return null;
                  return Math.round((entry.value / total) * 100);
                })();

                return (
                  <div className="flex items-baseline gap-3 whitespace-nowrap rounded-md border border-accent-foreground bg-background-rich px-3 py-1.5 shadow-md">
                    <span className="text-foreground-dimmed text-sm">
                      {entry.name}
                    </span>
                    <span className="font-medium text-foreground-rich tabular-nums">
                      {entry.value}
                      {share !== null && (
                        <span className="ml-1.5 text-foreground-dimmed text-xs">
                          ({share}%)
                        </span>
                      )}
                    </span>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid w-full grid-cols-2 gap-3">
        {tiers.map((tier) => (
          <div key={tier.label} className="flex items-start gap-2">
            <div
              className={cn("mt-1 size-2 shrink-0 rounded-[2px]", tier.color)}
            />
            <div>
              <p className="text-foreground-dimmed text-xs">{tier.label}</p>
              <p className="font-semibold text-foreground-rich text-lg tabular-nums">
                {tier.count}
                <span className="ml-1 font-medium text-foreground-dimmed text-xs">
                  {total > 0
                    ? `(${Math.round((tier.count / total) * 100)}%)`
                    : ""}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
