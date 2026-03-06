import { ArrowRightIcon, DownloadIcon, PlusIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Link from "next/link";
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

export default () => (
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
        <div className="mt-3 flex gap-0.5">
          {[28, 31, 35, 33, 38, 40, 43].map((value, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: sparkline data
            <div
              key={index}
              className="flex-1 bg-primary/20"
              style={{ height: `${(value / 50) * 32}px` }}
            />
          ))}
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
      <div className="border border-accent-foreground bg-background-rich p-4 xl:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-medium text-foreground text-sm">Win Rate by Model</p>
          <div className="flex gap-1">
            {["7d", "30d", "90d"].map((period, index) => (
              <button
                key={period}
                type="button"
                className={cn(
                  "px-2 py-0.5 text-xs",
                  index === 1
                    ? "bg-primary text-white"
                    : "text-foreground-dimmed hover:text-foreground",
                )}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {modelWinRates.map(({ model, rate }) => (
            <div key={model} className="flex items-center gap-3">
              <span className="w-12 font-light text-foreground-dimmed text-xs">
                {model}
              </span>
              <WinRateBar rate={rate} />
            </div>
          ))}
        </div>

        <div className="mt-6">
          <p className="mb-3 font-medium text-foreground text-sm">
            Win Rate Trend (30 days)
          </p>
          <div className="relative h-24 w-full">
            <div className="absolute inset-0 flex items-end gap-1">
              {[28, 30, 29, 32, 31, 34, 33, 35, 36, 38, 37, 39, 38, 40, 39, 41, 40, 42, 41, 43, 42, 43, 44, 43, 44, 43, 44, 43, 43, 43].map(
                (value, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: trend chart data
                  <div
                    key={index}
                    className="flex-1 bg-primary/30 transition-all"
                    style={{ height: `${(value / 50) * 96}px` }}
                  />
                ),
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 border-t border-accent-foreground" />
          </div>
          <div className="mt-1 flex justify-between font-light text-foreground-dimmed text-xs">
            <span>30 days ago</span>
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
        <table className="w-full">
          <thead>
            <tr className="border-accent-foreground border-b bg-background-dimmed">
              {["Product", "Win Rate", "GPT-4", "Claude", "Gemini", "vs. Top Competitor", "Status", ""].map(
                (header) => (
                  <th
                    key={header}
                    className="px-4 py-2 text-left font-medium text-foreground-dimmed text-xs"
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
