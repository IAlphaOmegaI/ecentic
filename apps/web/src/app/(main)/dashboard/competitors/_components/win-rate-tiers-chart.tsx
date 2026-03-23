"use client";

import { cn } from "@zenncore/utils";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const tierColors: Record<string, string> = {
  "bg-success": "var(--color-success)",
  "bg-primary": "var(--color-primary)",
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
    <div className="flex flex-col items-center gap-4 h-full">
      <div className="size-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
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

                return (
                  <div className="whitespace-nowrap border border-accent-foreground bg-background-rich px-2 py-1 shadow-sm">
                    <span className="text-foreground">{entry.name} </span>
                    <span className="font-medium text-primary">
                      {entry.value}
                    </span>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 mt-20">
        {tiers.map((tier) => (
          <div key={tier.label} className="flex items-start gap-2">
            <div className={cn("mt-1.5 size-2 shrink-0", tier.color)} />
            <div>
              <p className="font-light text-foreground-dimmed text-sm">
                {tier.label}
              </p>
              <p className="font-medium text-foreground text-lg tabular-nums">
                {tier.count}
                <span className="ml-1 font-light text-foreground-dimmed text-xs">
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
