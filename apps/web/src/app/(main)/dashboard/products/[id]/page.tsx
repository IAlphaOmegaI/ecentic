import {
  ArrowRightIcon,
  AwardIcon,
  BullseyeIcon,
  ChevronLeftIcon,
  GaugeIcon,
  RadarIcon,
} from "@zenncore/icons";
import { cn, unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatPrice } from "@/lib/currency";
import { formatRelativeTime } from "@/lib/date";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { Crosshair, SectionGutter, StatLabel } from "../../_components/grid";
import { ProductDetail } from "./_components/product-detail";

export default ({ params }: PageProps<"/dashboard/products/[id]">) => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <Suspense fallback={<PageSkeleton />}>
        <ProductDetailContent params={params} />
      </Suspense>
    </div>
  </div>
);

const rateTextColor = (rate: number) => {
  switch (true) {
    case rate >= 60:
      return "text-success";
    case rate >= 30:
      return "text-warning";
    default:
      return "text-error";
  }
};

const rateBarColor = (rate: number) => {
  switch (true) {
    case rate >= 60:
      return "bg-success";
    case rate >= 30:
      return "bg-warning";
    default:
      return "bg-error";
  }
};

const ProductDetailContent = async ({
  params,
}: Pick<PageProps<"/dashboard/products/[id]">, "params">) => {
  await connection();
  const { id } = await params;
  const data = await unwrapResult(
    Product.getDetail(Environment.SERVER, { id }),
  );
  if (!data) return null;

  const { product, winRate, models, competitors, simulations } = data;

  const totalWins = simulations.filter(
    (simulation) => simulation.winner === "product",
  ).length;

  const bestModel = models.reduce(
    (best, model) => (model.rate > best.rate ? model : best),
    models[0] ?? { label: "N/A", rate: 0 },
  );

  const latestSimulatedAt = simulations.reduce<Date | null>(
    (latest, simulation) =>
      latest && latest > simulation.createdAt ? latest : simulation.createdAt,
    null,
  );

  const subtitle = [
    product.sku && `SKU: ${product.sku}`,
    product.price && formatPrice(product.price, product.currency),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
              <span
                className={cn(
                  "size-2",
                  latestSimulatedAt ? "bg-success" : "bg-accent-rich",
                )}
              />
              {latestSimulatedAt
                ? `Live — updated ${formatRelativeTime(latestSimulatedAt)}`
                : "No simulations run yet"}
            </div>
            <h1 className="mt-3 font-medium text-4xl text-foreground">
              {product.title}
            </h1>
            <p className="mt-1 font-light text-foreground-dimmed text-lg">
              {subtitle}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              color="accent"
              render={<Link href="/dashboard/products" />}
            >
              <ChevronLeftIcon className="size-4" />
              Back to Products
            </Button>
            <Button
              variant="outline"
              color="accent"
              render={<Link href="/dashboard/products" />}
            >
              <RadarIcon className="size-4" />
              Run Scan
            </Button>
            <Button
              variant="flat"
              color="primary"
              render={<Link href="/dashboard/ucp" />}
            >
              Optimize
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label="Win Rate"
                icon={<GaugeIcon className="size-8 shrink-0 text-primary" />}
              />
              <div>
                <p
                  className={cn(
                    "font-medium text-5xl tabular-nums tracking-tight",
                    rateTextColor(winRate),
                  )}
                >
                  {winRate}
                  <span className="ml-0.5 font-light text-2xl text-foreground-dimmed">
                    %
                  </span>
                </p>
                <div className="mt-3">
                  <div className="h-1 w-full bg-accent-foreground">
                    <div
                      className={cn("h-full", rateBarColor(winRate))}
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                  <p className="mt-2 font-light text-foreground-dimmed text-sm">
                    {totalWins} wins · {simulations.length} simulations
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label="Data Quality"
                icon={<BullseyeIcon className="size-8 shrink-0 text-error" />}
              />
              <div>
                <p
                  className={cn(
                    "font-medium text-5xl tabular-nums tracking-tight",
                    rateTextColor(product.quality),
                  )}
                >
                  {product.quality}
                  <span className="ml-0.5 font-light text-2xl text-foreground-dimmed">
                    %
                  </span>
                </p>
                <div className="mt-3">
                  <div className="h-1 w-full bg-accent-foreground">
                    <div
                      className={cn("h-full", rateBarColor(product.quality))}
                      style={{ width: `${product.quality}%` }}
                    />
                  </div>
                  <p className="mt-2 font-light text-foreground-dimmed text-sm">
                    listing completeness score
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label="Simulations Run"
                icon={<RadarIcon className="size-8 shrink-0 text-warning" />}
              />
              <div>
                <p className="font-medium text-5xl text-foreground tabular-nums tracking-tight">
                  {simulations.length}
                </p>
                <p className="mt-3 font-light text-foreground-dimmed text-sm">
                  across {competitors.length} competitor
                  {competitors.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label="Best Model"
                icon={<AwardIcon className="size-8 shrink-0 text-success" />}
              />
              {models.length > 0 ? (
                <div>
                  <p
                    className={cn(
                      "font-medium text-5xl tabular-nums tracking-tight",
                      rateTextColor(bestModel.rate),
                    )}
                  >
                    {bestModel.rate}
                    <span className="ml-0.5 font-light text-2xl text-foreground-dimmed">
                      %
                    </span>
                  </p>
                  <p className="mt-3 font-light text-foreground-dimmed text-sm">
                    {bestModel.label} win rate
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 pb-4">
                  <p className="font-light text-foreground-dimmed text-sm">
                    No data yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SectionGutter />

      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 bg-background-rich">
          <ProductDetail data={data} />
        </div>
      </div>
    </>
  );
};

const PageSkeleton = () => (
  <>
    {/* Header skeleton */}
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-4 w-56 animate-pulse bg-foreground/10" />
          <div className="mt-3 h-10 w-64 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-6 w-40 animate-pulse bg-foreground/10" />
        </div>
        <div className="flex shrink-0 gap-2">
          <div className="h-9 w-36 animate-pulse bg-foreground/10" />
          <div className="h-9 w-28 animate-pulse bg-foreground/10" />
          <div className="h-9 w-24 animate-pulse bg-foreground/10" />
        </div>
      </div>
    </div>

    {/* Stats skeleton */}
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="relative mx-8 bg-background-rich">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
          {(["a", "b", "c", "d"] as const).map((key) => (
            <div
              key={key}
              className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 animate-pulse bg-foreground/10" />
                <div className="absolute top-5 right-5 size-8 animate-pulse bg-foreground/10" />
              </div>
              <div>
                <div className="h-11 w-24 animate-pulse bg-foreground/10" />
                <div className="mt-3 h-4 w-32 animate-pulse bg-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <SectionGutter />

    {/* Tabs skeleton */}
    <div className="-mx-8 border-accent-foreground border-t border-b">
      <div className="mx-8 bg-background-rich">
        <div className="p-4">
          <div className="h-10 w-full animate-pulse bg-foreground/10" />
        </div>
        <div className="grid grid-cols-1 gap-px bg-accent-foreground lg:grid-cols-4">
          {(["a", "b", "c", "d"] as const).map((key) => (
            <div
              key={key}
              className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 animate-pulse bg-foreground/10" />
                <div className="absolute top-5 right-5 size-8 animate-pulse bg-foreground/10" />
              </div>
              <div>
                <div className="h-11 w-20 animate-pulse bg-foreground/10" />
                <div className="mt-3 h-1 w-full animate-pulse bg-foreground/10" />
                <div className="mt-2 h-4 w-32 animate-pulse bg-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);
