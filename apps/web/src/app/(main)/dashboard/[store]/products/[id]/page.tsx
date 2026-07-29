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
import {
  Crosshair,
  SectionGutter,
  StatLabel,
  StatusPill,
} from "../../../_components/grid";
import { ProductDetail } from "./_components/product-detail";
import { PageSkeleton } from "./_components/skeletons";

export default ({ params }: PageProps<"/dashboard/[store]/products/[id]">) => (
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
}: Pick<PageProps<"/dashboard/[store]/products/[id]">, "params">) => {
  await connection();
  const { id, store } = await params;
  const data = await unwrapResult(
    Product.getDetail(Environment.SERVER, { id, store }),
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
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <StatusPill tone={latestSimulatedAt ? "success" : "neutral"}>
              {latestSimulatedAt
                ? `Live — updated ${formatRelativeTime(latestSimulatedAt)}`
                : "No simulations run yet"}
            </StatusPill>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              {product.title}
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">{subtitle}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              color="accent"
              render={<Link href={`/dashboard/${store}/products`} />}
            >
              <ChevronLeftIcon className="size-4" />
              Back to Products
            </Button>
            <Button
              color="primary"
              render={<Link href={`/dashboard/${store}/optimize`} />}
            >
              Optimize
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label="Win Rate"
                icon={<GaugeIcon className="size-7.5 text-primary" />}
              />
              <div>
                <p
                  className={cn(
                    "font-bold text-4xl tabular-nums tracking-[-0.02em]",
                    rateTextColor(winRate),
                  )}
                >
                  {winRate}
                  <span className="ml-0.5 font-medium text-foreground-dimmed text-xl">
                    %
                  </span>
                </p>
                <div className="mt-3">
                  <div className="h-1 w-full rounded-full bg-accent-foreground">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        rateBarColor(winRate),
                      )}
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                  <p className="mt-2 text-foreground-dimmed text-xs">
                    {totalWins} wins · {simulations.length} simulations
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label="Data Quality"
                icon={<BullseyeIcon className="size-7.5 text-error" />}
              />
              <div>
                <p
                  className={cn(
                    "font-bold text-4xl tabular-nums tracking-[-0.02em]",
                    rateTextColor(product.quality),
                  )}
                >
                  {product.quality}
                  <span className="ml-0.5 font-medium text-foreground-dimmed text-xl">
                    %
                  </span>
                </p>
                <div className="mt-3">
                  <div className="h-1 w-full rounded-full bg-accent-foreground">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        rateBarColor(product.quality),
                      )}
                      style={{ width: `${product.quality}%` }}
                    />
                  </div>
                  <p className="mt-2 text-foreground-dimmed text-xs">
                    listing completeness score
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label="Simulations Run"
                icon={<RadarIcon className="size-7.5 text-warning" />}
              />
              <div>
                <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
                  {simulations.length}
                </p>
                <p className="mt-3 text-foreground-dimmed text-xs">
                  across {competitors.length} competitor
                  {competitors.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="relative flex flex-col justify-between gap-6 bg-background-rich p-5 transition-colors hover:bg-background">
              <StatLabel
                label="Best Model"
                icon={<AwardIcon className="size-7.5 text-success" />}
              />
              {models.length > 0 ? (
                <div>
                  <p
                    className={cn(
                      "font-bold text-4xl tabular-nums tracking-[-0.02em]",
                      rateTextColor(bestModel.rate),
                    )}
                  >
                    {bestModel.rate}
                    <span className="ml-0.5 font-medium text-foreground-dimmed text-xl">
                      %
                    </span>
                  </p>
                  <p className="mt-3 text-foreground-dimmed text-xs">
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
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <ProductDetail data={data} />
        </div>
      </div>
    </>
  );
};
