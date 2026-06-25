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
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import * as Scan from "@/server/app/scan";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { AgentVisitsPanel } from "./_components/agent-visits-panel";
import { CompetitorsTable } from "./_components/competitors-table";
import {
  Crosshair,
  SectionGutter,
  StatLabel,
  StatusPill,
} from "./_components/grid";
import { OverviewActions } from "./_components/overview-actions";
import { OverviewCharts } from "./_components/overview-charts";
import { ProductsTable } from "./_components/products-table";

export default () => (
  <div className="flex flex-col">
    <Suspense>
      <StoreCheck />
    </Suspense>
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <Suspense
              fallback={
                <div className="h-4 w-56 animate-pulse bg-foreground/10" />
              }
            >
              <LastUpdated />
            </Suspense>
            <h1 className="mt-3 font-bold text-3xl text-foreground-rich tracking-[-0.02em]">
              Overview
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              How AI shopping agents rank your catalog against competitors.
            </p>
          </div>
          <OverviewActions />
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
          <Suspense fallback={<StatsSkeleton />}>
            <StatCards />
          </Suspense>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
          <Suspense fallback={<ChartSkeleton />}>
            <Performance />
          </Suspense>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
          <Suspense fallback={<TableSkeleton />}>
            <TopProducts />
          </Suspense>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
          <Suspense fallback={<CompetitorTableSkeleton />}>
            <TopCompetitors />
          </Suspense>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
          <Suspense fallback={<TableSkeleton />}>
            <AgentVisitsPanel />
          </Suspense>
        </div>
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
    <StatusPill tone={data.scan?.updatedAt ? "success" : "neutral"}>
      {data.scan?.updatedAt
        ? `Live — updated ${formatRelativeTime(data.scan.updatedAt)}`
        : "No scans run yet"}
    </StatusPill>
  );
};

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
            className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
          >
            <StatLabel label={label} icon={<Icon className="size-7.5" />} />
            <div className="flex flex-col items-center gap-2 pb-4">
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
  const completed = scans.filter((scan) => scan.status === "complete");

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
      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Overall Win Rate"
          icon={<GaugeIcon className="size-7.5 text-primary" />}
        />
        <div>
          <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
            {overall}
            <span className="ml-0.5 font-medium text-foreground-dimmed text-xl">
              %
            </span>
          </p>
          {trend !== 0 ? (
            <p className="mt-3 flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-1 font-medium text-xs",
                  trend >= 0 ? "text-success" : "text-error",
                )}
              >
                {trend >= 0 ? (
                  <TrendUpIcon className="size-4" />
                ) : (
                  <TrendDownIcon className="size-4" />
                )}
                {trend >= 0 ? "+" : ""}
                {trend}%
              </span>
              <span className="text-foreground-dimmed text-xs">
                vs last scan
              </span>
            </p>
          ) : (
            <p className="mt-3 text-foreground-dimmed text-xs">
              across {products.length}{" "}
              {products.length === 1 ? "product" : "products"}
            </p>
          )}
        </div>
      </div>

      <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
        <StatLabel
          label="Products Scanned"
          icon={<RadarIcon className="size-7.5 text-warning" />}
        />
        <div>
          <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
            {data.total}
            <span className="ml-1 font-medium text-foreground-dimmed text-xl">
              / 100
            </span>
          </p>
          <div className="mt-3">
            <div className="h-1 w-full rounded-full bg-accent-foreground">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-600"
                style={{ width: `${(data.total / 100) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-foreground-dimmed text-xs">
              {100 - data.total} slots remaining
            </p>
          </div>
        </div>
      </div>

      {top && (
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label="Top Performer"
            icon={<AwardIcon className="size-7.5 text-success" />}
          />
          <div>
            <p className="line-clamp-1 text-foreground text-sm">{top.title}</p>
            <p className="mt-1 font-bold text-4xl text-success tabular-nums tracking-[-0.02em]">
              {top.winRate.total}
              <span className="ml-0.5 font-medium text-foreground-dimmed text-xl">
                %
              </span>
            </p>
            <Link
              href={`/dashboard/products/${top._id}`}
              className="mt-3 inline-flex items-center gap-1 text-primary text-sm transition-colors hover:text-primary-rich"
            >
              View details <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      )}

      {opportunity && (
        <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
          <StatLabel
            label="Biggest Opportunity"
            icon={<BullseyeIcon className="size-7.5 text-error" />}
          />
          <div>
            <p className="line-clamp-1 text-foreground text-sm">
              {opportunity.title}
            </p>
            <p className="mt-1 font-bold text-4xl text-error tabular-nums tracking-[-0.02em]">
              {opportunity.winRate.total}
              <span className="ml-0.5 font-medium text-foreground-dimmed text-xl">
                %
              </span>
            </p>
            <Link
              href={`/dashboard/products/${opportunity._id}`}
              className="mt-3 inline-flex items-center gap-1 text-primary text-sm transition-colors hover:text-primary-rich"
            >
              Optimize now <ArrowRightIcon className="size-4" />
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
        ]
      : [];

  const completed = scans.filter((scan) => scan.status === "complete");

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
      scan.status === "complete"
        ? ("simulation_complete" as const)
        : ("simulation_running" as const),
    message:
      scan.status === "complete"
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
        <Button color="primary" render={<Link href="/dashboard/products" />}>
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
        <Button color="primary" render={<Link href="/dashboard/competitors" />}>
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
        className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
      >
        <div className="flex items-center justify-between">
          <div className="h-3 w-28 animate-pulse bg-foreground/10" />
          <div className="absolute top-5 right-5 size-7.5 animate-pulse bg-foreground/10" />
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
                <div className="size-8 animate-pulse bg-foreground/10" />
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
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="size-9 shrink-0 animate-pulse bg-foreground/10" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 animate-pulse bg-foreground/10" />
                    <div className="h-3 w-16 animate-pulse bg-foreground/10" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-20 animate-pulse bg-foreground/10" />
                  <div className="h-4 w-9 animate-pulse bg-foreground/10" />
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-10 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-20 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
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
    <div className="flex items-center justify-between border-accent-foreground border-b p-4">
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
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="size-9 shrink-0 animate-pulse bg-foreground/10" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-36 animate-pulse bg-foreground/10" />
                    <div className="h-3 w-20 animate-pulse bg-foreground/10" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-20 animate-pulse bg-foreground/10" />
                  <div className="h-4 w-9 animate-pulse bg-foreground/10" />
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-9 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-9 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
                <div className="h-4 w-9 animate-pulse bg-foreground/10" />
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-20 animate-pulse bg-foreground/10" />
                  <div className="h-4 w-9 animate-pulse bg-foreground/10" />
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="size-9 animate-pulse bg-foreground/10" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
