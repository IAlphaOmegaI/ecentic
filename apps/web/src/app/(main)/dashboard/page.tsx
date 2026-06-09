import {
  ArrowRightIcon,
  AwardIcon,
  BullseyeIcon,
  GaugeIcon,
  RadarIcon,
  ShoppingCartIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { cn, unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { connection } from "next/server";
import { type ReactNode, Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import * as Scan from "@/server/app/scan";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { AgentVisitsPanel } from "./_components/agent-visits-panel";
import { CompetitorsTable } from "./_components/competitors-table";
import { OverviewActions } from "./_components/overview-actions";
import { OverviewCharts } from "./_components/overview-charts";
import { ProductsTable } from "./_components/products-table";

const Crosshair = ({ className }: { className?: string }) => (
  <svg
    aria-hidden
    viewBox="0 0 12 12"
    fill="none"
    className={cn(
      "pointer-events-none absolute z-10 size-3 text-accent-rich",
      className,
    )}
  >
    <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const SectionGutter = () => (
  <div className="relative h-10 bg-grid-stripes">
    <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
    <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
    <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
    <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
  </div>
);

export default () => (
  <div className="flex flex-col">
    <Suspense>
      <StoreCheck />
    </Suspense>
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Suspense
              fallback={
                <div className="h-4 w-56 animate-pulse bg-foreground/10" />
              }
            >
              <LastUpdated />
            </Suspense>
            <h1 className="mt-3 font-medium text-4xl text-foreground">
              Overview
            </h1>
            <p className="mt-1 font-light text-foreground-dimmed text-lg">
              How AI shopping agents rank your catalog against competitors.
            </p>
          </div>
          <OverviewActions />
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 bg-background-rich">
          <Suspense fallback={<StatsSkeleton />}>
            <StatCards />
          </Suspense>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 bg-background-rich">
          <Suspense fallback={<ChartSkeleton />}>
            <Performance />
          </Suspense>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 bg-background-rich">
          <Suspense fallback={<TableSkeleton />}>
            <TopProducts />
          </Suspense>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 bg-background-rich">
          <Suspense fallback={<CompetitorTableSkeleton />}>
            <TopCompetitors />
          </Suspense>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 bg-background-rich">
          <Suspense fallback={<TableSkeleton />}>
            <AgentVisitsPanel />
          </Suspense>
        </div>
      </div>

      <div className="relative h-12 bg-grid-stripes">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  </div>
);

const StoreCheck = async () => {
  await connection();
  const result = await Store.getForCurrentUser(Environment.SERVER);
  const hasStore = result.success && result.data.length > 0;

  if (hasStore) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 flex max-w-md flex-col items-center gap-6 border border-accent-foreground bg-background-rich p-10 text-center">
        <div className="flex size-16 items-center justify-center border border-accent-foreground bg-background-dimmed">
          <ShoppingCartIcon className="size-8 text-foreground-dimmed" />
        </div>
        <div className="space-y-2">
          <h2 className="font-medium text-2xl text-foreground">
            Connect your store
          </h2>
          <p className="text-foreground-dimmed">
            To see your dashboard, connect a store first. We'll import your
            products and start tracking how AI agents compare them.
          </p>
        </div>
        <Button
          color="primary"
          render={<Link href="/onboarding/connect" />}
          className="w-full"
        >
          Connect a store <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
};

const LastUpdated = async () => {
  await connection();
  const data = await unwrapResult(
    Product.gatherIntelligence(Environment.SERVER),
  );

  return (
    <div className="flex items-center gap-2.5 text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
      <span className="relative flex size-2">
        {data.scan?.updatedAt && (
          <span className="absolute size-full animate-ping bg-success opacity-60" />
        )}
        <span
          className={cn(
            "relative size-2",
            data.scan?.updatedAt ? "bg-success" : "bg-accent-rich",
          )}
        />
      </span>
      {data.scan?.updatedAt
        ? `Live — updated ${formatRelativeTime(data.scan.updatedAt)}`
        : "No scans run yet"}
    </div>
  );
};

const StatLabel = ({ label, icon }: { label: string; icon: ReactNode }) => (
  <div className="flex items-center justify-between gap-2">
    <p className="text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
      {label}
    </p>
    {icon}
  </div>
);

const StatCards = async () => {
  await connection();
  const data = await unwrapResult(
    Product.gatherIntelligence(Environment.SERVER),
  );
  const { products } = data;

  if (products.length === 0)
    return (
      <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Overall Win Rate", icon: GaugeIcon },
          { label: "Products Scanned", icon: RadarIcon },
          { label: "Top Performer", icon: AwardIcon },
          { label: "Biggest Opportunity", icon: BullseyeIcon },
        ].map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex h-44 flex-col justify-between bg-background-rich p-5"
          >
            <StatLabel
              label={label}
              icon={<Icon className="size-4 shrink-0 text-foreground-dimmed" />}
            />
            <div className="flex flex-col items-center gap-2 pb-4">
              <Icon className="size-10 text-accent-rich" />
              <p className="font-light text-foreground-dimmed text-sm">
                No data yet
              </p>
            </div>
          </div>
        ))}
      </div>
    );

  const overall = Math.round(
    products.reduce((sum, product) => sum + product.winRate.total, 0) /
      products.length,
  );

  const sorted = [...products].sort(
    (a, b) => b.winRate.total - a.winRate.total,
  );

  const top = sorted[0];
  const opportunity = sorted[sorted.length - 1];

  const scans = await unwrapResult(Scan.getLatest(Environment.SERVER));
  const completed = scans.filter((scan) => scan.status === "completed");

  const trend = (() => {
    if (completed.length < 2) return 0;

    const current = completed[0];
    const previous = completed[1];

    if (!current) return 0;
    if (!previous) return 0;

    const currentTotal = current.wins + current.losses;
    const previousTotal = previous.wins + previous.losses;

    const currentRate =
      currentTotal > 0 ? Math.round((current.wins / currentTotal) * 100) : 0;
    const previousRate =
      previousTotal > 0 ? Math.round((previous.wins / previousTotal) * 100) : 0;

    return currentRate - previousRate;
  })();

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
      <div className="flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Overall Win Rate"
          icon={
            <GaugeIcon className="size-4 shrink-0 text-foreground-dimmed" />
          }
        />
        <div>
          <p className="font-medium text-5xl text-foreground tabular-nums tracking-tight">
            {overall}
            <span className="ml-0.5 font-light text-2xl text-foreground-dimmed">
              %
            </span>
          </p>
          {trend !== 0 ? (
            <p className="mt-3 flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-1 border px-1.5 py-0.5 text-xs",
                  trend >= 0
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-error/40 bg-error/10 text-error",
                )}
              >
                {trend >= 0 ? (
                  <TrendUpIcon className="size-3" />
                ) : (
                  <TrendDownIcon className="size-3" />
                )}
                {trend >= 0 ? "+" : ""}
                {trend}%
              </span>
              <span className="font-light text-foreground-dimmed text-xs">
                vs last scan
              </span>
            </p>
          ) : (
            <p className="mt-3 font-light text-foreground-dimmed text-xs">
              across {products.length}{" "}
              {products.length === 1 ? "product" : "products"}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Products Scanned"
          icon={
            <RadarIcon className="size-4 shrink-0 text-foreground-dimmed" />
          }
        />
        <div>
          <p className="font-medium text-5xl text-foreground tabular-nums tracking-tight">
            {data.total}
            <span className="ml-1 font-light text-2xl text-foreground-dimmed">
              / 100
            </span>
          </p>
          <div className="mt-3">
            <div className="h-1 w-full bg-accent-foreground">
              <div
                className="h-full bg-primary"
                style={{ width: `${(data.total / 100) * 100}%` }}
              />
            </div>
            <p className="mt-2 font-light text-foreground-dimmed text-xs">
              {100 - data.total} slots remaining
            </p>
          </div>
        </div>
      </div>

      {top && (
        <div className="flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label="Top Performer"
            icon={
              <AwardIcon className="size-4 shrink-0 text-foreground-dimmed" />
            }
          />
          <div>
            <p className="line-clamp-1 text-foreground">{top.title}</p>
            <p className="mt-1 font-medium text-5xl text-success tabular-nums tracking-tight">
              {top.winRate.total}
              <span className="ml-0.5 font-light text-2xl text-foreground-dimmed">
                %
              </span>
            </p>
            <Link
              href={`/dashboard/products/${top._id}`}
              className="mt-3 inline-flex items-center gap-1 text-primary text-sm transition-colors hover:text-primary-rich"
            >
              View details <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        </div>
      )}

      {opportunity && (
        <div className="flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label="Biggest Opportunity"
            icon={
              <BullseyeIcon className="size-4 shrink-0 text-foreground-dimmed" />
            }
          />
          <div>
            <p className="line-clamp-1 text-foreground">{opportunity.title}</p>
            <p className="mt-1 font-medium text-5xl text-error tabular-nums tracking-tight">
              {opportunity.winRate.total}
              <span className="ml-0.5 font-light text-2xl text-foreground-dimmed">
                %
              </span>
            </p>
            <Link
              href={`/dashboard/products/${opportunity._id}`}
              className="mt-3 inline-flex items-center gap-1 text-primary text-sm transition-colors hover:text-primary-rich"
            >
              Optimize now <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

const Performance = async () => {
  await connection();
  const [data, scans] = await Promise.all([
    unwrapResult(Product.gatherIntelligence(Environment.SERVER)),
    unwrapResult(Scan.getLatest(Environment.SERVER)),
  ]);

  const { products } = data;

  const models =
    products.length > 0
      ? [
          {
            label: "GPT-4",
            rate: Math.round(
              products.reduce((sum, p) => sum + p.winRate.gpt4, 0) /
                products.length,
            ),
          },
          {
            label: "Claude",
            rate: Math.round(
              products.reduce((sum, p) => sum + p.winRate.claude, 0) /
                products.length,
            ),
          },
          {
            label: "Gemini",
            rate: Math.round(
              products.reduce((sum, p) => sum + p.winRate.gemini, 0) /
                products.length,
            ),
          },
          {
            label: "Perplexity",
            rate: Math.round(
              products.reduce(
                (sum, p) => sum + (p.winRate.perplexity ?? 0),
                0,
              ) / products.length,
            ),
          },
        ]
      : [];

  const completed = scans.filter((scan) => scan.status === "completed");

  const trend = completed
    .slice(0, 30)
    .reverse()
    .map((scan) => {
      const total = scan.wins + scan.losses;
      return {
        date: scan.createdAt.toISOString(),
        winRate: total > 0 ? Math.round((scan.wins / total) * 100) : 0,
      };
    });

  const activity = scans.slice(0, 5).map((scan) => ({
    id: scan.id,
    type:
      scan.status === "completed"
        ? ("simulation_complete" as const)
        : ("simulation_running" as const),
    message:
      scan.status === "completed"
        ? `Simulation completed — ${scan.wins} wins, ${scan.losses} losses`
        : `Simulation in progress — ${scan.completedSimulations}/${scan.totalSimulations}`,
    detail: scan.topFinding,
    timestamp: scan.createdAt.toISOString(),
  }));

  return <OverviewCharts models={models} trend={trend} activity={activity} />;
};

const TopProducts = async () => {
  await connection();
  const data = await unwrapResult(
    Product.gatherIntelligence(Environment.SERVER),
  );

  const sorted = [...data.products]
    .sort((a, b) => b.winRate.total - a.winRate.total)
    .slice(0, 10);

  return (
    <ProductsTable
      rows={sorted}
      pageCount={1}
      kicker="02 — Catalog"
      title="Product Win Rates"
      action={
        <Button
          variant="outline"
          color="primary"
          render={<Link href="/dashboard/products" />}
        >
          View all products <ArrowRightIcon className="size-4" />
        </Button>
      }
    />
  );
};

const TopCompetitors = async () => {
  await connection();
  const data = await unwrapResult(
    Competitor.gatherIntelligence(Environment.SERVER),
  );

  return (
    <CompetitorsTable
      rows={data.brands}
      kicker="03 — Competitive Landscape"
      title="Top Competitors"
      pageCount={1}
      action={
        <Button
          variant="outline"
          color="primary"
          render={<Link href="/dashboard/competitors" />}
        >
          View all <ArrowRightIcon className="size-4" />
        </Button>
      }
    />
  );
};

const StatsSkeleton = () => (
  <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
    {(["a", "b", "c", "d"] as const).map((key) => (
      <div
        key={key}
        className="flex h-44 flex-col justify-between bg-background-rich p-5"
      >
        <div className="flex items-center justify-between">
          <div className="h-3 w-28 animate-pulse bg-foreground/10" />
          <div className="size-4 animate-pulse bg-foreground/10" />
        </div>
        <div>
          <div className="h-11 w-24 animate-pulse bg-foreground/10" />
          <div className="mt-3 h-4 w-32 animate-pulse bg-foreground/10" />
        </div>
      </div>
    ))}
  </div>
);

const ChartSkeleton = () => (
  <div className="grid grid-cols-1 gap-px bg-accent-foreground xl:grid-cols-3">
    <div className="bg-background-rich xl:col-span-2">
      <div className="p-4">
        <div className="h-3 w-32 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-8 w-44 animate-pulse bg-foreground/10" />
      </div>

      <div className="grid grid-cols-4 divide-x divide-accent-foreground border-accent-foreground border-y">
        {(["GPT-4", "Claude", "Gemini", "Perplexity"] as const).map((model) => (
          <div key={model} className="p-6">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-5 animate-pulse rounded-full bg-foreground/10" />
                <div className="h-3.5 w-14 animate-pulse bg-foreground/10" />
              </div>
              <div className="flex items-baseline gap-0.5">
                <div className="h-9 w-10 animate-pulse bg-foreground/10" />
                <div className="h-4 w-3 animate-pulse bg-foreground/10" />
              </div>
            </div>
            <div className="mt-3 h-1 w-full animate-pulse bg-foreground/10" />
          </div>
        ))}
      </div>

      <div className="p-4">
        <div className="mb-3 h-3 w-24 animate-pulse bg-foreground/10" />
        <div className="h-56 w-full animate-pulse bg-foreground/10" />
      </div>
    </div>

    <div className="flex flex-col gap-px bg-accent-foreground">
      <div className="flex-1 bg-background-rich">
        <div className="px-4 pt-4 pb-2">
          <div className="h-3.5 w-24 animate-pulse bg-foreground/10" />
        </div>
        <div className="flex flex-col">
          {(["a", "b", "c"] as const).map((key) => (
            <div
              key={key}
              className="flex items-start gap-3 border-accent-foreground border-b p-4 last:border-b-0"
            >
              <div className="mt-0.5 size-8 shrink-0 animate-pulse bg-foreground/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full animate-pulse bg-foreground/10" />
                <div className="h-3 w-4/5 animate-pulse bg-foreground/10" />
                <div className="h-2.5 w-14 animate-pulse bg-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between bg-background-rich p-4">
        <div className="h-9 w-28 animate-pulse bg-foreground/10" />
        <div className="h-9 w-36 animate-pulse bg-foreground/10" />
      </div>
    </div>
  </div>
);

const CompetitorTableSkeleton = () => (
  <div>
    <div className="flex items-center justify-between border-accent-foreground border-b p-4">
      <div className="space-y-2">
        <div className="h-3 w-40 animate-pulse bg-foreground/10" />
        <div className="h-6 w-36 animate-pulse bg-foreground/10" />
      </div>
      <div className="h-9 w-24 animate-pulse bg-foreground/10" />
    </div>
    <div className="overflow-x-auto bg-background-rich">
      <table className="w-full">
        <thead>
          <tr className="border-accent-foreground border-b">
            {["Brand", "Win Rate", "Simulations", "Last Updated", ""].map(
              (header) => (
                <th key={header} className="px-4 py-3 text-left">
                  {header && (
                    <div className="h-3 w-14 animate-pulse bg-foreground/10" />
                  )}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {(["a", "b", "c", "d", "e"] as const).map((key) => (
            <tr
              key={key}
              className="border-accent-foreground border-b last:border-b-0"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 shrink-0 animate-pulse bg-foreground/10" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 animate-pulse bg-foreground/10" />
                    <div className="h-3 w-16 animate-pulse bg-foreground/10" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-20 animate-pulse bg-foreground/10" />
                  <div className="h-4 w-9 animate-pulse bg-foreground/10" />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-10 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-20 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-3">
                <div className="size-9 animate-pulse bg-foreground/10" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="flex items-center justify-between border-accent-foreground border-t p-4">
      <div className="h-4 w-24 animate-pulse bg-foreground/10" />
      <div className="flex gap-2">
        <div className="h-9 w-9 animate-pulse bg-foreground/10" />
        <div className="h-9 w-9 animate-pulse bg-foreground/10" />
      </div>
    </div>
  </div>
);

const TableSkeleton = () => (
  <div>
    <div className="flex items-center justify-between border-accent-foreground border-b px-4 py-3">
      <div className="space-y-2">
        <div className="h-3 w-32 animate-pulse bg-foreground/10" />
        <div className="h-6 w-28 animate-pulse bg-foreground/10" />
      </div>
      <div className="h-9 w-36 animate-pulse bg-foreground/10" />
    </div>
    <div className="overflow-x-auto bg-background-rich">
      <table className="w-full">
        <thead>
          <tr className="border-accent-foreground border-b">
            {[
              "Product",
              "Win Rate",
              "GPT-4",
              "Claude",
              "Gemini",
              "Perplexity",
              "Quality",
              "",
            ].map((header) => (
              <th key={header} className="px-4 py-3 text-left">
                {header && (
                  <div className="h-3 w-14 animate-pulse bg-foreground/10" />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(["a", "b", "c", "d", "e"] as const).map((key) => (
            <tr
              key={key}
              className="border-accent-foreground border-b last:border-b-0"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 shrink-0 animate-pulse bg-foreground/10" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-36 animate-pulse bg-foreground/10" />
                    <div className="h-3 w-20 animate-pulse bg-foreground/10" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-20 animate-pulse bg-foreground/10" />
                  <div className="h-4 w-9 animate-pulse bg-foreground/10" />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-9 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-9 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-9 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-20 animate-pulse bg-foreground/10" />
                  <div className="h-4 w-9 animate-pulse bg-foreground/10" />
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="size-9 animate-pulse bg-foreground/10" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
