"use client";

import { ArrowRightIcon, DownloadIcon, PlusIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Link from "next/link";
import { useState } from "react";
import {
  activityFeed,
  overallWinRate,
  products,
  winRateTrend,
} from "@/lib/mock-data";

const WinRateBar = ({ rate, max = 100 }: { rate: number; max?: number }) => {
  const color = (() => {
    switch (true) {
      case rate >= 60:
        return "bg-success";
      case rate >= 30:
        return "bg-warning";
      default:
        return "bg-error";
    }
  })();

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-accent-foreground h-1.5">
        <div
          className={cn("h-full transition-all", color)}
          style={{ width: `${(rate / max) * 100}%` }}
        />
      </div>
      <span className="w-8 text-right font-medium text-foreground text-xs">
        {rate}%
      </span>
    </div>
  );
};

const StatusBadge = ({
  status,
}: {
  status: "optimized" | "pending" | "unoptimized";
}) => {
  const styles = (() => {
    switch (status) {
      case "optimized":
        return "bg-success/10 text-success";
      case "pending":
        return "bg-warning/10 text-warning";
      case "unoptimized":
        return "bg-error/10 text-error";
    }
  })();

  const label = (() => {
    switch (status) {
      case "optimized":
        return "Optimized";
      case "pending":
        return "Pending";
      case "unoptimized":
        return "Unoptimized";
    }
  })();

  return (
    <span className={cn("px-1.5 py-0.5 text-xs font-medium", styles)}>
      {label}
    </span>
  );
};

const ActivityIcon = ({ type }: { type: string }) => {
  const icon = (() => {
    switch (type) {
      case "optimization_published":
        return "✓";
      case "simulation_complete":
        return "↻";
      case "drift":
        return "⚠";
      case "competitor":
        return "+";
      default:
        return "·";
    }
  })();

  const color = (() => {
    switch (type) {
      case "optimization_published":
        return "bg-success/10 text-success";
      case "simulation_complete":
        return "bg-primary/10 text-primary";
      case "drift":
        return "bg-warning/10 text-warning";
      case "competitor":
        return "bg-foreground-dimmed/10 text-foreground-dimmed";
      default:
        return "bg-foreground-dimmed/10 text-foreground-dimmed";
    }
  })();

  return (
    <div
      className={cn(
        "flex size-6 shrink-0 items-center justify-center text-xs font-bold",
        color,
      )}
    >
      {icon}
    </div>
  );
};

const topProducts = [...products].sort((a, b) => b.winRate - a.winRate).slice(0, 5);
const topPerformer = products.reduce((best, product) =>
  product.winRate > best.winRate ? product : best,
);
const biggestOpportunity = products.reduce((worst, product) =>
  product.winRate < worst.winRate ? product : worst,
);

const modelWinRates = [
  {
    model: "GPT-4",
    rate: Math.round(products.reduce((sum, product) => sum + product.gpt4WinRate, 0) / products.length),
  },
  {
    model: "Claude",
    rate: Math.round(products.reduce((sum, product) => sum + product.claudeWinRate, 0) / products.length),
  },
  {
    model: "Gemini",
    rate: Math.round(products.reduce((sum, product) => sum + product.geminiWinRate, 0) / products.length),
  },
] as const;

const trendData: Record<string, number[]> = {
  "7d": [38, 40, 39, 42, 41, 43, 43],
  "30d": [28, 30, 29, 32, 31, 34, 33, 35, 36, 38, 37, 39, 38, 40, 39, 41, 40, 42, 41, 43, 42, 43, 44, 43, 44, 43, 44, 43, 43, 43],
  "90d": [20, 22, 21, 23, 22, 24, 23, 25, 24, 26, 25, 27, 26, 27, 28, 27, 29, 28, 30, 29, 31, 30, 32, 31, 33, 32, 33, 34, 33, 34, 35, 34, 35, 36, 35, 37, 36, 37, 38, 37, 38, 39, 38, 39, 38, 40, 39, 40, 39, 40, 41, 40, 41, 40, 42, 41, 42, 41, 42, 41, 43, 42, 43, 42, 43, 44, 43, 44, 43, 44, 43, 43, 44, 43, 43, 43, 43, 43, 43, 43, 42, 43, 43, 42, 43, 43, 43, 43, 43, 43],
};

const trendLabels: Record<string, string[]> = {
  "7d": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "30d": Array.from({ length: 30 }, (_, i) => i === 0 ? "30d ago" : i === 29 ? "Today" : `${30 - i}d ago`),
  "90d": Array.from({ length: 90 }, (_, i) => i === 0 ? "90d ago" : i === 89 ? "Today" : `${90 - i}d ago`),
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
  const W = 600;
  const H = 80;
  const PAD_Y = 8;
  const minV = Math.min(...data) - 4;
  const maxV = Math.max(...data) + 4;
  const toX = (i: number) => (i / (data.length - 1)) * W;
  const toY = (v: number) => H - PAD_Y - ((v - minV) / (maxV - minV)) * (H - 2 * PAD_Y);
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
          <line key={pos} x1={0} y1={H * pos} x2={W} y2={H * pos} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        ))}
        <path d={areaPath} fill="url(#winAreaGrad)" />
        <path d={linePath} fill="none" stroke="rgb(21,114,250)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {hoverIndex !== null && (
          <>
            <line x1={pts[hoverIndex][0]} y1={0} x2={pts[hoverIndex][0]} y2={H} stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
            <circle cx={pts[hoverIndex][0]} cy={pts[hoverIndex][1]} r="3" fill="white" stroke="rgb(21,114,250)" strokeWidth="2" />
          </>
        )}
      </svg>
      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute -top-8 z-10 -translate-x-1/2 whitespace-nowrap border border-accent-foreground bg-background-rich px-2 py-1 text-xs text-foreground shadow-sm"
          style={{ left: `${(hoverIndex / (data.length - 1)) * 100}%` }}
        >
          {labels[hoverIndex]} · <span className="font-medium text-primary">{data[hoverIndex]}%</span>
        </div>
      )}
    </div>
  );
};

export default () => {
  const [activePeriod, setActivePeriod] = useState<"7d" | "30d" | "90d">("7d");
  return (
  <div className="p-6">
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="font-medium text-xl text-foreground">Overview</h1>
        <p className="font-light text-foreground-dimmed text-sm">
          Last updated: 2 hours ago
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 border border-accent-foreground bg-background-rich px-3 py-1.5 text-foreground text-sm transition-colors hover:bg-background-dimmed"
        >
          <DownloadIcon className="size-3.5" />
          Export
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90"
        >
          <PlusIcon className="size-3.5" />
          Run Simulation
        </button>
      </div>
    </div>

    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="border border-accent-foreground bg-background-rich p-4">
        <p className="mb-1 font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Overall Win Rate
        </p>
        <div className="flex items-end gap-2">
          <p className="font-semibold text-4xl text-foreground">
            {overallWinRate}%
          </p>
          <p
            className={cn(
              "mb-1 text-sm font-medium",
              winRateTrend >= 0 ? "text-success" : "text-error",
            )}
          >
            {winRateTrend >= 0 ? "↑" : "↓"} {Math.abs(winRateTrend)}% vs last week
          </p>
        </div>
        <div className="mt-3">
          <WinRateLineChart
            data={[28, 31, 35, 33, 38, 40, 43]}
            labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
            className="h-8"
          />
        </div>
      </div>

      <div className="border border-accent-foreground bg-background-rich p-4">
        <p className="mb-1 font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Products Scanned
        </p>
        <div className="flex items-end gap-2">
          <p className="font-semibold text-4xl text-foreground">
            {products.length}
          </p>
          <p className="mb-1 font-light text-foreground-dimmed text-sm">
            / 100
          </p>
        </div>
        <div className="mt-3 h-1.5 w-full bg-accent-foreground">
          <div
            className="h-full bg-primary"
            style={{ width: `${(products.length / 100) * 100}%` }}
          />
        </div>
        <p className="mt-1 font-light text-foreground-dimmed text-xs">
          {100 - products.length} product slots remaining
        </p>
      </div>

      <div className="border border-accent-foreground bg-background-rich p-4">
        <p className="mb-1 font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Top Performer
        </p>
        <p className="font-medium text-foreground text-base leading-tight">
          {topPerformer.title}
        </p>
        <p className="mt-1 font-semibold text-2xl text-success">
          {topPerformer.winRate}%
        </p>
        <p className="font-light text-foreground-dimmed text-xs">win rate</p>
        <Link
          href={`/dashboard/products/${topPerformer._id}`}
          className="mt-2 flex items-center gap-1 font-light text-primary text-xs hover:underline"
        >
          View details <ArrowRightIcon className="size-3" />
        </Link>
      </div>

      <div className="border border-accent-foreground bg-background-rich p-4">
        <p className="mb-1 font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Biggest Opportunity
        </p>
        <p className="font-medium text-foreground text-base leading-tight">
          {biggestOpportunity.title}
        </p>
        <p className="mt-1 font-semibold text-2xl text-error">
          {biggestOpportunity.winRate}%
        </p>
        <p className="font-light text-foreground-dimmed text-xs">win rate now</p>
        <Link
          href={`/dashboard/products/${biggestOpportunity._id}`}
          className="mt-2 flex items-center gap-1 font-light text-primary text-xs hover:underline"
        >
          Optimize now <ArrowRightIcon className="size-3" />
        </Link>
      </div>
    </div>

    <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="border border-accent-foreground bg-background-rich p-8 xl:col-span-2">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="font-light text-foreground-dimmed text-xs uppercase tracking-widest">Performance</p>
            <p className="mt-1 font-medium text-foreground text-lg">Win Rate by Model</p>
          </div>
          <div className="flex border border-accent-foreground">
            {(["7d", "30d", "90d"] as const).map((period, index) => (
              <button
                key={period}
                type="button"
                onClick={() => setActivePeriod(period)}
                className={cn(
                  "px-3 py-1 text-xs transition-colors",
                  activePeriod === period
                    ? "bg-primary text-white"
                    : "text-foreground-dimmed hover:text-foreground",
                  index !== 0 && "border-accent-foreground border-l",
                )}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Model stats — big numbers */}
        <div className="mb-10 grid grid-cols-3 divide-x divide-accent-foreground">
          {modelWinRates.map(({ model, rate }) => (
            <div key={model} className="flex flex-col items-center gap-1 px-6 first:pl-0 last:pr-0">
              <span className="font-light text-foreground-dimmed text-xs uppercase tracking-widest">{model}</span>
              <span className="font-semibold text-4xl text-foreground tabular-nums">{rate}<span className="text-xl font-light text-foreground-dimmed">%</span></span>
              <div className="mt-2 h-0.5 w-full bg-accent-foreground">
                <div className="h-full bg-primary transition-all" style={{ width: `${rate}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Trend chart */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-light text-foreground-dimmed text-xs uppercase tracking-widest">{activePeriod} Trend</p>
            <span className="font-medium text-primary text-xs">↑ +15%</span>
          </div>
          <WinRateLineChart data={trendData[activePeriod]} labels={trendLabels[activePeriod]} />
          <div className="mt-2 flex justify-between font-light text-foreground-dimmed text-xs">
            <span>{trendLabels[activePeriod][0]}</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="border border-accent-foreground bg-background-rich p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium text-foreground text-sm">Recent Activity</p>
          </div>
          <div className="flex flex-col gap-3">
            {activityFeed.slice(0, 4).map((entry) => (
              <div key={entry._id} className="flex items-start gap-2">
                <ActivityIcon type={entry.type} />
                <div>
                  <p className="font-light text-foreground text-xs leading-relaxed">
                    {entry.message}
                  </p>
                  <p className="font-light text-foreground-dimmed text-xs">
                    {entry.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-warning/20 bg-warning/5 p-4">
          <p className="mb-1 font-medium text-foreground text-sm">
            Model drift detected
          </p>
          <p className="font-light text-foreground-dimmed text-xs">
            Claude updated its behavior — 7 products affected. Win rate change:
            avg −4%.
          </p>
          <Link
            href="/dashboard/optimize"
            className="mt-2 flex items-center gap-1 font-medium text-primary text-xs hover:underline"
          >
            Re-optimize affected products <ArrowRightIcon className="size-3" />
          </Link>
        </div>
      </div>
    </div>

    <div className="border border-accent-foreground bg-background-rich">
      <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-3">
        <p className="font-medium text-foreground text-sm">
          Product Win Rates
        </p>
        <Link
          href="/dashboard/products"
          className="flex items-center gap-1 font-light text-primary text-xs hover:underline"
        >
          View all products <ArrowRightIcon className="size-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-accent-foreground border-b">
              {["Product", "Win Rate", "GPT-4", "Claude", "Gemini", "vs. Top Competitor", "Status", ""].map(
                (header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left font-light text-foreground-dimmed text-sm"
                  >
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {topProducts.map((product) => (
              <tr
                key={product._id}
                className="border-accent-foreground border-b last:border-b-0 hover:bg-background-dimmed/50"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground text-sm">
                    {product.title}
                  </p>
                  <p className="font-light text-foreground-dimmed text-xs">
                    {product.category}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-accent-foreground h-1">
                      <div
                        className={cn(
                          "h-full",
                          product.winRate >= 60
                            ? "bg-success"
                            : product.winRate >= 30
                              ? "bg-warning"
                              : "bg-error",
                        )}
                        style={{ width: `${product.winRate}%` }}
                      />
                    </div>
                    <span className="font-medium text-foreground text-xs">
                      {product.winRate}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-light text-foreground text-xs">
                  {product.gpt4WinRate}%
                </td>
                <td className="px-4 py-3 font-light text-foreground text-xs">
                  {product.claudeWinRate}%
                </td>
                <td className="px-4 py-3 font-light text-foreground text-xs">
                  {product.geminiWinRate}%
                </td>
                <td className="px-4 py-3">
                  <p className="font-light text-foreground-dimmed text-xs">
                    {product.topCompetitor}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-medium",
                      product.winRate > product.competitorWinRate
                        ? "text-success"
                        : "text-error",
                    )}
                  >
                    {product.winRate > product.competitorWinRate ? "+" : ""}
                    {product.winRate - product.competitorWinRate}%
                  </p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={product.optimizationStatus} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/products/${product._id}`}
                    className="font-light text-primary text-xs hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
};
