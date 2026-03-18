"use client";

import { ArrowRightIcon, CircleBoltIcon, DownloadIcon, PlusIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
} from "@zenncore/web/components/tabs";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { HoverLift, Spring, Stagger, Table } from "@/lib/animations";
import {
  activityFeed,
  overallWinRate,
  products,
  winRateTrend,
} from "@/lib/mock-data";
import { SimulationModal } from "./_components/simulation-modal";

const _WinRateBar = ({ rate, max = 100 }: { rate: number; max?: number }) => {
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
      <div className="h-1.5 flex-1 bg-accent-foreground">
        <motion.div
          className={cn("h-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${(rate / max) * 100}%` }}
          transition={{ ...Spring.Gentle, delay: 0.4 }}
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
    <span className={cn("px-1.5 py-0.5 font-medium text-xs", styles)}>
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

const topProducts = [...products]
  .sort((a, b) => b.winRate - a.winRate)
  .slice(0, 5);
const topPerformer = products.reduce((best, product) =>
  product.winRate > best.winRate ? product : best,
);
const biggestOpportunity = products.reduce((worst, product) =>
  product.winRate < worst.winRate ? product : worst,
);
const modelWinRates = [
  {
    model: "GPT-4",
    rate: Math.round(
      products.reduce((sum, p) => sum + p.gpt4WinRate, 0) / products.length,
    ),
  },
  {
    model: "Claude",
    rate: Math.round(
      products.reduce((sum, p) => sum + p.claudeWinRate, 0) / products.length,
    ),
  },
  {
    model: "Gemini",
    rate: Math.round(
      products.reduce((sum, p) => sum + p.geminiWinRate, 0) / products.length,
    ),
  },
] as const;

const trendData: Record<string, number[]> = {
  "7d": [38, 40, 39, 42, 41, 43, 43],
  "30d": [
    28, 30, 29, 32, 31, 34, 33, 35, 36, 38, 37, 39, 38, 40, 39, 41, 40, 42, 41,
    43, 42, 43, 44, 43, 44, 43, 44, 43, 43, 43,
  ],
  "90d": [
    20, 22, 21, 23, 22, 24, 23, 25, 24, 26, 25, 27, 26, 27, 28, 27, 29, 28, 30,
    29, 31, 30, 32, 31, 33, 32, 33, 34, 33, 34, 35, 34, 35, 36, 35, 37, 36, 37,
    38, 37, 38, 39, 38, 39, 38, 40, 39, 40, 39, 40, 41, 40, 41, 40, 42, 41, 42,
    41, 42, 41, 43, 42, 43, 42, 43, 44, 43, 44, 43, 44, 43, 43, 44, 43, 43, 43,
    43, 43, 43, 43, 42, 43, 43, 42, 43, 43, 43, 43, 43, 43,
  ],
};
const trendLabels: Record<string, string[]> = {
  "7d": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "30d": Array.from({ length: 30 }, (_, i) =>
    i === 0 ? "30d ago" : i === 29 ? "Today" : `${30 - i}d ago`,
  ),
  "90d": Array.from({ length: 90 }, (_, i) =>
    i === 0 ? "90d ago" : i === 89 ? "Today" : `${90 - i}d ago`,
  ),
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
          <>
            <line
              x1={pts[hoverIndex][0]}
              y1={0}
              x2={pts[hoverIndex][0]}
              y2={H}
              stroke="currentColor"
              strokeOpacity="0.15"
              strokeWidth="1"
            />
            <circle
              cx={pts[hoverIndex][0]}
              cy={pts[hoverIndex][1]}
              r="3"
              fill="white"
              stroke="rgb(21,114,250)"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute -top-8 z-10 -translate-x-1/2 whitespace-nowrap border border-accent-foreground bg-background-rich px-2 py-1 text-foreground text-xs shadow-sm"
          style={{ left: `${(hoverIndex / (data.length - 1)) * 100}%` }}
        >
          {labels[hoverIndex]} ·{" "}
          <span className="font-medium text-primary">{data[hoverIndex]}%</span>
        </div>
      )}
    </div>
  );
};

export default () => {
  const [activePeriod, setActivePeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [simOpen, setSimOpen] = useState(false);

  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={Spring.Gentle}
    >
      <motion.div
        className="mb-6 flex items-center justify-between"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...Spring.Snappy, delay: 0.05 }}
      >
        <div>
          <h1 className="font-medium text-foreground text-xl">Overview</h1>
          <p className="font-light text-foreground-dimmed text-sm">
            Last updated: 2 hours ago
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            className="flex items-center gap-1.5 border border-accent-foreground bg-background-rich px-3 py-1.5 text-foreground text-sm transition-colors hover:bg-background-dimmed"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={Spring.Snappy}
          >
            <DownloadIcon className="size-4" />
            Export
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setSimOpen(true)}
            className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={Spring.Snappy}
          >
            <PlusIcon className="size-4" />
            Run Simulation
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        className="mb-6 grid grid-cols-1 gap-px border border-accent-foreground bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4"
        variants={Stagger.Container(0.07)}
        initial="hidden"
        animate="visible"
        // biome-ignore lint/style/noCommaOperator: delay offset for stat cards
        transition={{ delayChildren: 0.08 }}
      >
        {/* Overall Win Rate */}
        <motion.div
          className="flex flex-col justify-between bg-background-rich p-5"
          variants={Stagger.Item}
        >
          <div>
            <p className="font-light text-foreground-dimmed text-xs">
              Overall Win Rate
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-semibold text-4xl text-foreground tabular-nums">
                {overallWinRate}%
              </span>
              <span
                className={cn(
                  "font-medium text-xs",
                  winRateTrend >= 0 ? "text-success" : "text-error",
                )}
              >
                {winRateTrend >= 0 ? "+" : "−"}{Math.abs(winRateTrend)}% this week
              </span>
            </div>
          </div>
          <div className="mt-4">
            <WinRateLineChart
              data={[28, 31, 35, 33, 38, 40, 43]}
              labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
              className="h-8"
            />
          </div>
        </motion.div>

        {/* Products Scanned */}
        <motion.div
          className="flex flex-col justify-between bg-background-rich p-5"
          variants={Stagger.Item}
        >
          <div>
            <p className="font-light text-foreground-dimmed text-xs">
              Products Scanned
            </p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-semibold text-4xl text-foreground tabular-nums">
                {products.length}
              </span>
              <span className="font-light text-foreground-dimmed text-sm">
                / 100
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-px w-full bg-accent-foreground">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(products.length / 100) * 100}%` }}
                transition={{ ...Spring.Gentle, delay: 0.35 }}
              />
            </div>
            <p className="mt-2 font-light text-foreground-dimmed text-xs">
              {100 - products.length} slots remaining
            </p>
          </div>
        </motion.div>

        {/* Top Performer */}
        <motion.div
          className="flex flex-col justify-between bg-background-rich p-5"
          variants={Stagger.Item}
        >
          <div>
            <p className="font-light text-foreground-dimmed text-xs">
              Top Performer
            </p>
            <p className="mt-2 font-medium text-foreground text-sm leading-snug">
              {topPerformer.title}
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-semibold text-3xl text-success tabular-nums">
                {topPerformer.winRate}%
              </span>
              <span className="font-light text-foreground-dimmed text-xs">
                win rate
              </span>
            </div>
          </div>
          <Link
            href={`/dashboard/products/${topPerformer._id}`}
            className="mt-4 flex items-center gap-1 font-medium text-foreground-dimmed text-xs transition-colors hover:text-primary"
          >
            View details <ArrowRightIcon className="size-3" />
          </Link>
        </motion.div>

        {/* Biggest Opportunity */}
        <motion.div
          className="flex flex-col justify-between bg-background-rich p-5"
          variants={Stagger.Item}
        >
          <div>
            <p className="font-light text-foreground-dimmed text-xs">
              Biggest Opportunity
            </p>
            <p className="mt-2 font-medium text-foreground text-sm leading-snug">
              {biggestOpportunity.title}
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-semibold text-3xl text-error tabular-nums">
                {biggestOpportunity.winRate}%
              </span>
              <span className="font-light text-foreground-dimmed text-xs">
                win rate
              </span>
            </div>
          </div>
          <Link
            href={`/dashboard/products/${biggestOpportunity._id}`}
            className="mt-4 flex items-center gap-1 font-medium text-foreground-dimmed text-xs transition-colors hover:text-primary"
          >
            Optimize now <ArrowRightIcon className="size-3" />
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...Spring.Gentle, delay: 0.2 }}
      >
        <div className="border border-accent-foreground bg-background-rich p-8 xl:col-span-2">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <p className="font-light text-foreground-dimmed text-xs uppercase tracking-widest">
                Performance
              </p>
              <p className="mt-1 font-medium text-foreground text-lg">
                Win Rate by Model
              </p>
            </div>
            <Tabs
              value={activePeriod}
              onValueChange={(value) =>
                setActivePeriod(value as "7d" | "30d" | "90d")
              }
            >
              <TabsList className="h-auto border border-accent-foreground bg-transparent px-0">
                <TabsIndicator className="top-0 h-full translate-y-0 rounded-none" />
                {(["7d", "30d", "90d"] as const).map((period) => (
                  <Tab
                    key={period}
                    value={period}
                    className="h-auto px-3 py-1 text-foreground-dimmed text-xs data-selected:text-white"
                  >
                    {period}
                  </Tab>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <motion.div
            className="mb-10 grid grid-cols-3 divide-x divide-accent-foreground"
            variants={Stagger.Container(0.08)}
            initial="hidden"
            animate="visible"
            // biome-ignore lint/style/noCommaOperator: delay offset for model stats
            transition={{ delayChildren: 0.25 }}
          >
            {modelWinRates.map(({ model, rate }) => (
              <motion.div
                key={model}
                className="flex flex-col items-center gap-1 px-6 first:pl-0 last:pr-0"
                variants={Stagger.Item}
              >
                <span className="font-light text-foreground-dimmed text-xs uppercase tracking-widest">
                  {model}
                </span>
                <motion.span
                  className="font-semibold text-4xl text-foreground tabular-nums"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...Spring.Gentle, delay: 0.3 }}
                >
                  {rate}
                  <span className="font-light text-foreground-dimmed text-xl">
                    %
                  </span>
                </motion.span>
                <div className="mt-2 h-0.5 w-full bg-accent-foreground">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${rate}%` }}
                    transition={{ ...Spring.Gentle, delay: 0.4 }}
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-light text-foreground-dimmed text-xs uppercase tracking-widest">
                {activePeriod} Trend
              </p>
              <span className="font-medium text-primary text-xs">↑ +15%</span>
            </div>
            <WinRateLineChart
              data={trendData[activePeriod]}
              labels={trendLabels[activePeriod]}
            />
            <div className="mt-2 flex justify-between font-light text-foreground-dimmed text-xs">
              <span>{trendLabels[activePeriod][0]}</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        <motion.div
          className="flex flex-col gap-4"
          variants={Stagger.Container(0.08)}
          initial="hidden"
          animate="visible"
          // biome-ignore lint/style/noCommaOperator: delay offset for sidebar widgets
          transition={{ delayChildren: 0.3 }}
        >
          <motion.div
            className="border border-accent-foreground bg-background-rich p-4"
            variants={Stagger.Item}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium text-foreground text-sm">
                Recent Activity
              </p>
            </div>
            <motion.div
              className="flex flex-col gap-3"
              variants={Stagger.Container(0.06)}
              initial="hidden"
              animate="visible"
              // biome-ignore lint/style/noCommaOperator: delay offset for activity items
              transition={{ delayChildren: 0.4 }}
            >
              {activityFeed.slice(0, 4).map((entry) => (
                <motion.div
                  key={entry._id}
                  className="flex items-start gap-2"
                  variants={Stagger.Item}
                >
                  <ActivityIcon type={entry.type} />
                  <div>
                    <p className="font-light text-foreground text-xs leading-relaxed">
                      {entry.message}
                    </p>
                    <p className="font-light text-foreground-dimmed text-xs">
                      {entry.timestamp}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="border border-warning/20 bg-warning/5"
            variants={Stagger.Item}
          >
            <div className="px-4 py-3.5">
              {/* header */}
              <div className="flex items-center gap-2">
                <CircleBoltIcon className="size-4 shrink-0 text-warning" />
                <p className="font-medium text-foreground text-sm">
                  Model drift detected
                </p>
              </div>

              {/* impact chips */}
              <div className="mt-2.5 flex items-center gap-2">
                <span className="bg-warning/10 px-2 py-0.5 font-medium text-warning text-xs">
                  7 products
                </span>
                <span className="bg-error/10 px-2 py-0.5 font-medium text-error text-xs">
                  avg −4% win rate
                </span>
              </div>

              {/* description */}
              <p className="mt-2.5 font-light text-foreground-dimmed text-xs leading-relaxed">
                Claude updated its behavior — some listings may be losing
                positions they previously held.
              </p>

              {/* CTA */}
              <Link
                href="/dashboard/optimize"
                className="mt-3 inline-flex items-center gap-1 font-medium text-primary text-xs hover:underline"
              >
                Re-optimize affected products
                <ArrowRightIcon className="size-3" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        className="border border-accent-foreground bg-background-rich"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...Spring.Gentle, delay: 0.3 }}
      >
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
          <table className="w-full border-collapse [&_td:first-child]:border-l-0 [&_td:last-child]:border-r-0 [&_td]:border-accent-foreground [&_td]:border-x [&_th:first-child]:border-l-0 [&_th:last-child]:border-r-0 [&_th]:border-accent-foreground [&_th]:border-x">
            <thead>
              <tr className="border-accent-foreground border-b">
                {[
                  "Product",
                  "Win Rate",
                  "GPT-4",
                  "Claude",
                  "Gemini",
                  "vs. Top Competitor",
                  "Status",
                  "",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left font-light text-foreground-dimmed text-sm"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <motion.tbody
              variants={Stagger.Container(0.05)}
              initial="hidden"
              animate="visible"
              transition={{ delayChildren: 0.35 }}
            >
              {topProducts.map((product) => (
                <motion.tr
                  key={product._id}
                  variants={Table.Row}
                  className="border-accent-foreground border-b last:border-b-0"
                  whileHover={{ backgroundColor: "rgba(0,0,0,0.015)" }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary text-xs">
                        {product.title.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {product.title}
                        </p>
                        <p className="font-light text-foreground-dimmed text-xs">
                          {product.category}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-16 bg-accent-foreground">
                        <motion.div
                          className={cn(
                            "h-full",
                            product.winRate >= 60
                              ? "bg-success"
                              : product.winRate >= 30
                                ? "bg-warning"
                                : "bg-error",
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${product.winRate}%` }}
                          transition={{ ...Spring.Gentle, delay: 0.4 }}
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
                        "font-medium text-xs",
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
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </motion.div>

      <SimulationModal open={simOpen} onClose={() => setSimOpen(false)} />
    </motion.div>
  );
};
