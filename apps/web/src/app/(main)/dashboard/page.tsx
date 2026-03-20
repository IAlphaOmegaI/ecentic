"use client";

import {
  ArrowRightIcon,
  CircleBoltIcon,
  DownloadIcon,
  PlusIcon,
} from "@zenncore/icons";
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
import type { SVGProps } from "react";
import { Spring, Stagger, Table as TableAnimations } from "@/lib/animations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
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

const OpenAILogo = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.91 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.776.776 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.767.767 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.843-3.372 2.015-1.163a.076.076 0 0 1 .072 0l4.83 2.786a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.398-.678zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.776.776 0 0 0-.392.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

const AnthropicLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.304 3.541 13.766 12.6l3.538 9.059H24L17.304 3.541zM6.696 3.541 0 21.659h6.696l3.538-9.059-3.538-9.059z" />
  </svg>
);

const GeminiLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 24A14.304 14.304 0 0 0 0 12 14.304 14.304 0 0 0 12 0a14.304 14.304 0 0 0 12 12 14.304 14.304 0 0 0-12 12" />
  </svg>
);

const modelLogos = {
  "GPT-4": OpenAILogo,
  Claude: AnthropicLogo,
  Gemini: GeminiLogo,
} as const;

const modelColors = {
  "GPT-4": "text-blue-500",
  Claude: "text-orange-500",
  Gemini: "text-green-500",
} as const;

const modelBarColors = {
  "GPT-4": "bg-blue-500",
  Claude: "bg-orange-500",
  Gemini: "bg-green-500",
} as const;

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
          {/* Dot rendered outside SVG to stay round regardless of SVG stretch */}
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
            <span className="font-medium text-primary">{data[hoverIndex]}%</span>
          </div>
        </>
      )}
    </div>
  );
};

export default () => {
  const [activePeriod, setActivePeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [simOpen, setSimOpen] = useState(false);

  return (
    <motion.div
      className="flex flex-col"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={Spring.Gentle}
    >
      <div className="mx-8 border-x border-accent-foreground">
        {/* Title */}
        <div className="-mx-8 border-b border-accent-foreground">
          <motion.div
            className="mx-8 flex items-center justify-between px-6 py-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...Spring.Snappy, delay: 0.05 }}
          >
            <div>
              <h1 className="font-medium text-foreground text-3xl">Overview</h1>
              <p className="font-light text-foreground-dimmed text-sm">
                Last updated: 2 hours ago
              </p>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                className="flex items-center gap-1.5 border border-accent-foreground bg-background px-3 py-1.5 text-foreground text-sm transition-colors hover:bg-background-dimmed"
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
        </div>

        {/* Stat cards */}
        <div className="-mx-8 border-b border-accent-foreground">
          <motion.div
            className="mx-8 grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4"
            variants={Stagger.Container(0.07)}
            initial="hidden"
            animate="visible"
            // biome-ignore lint/style/noCommaOperator: delay offset for stat cards
            transition={{ delayChildren: 0.08 }}
          >
            {/* Overall Win Rate */}
            <motion.div
              className="flex flex-col justify-between bg-background-dimmed p-5"
              variants={Stagger.Item}
            >
              <div>
                <p className="font-light text-foreground-dimmed text-sm">
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
                    {winRateTrend >= 0 ? "+" : "−"}
                    {Math.abs(winRateTrend)}% this week
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
              className="flex flex-col justify-between bg-background-dimmed p-5"
              variants={Stagger.Item}
            >
              <div>
                <p className="font-light text-foreground-dimmed text-sm">
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
              className="flex flex-col justify-between bg-background-dimmed p-5"
              variants={Stagger.Item}
            >
              <div>
                <p className="font-light text-foreground-dimmed text-sm">
                  Top Performer
                </p>
                <p className="mt-2 font-medium text-foreground text-base leading-snug">
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
              className="flex flex-col justify-between bg-background-dimmed p-5"
              variants={Stagger.Item}
            >
              <div>
                <p className="font-light text-foreground-dimmed text-sm">
                  Biggest Opportunity
                </p>
                <p className="mt-2 font-medium text-foreground text-base leading-snug">
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
        </div>

        {/* Chart + Activity */}
        <div className="h-8" />
        <div className="-mx-8 border-t border-b border-accent-foreground">
          <motion.div
            className="mx-8 grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...Spring.Gentle, delay: 0.2 }}
          >
            {/* Chart panel */}
            <div className="bg-background-dimmed p-4 xl:col-span-2">
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
                {modelWinRates.map(({ model, rate }) => {
                  const Logo = modelLogos[model];
                  return (
                  <motion.div
                    key={model}
                    className="flex flex-col items-center gap-1 px-6 first:pl-0 last:pr-0"
                    variants={Stagger.Item}
                  >
                    <div className="flex items-center gap-1.5">
                      <Logo className={cn("size-3.5", modelColors[model])} />
                      <span className="font-light text-foreground-dimmed text-xs uppercase tracking-widest">
                        {model}
                      </span>
                    </div>
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
                        className={cn("h-full", modelBarColors[model])}
                        initial={{ width: 0 }}
                        animate={{ width: `${rate}%` }}
                        transition={{ ...Spring.Gentle, delay: 0.4 }}
                      />
                    </div>
                  </motion.div>
                  );
                })}
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

            {/* Right column */}
            <div className="flex flex-col gap-px bg-accent-foreground [&>*:last-child]:flex-1">
              {/* Recent Activity */}
              <motion.div
                className="bg-background-dimmed p-4"
                variants={Stagger.Item}
                initial="hidden"
                animate="visible"
                // biome-ignore lint/style/noCommaOperator: delay offset for activity
                transition={{ delayChildren: 0.3 }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-medium text-foreground text-base">
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

              {/* Model drift */}
              <motion.div
                className="bg-background-dimmed"
                variants={Stagger.Item}
                initial="hidden"
                animate="visible"
              >
                <div className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <CircleBoltIcon className="size-4 shrink-0 text-warning" />
                    <p className="font-medium text-foreground text-base">
                      Model drift detected
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="bg-warning/10 px-2 py-0.5 font-medium text-warning text-xs">
                      7 products
                    </span>
                    <span className="bg-error/10 px-2 py-0.5 font-medium text-error text-xs">
                      avg −4% win rate
                    </span>
                  </div>
                  <p className="mt-2.5 font-light text-foreground-dimmed text-xs leading-relaxed">
                    Claude updated its behavior — some listings may be losing
                    positions they previously held.
                  </p>
                  <Link
                    href="/dashboard/optimize"
                    className="mt-3 inline-flex items-center gap-1 font-medium text-primary text-xs hover:underline"
                  >
                    Re-optimize affected products
                    <ArrowRightIcon className="size-3" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Product Win Rates table */}
        <div className="h-8" />
        <div className="-mx-8 border-t border-b border-accent-foreground">
          <motion.div
            className="mx-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...Spring.Gentle, delay: 0.3 }}
          >
            <div className="border-accent-foreground border-b px-4 py-3 flex items-center justify-between">
              <p className="font-medium text-foreground text-base">
                Product Win Rates
              </p>
              <Link
                href="/dashboard/products"
                className="flex items-center gap-1 font-light text-primary text-xs hover:underline"
              >
                View all products <ArrowRightIcon className="size-3" />
              </Link>
            </div>
            <div className="overflow-x-auto bg-background-rich">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Product", "Win Rate", "GPT-4", "Claude", "Gemini", "vs. Top Competitor", "Status", ""].map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody
                  render={
                    <motion.tbody
                      variants={Stagger.Container(0.05)}
                      initial="hidden"
                      animate="visible"
                      transition={{ delayChildren: 0.35 }}
                    />
                  }
                >
                  {topProducts.map((product) => (
                    <TableRow
                      key={product._id}
                      render={<motion.tr variants={TableAnimations.Row} />}
                      className="hover:bg-background-dimmed/50"
                    >
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-xs">{product.gpt4WinRate}%</TableCell>
                      <TableCell className="text-xs">{product.claudeWinRate}%</TableCell>
                      <TableCell className="text-xs">{product.geminiWinRate}%</TableCell>
                      <TableCell>
                        <p className="font-light text-foreground-dimmed text-xs">
                          {product.topCompetitor}
                        </p>
                        <p className={cn("font-medium text-xs", product.winRate > product.competitorWinRate ? "text-success" : "text-error")}>
                          {product.winRate > product.competitorWinRate ? "+" : ""}{product.winRate - product.competitorWinRate}%
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={product.optimizationStatus} />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/products/${product._id}`}
                          className="font-light text-primary text-xs hover:underline"
                        >
                          View →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        </div>
      </div>

      <SimulationModal open={simOpen} onClose={() => setSimOpen(false)} />
    </motion.div>
  );
};
