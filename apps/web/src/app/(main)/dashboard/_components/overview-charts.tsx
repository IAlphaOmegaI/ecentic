"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { motion } from "motion/react";
import Link from "next/link";
import type { SVGProps } from "react";
import { useState } from "react";
import { Spring, Stagger } from "@/lib/animations";
import { formatRelativeTime } from "@/lib/date";
import type { ActivityEntry, ModelRate, TrendPoint } from "@/server/app/dashboard";

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

const modelLogos: Record<string, (props: SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  "GPT-4": OpenAILogo,
  Claude: AnthropicLogo,
  Gemini: GeminiLogo,
};

const modelColors: Record<string, string> = {
  "GPT-4": "text-blue-500",
  Claude: "text-orange-500",
  Gemini: "text-green-500",
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
}: {
  models: ModelRate[];
  trend: TrendPoint[];
  activity: ActivityEntry[];
}) => {
  const trendData = trend.map((point) => point.winRate);
  const trendLabels = trend.map((point) => formatRelativeTime(point.date));

  const trendChange = (() => {
    if (trendData.length < 2) return 0;
    return trendData[trendData.length - 1] - trendData[0];
  })();

  return (
    <motion.div
      className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3"
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
        </div>

        <motion.div
          className="mb-10 grid grid-cols-3 divide-x divide-accent-foreground"
          variants={Stagger.Container(0.08)}
          initial="hidden"
          animate="visible"
          transition={{ delayChildren: 0.25 }}
        >
          {models.map(({ label, rate }) => {
            const Logo = modelLogos[label];
            return (
              <motion.div
                key={label}
                className="flex flex-col items-center gap-1 px-6 first:pl-0 last:pr-0"
                variants={Stagger.Item}
              >
                <div className="flex items-center gap-1.5">
                  {Logo && (
                    <Logo
                      className={cn("size-3.5", modelColors[label])}
                    />
                  )}
                  <span className="font-light text-foreground-dimmed text-xs uppercase tracking-widest">
                    {label}
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
                    className={cn("h-full", modelBarColors[label])}
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
              Win Rate Trend
            </p>
            {trendChange !== 0 && (
              <span
                className={cn(
                  "font-medium text-xs",
                  trendChange > 0 ? "text-success" : "text-error",
                )}
              >
                {trendChange > 0 ? "+" : ""}
                {trendChange}%
              </span>
            )}
          </div>
          <WinRateLineChart data={trendData} labels={trendLabels} />
          {trendLabels.length >= 2 && (
            <div className="mt-2 flex justify-between font-light text-foreground-dimmed text-xs">
              <span>{trendLabels[0]}</span>
              <span>{trendLabels[trendLabels.length - 1]}</span>
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
                      {formatRelativeTime(entry.timestamp)}
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
    </motion.div>
  );
};
