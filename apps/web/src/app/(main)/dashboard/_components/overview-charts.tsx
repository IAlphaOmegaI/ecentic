"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Spring, Stagger } from "@/lib/animations";
import { formatRelativeTime } from "@/lib/date";
import Image from "next/image";
import { BoxMinusIcon } from "@zenncore/icons";

type ModelRate = { label: string; rate: number };
type TrendPoint = { date: string; winRate: number };
type ActivityEntry = {
  id: string;
  type: "simulation_complete" | "simulation_running";
  message: string;
  detail: string | null;
  timestamp: string;
};

const modelBarColors: Record<string, string> = {
  "GPT-4": "bg-blue-500",
  Claude: "bg-orange-500",
  Gemini: "bg-green-500",
};

const ActivityIcon = ({ type }: { type: string }) => {
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
        "flex size-6 shrink-0 items-center justify-center font-bold text-xs",
        color,
      )}
    >
      {icon}
    </div>
  );
};

const WinRateLineChart = ({
  data,
  labels,
  className = "h-20",
}: {
  data: number[];
  labels: string[];
  className?: string;
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length < 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-foreground-dimmed text-sm",
          className,
        )}
      >
        Not enough data for trend
      </div>
    );
  }

  const W = 600;
  const H = 80;
  const PAD_Y = 8;
  const minV = Math.min(...data) - 4;
  const maxV = Math.max(...data) + 4;
  const toX = (i: number) => (i / (data.length - 1)) * W;
  const toY = (v: number) =>
    H - PAD_Y - ((v - minV) / (maxV - minV)) * (H - 2 * PAD_Y);
  const pts: [number, number][] = data.map((v, i) => [toX(i), toY(v)]);
  const linePath = pts.reduce((d, [x, y], i) => {
    if (i === 0) return `M ${x},${y}`;
    const [px, py] = pts[i - 1];
    const cpx = (px + x) / 2;
    return `${d} C ${cpx},${py} ${cpx},${y} ${x},${y}`;
  }, "");
  const areaPath = `${linePath} L ${W},${H} L 0,${H} Z`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`${className} w-full overflow-visible`}
        preserveAspectRatio="none"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          const index = Math.round((x / W) * (data.length - 1));
          setHoverIndex(Math.max(0, Math.min(data.length - 1, index)));
        }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="winAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(21,114,250)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="rgb(21,114,250)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((pos) => (
          <line
            key={pos}
            x1={0}
            y1={H * pos}
            x2={W}
            y2={H * pos}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
        ))}
        <path d={areaPath} fill="url(#winAreaGrad)" />
        <path
          d={linePath}
          fill="none"
          stroke="rgb(21,114,250)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {hoverIndex !== null && (
          <line
            x1={pts[hoverIndex][0]}
            y1={0}
            x2={pts[hoverIndex][0]}
            y2={H}
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeWidth="1"
          />
        )}
      </svg>
      {hoverIndex !== null && (
        <>
          <div
            className="pointer-events-none absolute z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-white"
            style={{
              left: `${(pts[hoverIndex][0] / W) * 100}%`,
              top: `${(pts[hoverIndex][1] / H) * 100}%`,
            }}
          />
          <div
            className="pointer-events-none absolute -top-8 z-10 -translate-x-1/2 whitespace-nowrap border border-accent-foreground bg-background-rich px-2 py-1 text-foreground text-xs shadow-sm"
            style={{ left: `${(hoverIndex / (data.length - 1)) * 100}%` }}
          >
            {labels[hoverIndex]} ·{" "}
            <span className="font-medium text-primary">
              {data[hoverIndex]}%
            </span>
          </div>
        </>
      )}
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
            <p className="mt-1 font-medium text-foreground text-2xl">
              Win Rate by Model
            </p>
          </div>
        </div>

        {models.length > 0 ? (
          <div className="grid grid-cols-3 divide-x divide-accent-foreground border-y border-accent-foreground px-4">
            {models.map(({ label, rate }) => {
              return (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 p-6 first:pl-0 last:pr-0"
                >
                  <div className="flex flex-row items-center justify-between w-full">
                    <div className="flex items-baseline gap-2">
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
              );
            })}
          </div>
        ) : (
          <p className="text-foreground-dimmed h-26 flex flex-col items-center justify-center border-y border-accent-foreground px-4 gap-2">
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

      {/* Right column — activity */}
      <div className="flex flex-col gap-px bg-accent-foreground [&>*:last-child]:flex-1">
        <motion.div
          className="bg-background-dimmed p-4"
          variants={Stagger.Item}
          initial="hidden"
          animate="visible"
          transition={{ delayChildren: 0.3 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium text-base text-foreground">
              Recent Activity
            </p>
          </div>
          {activity.length === 0 ? (
            <p className="font-light text-foreground-dimmed text-sm">
              No activity yet. Run your first simulation to see results here.
            </p>
          ) : (
            <motion.div
              className="flex flex-col gap-3"
              variants={Stagger.Container(0.06)}
              initial="hidden"
              animate="visible"
              transition={{ delayChildren: 0.4 }}
            >
              {activity.map((entry) => (
                <motion.div
                  key={entry.id}
                  className="flex items-start gap-2"
                  variants={Stagger.Item}
                >
                  <ActivityIcon type={entry.type} />
                  <div>
                    <p className="font-light text-foreground text-xs leading-relaxed">
                      {entry.message}
                    </p>
                    {entry.detail && (
                      <p className="mt-0.5 font-light text-foreground-dimmed text-xs">
                        {entry.detail}
                      </p>
                    )}
                    <p className="font-light text-foreground-dimmed text-xs">
                      {formatRelativeTime(new Date(entry.timestamp))}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="bg-background-dimmed p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...Spring.Gentle, delay: 0.5 }}
        >
          <p className="mb-3 font-medium text-base text-foreground">
            Quick Actions
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              color="primary"
              render={<Link href="/dashboard/products" />}
            >
              View all products <ArrowRightIcon className="size-3" />
            </Button>
            <Button
              variant="ghost"
              color="primary"
              render={<Link href="/dashboard/optimize" />}
            >
              View pending optimizations <ArrowRightIcon className="size-3" />
            </Button>
          </div>
        </motion.div>
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
    default:
      throw new Error(`Unknown model: ${label}`);
  }
};
