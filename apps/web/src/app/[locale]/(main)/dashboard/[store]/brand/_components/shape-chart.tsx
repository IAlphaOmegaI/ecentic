"use client";

import type { BaseTickContentProps } from "recharts";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type * as Brand from "@/server/app/intelligence/brand";

export type ShapePoint = {
  dimension: Brand.Dimension;
  label: string;
  level: Brand.DimensionLevel;
  levelLabel: string;
  score: number;
};

const levelColors: Record<Brand.DimensionLevel, string> = {
  weak: "var(--color-error)",
  developing: "var(--color-warning)",
  strong: "var(--color-success)",
};

const ShapeTick = ({
  x,
  y,
  textAnchor,
  payload,
  data,
}: BaseTickContentProps & { data: ShapePoint[] }) => {
  const point = data.find((entry) => entry.label === String(payload.value));
  if (!point) return null;

  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        fill="var(--color-foreground)"
        fontSize={11}
        fontWeight={500}
      >
        {point.label}
      </text>
      <text
        x={x}
        y={Number(y) + 13}
        textAnchor={textAnchor}
        fill={levelColors[point.level]}
        fontSize={9}
        fontWeight={600}
        letterSpacing="0.06em"
      >
        {point.levelLabel.toUpperCase()}
      </text>
    </g>
  );
};

export const VisibilityShapeChart = ({ data }: { data: ShapePoint[] }) => (
  <div className="min-h-72 w-full flex-1">
    <ResponsiveContainer width="100%" height={288}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="62%">
        <PolarGrid stroke="var(--color-accent-foreground)" />
        <PolarAngleAxis
          dataKey="label"
          tick={(props: BaseTickContentProps) => (
            <ShapeTick {...props} data={data} />
          )}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          dataKey="score"
          stroke="var(--color-primary)"
          strokeWidth={1.5}
          fill="var(--color-primary)"
          fillOpacity={0.12}
          dot={{ r: 2.5, fill: "var(--color-primary)" }}
          isAnimationActive={false}
        />
      </RadarChart>
    </ResponsiveContainer>
  </div>
);
