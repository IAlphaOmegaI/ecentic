import {
  ArrowRightIcon,
  BoxMinusIcon,
  ChevronLeftIcon,
  RadarIcon,
} from "@zenncore/icons";
import { cn, unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatPrice } from "@/lib/currency";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
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

  return (
    <>
      {/* Header */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 px-6 py-8">
          <Link
            href="/dashboard/products"
            className="flex w-fit items-center gap-1 font-light text-foreground-dimmed text-sm hover:text-primary"
          >
            <ChevronLeftIcon className="size-4" />
            Back to Products
          </Link>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center bg-primary/10 font-bold text-primary text-xl">
                {product.title.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="font-medium text-4xl text-foreground">
                  {product.title}
                </h1>
                <p className="mt-1 font-light text-2xl text-foreground-dimmed">
                  {[
                    product.sku && `SKU: ${product.sku}`,
                    product.price &&
                      formatPrice(product.price, product.currency),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
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
      </div>

      {/* Stat cards */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8">
          <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col justify-between bg-background-dimmed p-4">
              <p className="text-foreground-dimmed">Win Rate</p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={cn("text-4xl tabular-nums", rateTextColor(winRate))}
                >
                  {winRate}%
                </span>
              </div>
              <div className="mt-4">
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

            <div className="flex flex-col justify-between bg-background-dimmed p-4">
              <p className="text-foreground-dimmed">Data Quality</p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "text-4xl tabular-nums",
                    rateTextColor(product.quality),
                  )}
                >
                  {product.quality}%
                </span>
              </div>
              <div className="mt-4">
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

            <div className="flex flex-col justify-between bg-background-dimmed p-4">
              <p className="text-foreground-dimmed">Simulations Run</p>
              <span className="mt-2 text-4xl text-foreground tabular-nums">
                {simulations.length}
              </span>
              <p className="mt-2 font-light text-foreground-dimmed text-sm">
                across {competitors.length} competitor
                {competitors.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex flex-col justify-between bg-background-dimmed p-4">
              <p className="text-foreground-dimmed">Best Model</p>
              {models.length > 0 ? (
                <>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span
                      className={cn(
                        "text-4xl tabular-nums",
                        rateTextColor(bestModel.rate),
                      )}
                    >
                      {bestModel.rate}%
                    </span>
                  </div>
                  <p className="mt-2 font-light text-foreground-dimmed text-sm">
                    {bestModel.label} win rate
                  </p>
                </>
              ) : (
                <div className="mt-2 flex flex-col items-center justify-center gap-2 text-foreground-dimmed">
                  <BoxMinusIcon className="size-12" />
                  <p className="text-sm">No data yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs content */}
      <div className="h-8" />
      <div className="-mx-8 mb-12 border-accent-foreground border-t border-b">
        <div className="mx-8 p-6">
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
      <div className="mx-8 px-6 py-8">
        <div className="h-4 w-28 animate-pulse bg-foreground/10" />
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="size-16 animate-pulse bg-foreground/10" />
            <div>
              <div className="h-10 w-64 animate-pulse bg-foreground/10" />
              <div className="mt-2 h-7 w-40 animate-pulse bg-foreground/10" />
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <div className="h-9 w-28 animate-pulse bg-foreground/10" />
            <div className="h-9 w-24 animate-pulse bg-foreground/10" />
          </div>
        </div>
      </div>
    </div>

    {/* Stats skeleton */}
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="mx-8">
        <div className="grid h-39 min-h-39 grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
          {["a", "b", "c", "d"].map((key) => (
            <div key={key} className="bg-background-dimmed p-4">
              <div className="h-4 w-28 animate-pulse bg-foreground/10" />
              <div className="mt-4 h-10 w-20 animate-pulse bg-foreground/10" />
              <div className="mt-3 h-1 w-full animate-pulse bg-foreground/10" />
              <div className="mt-2 h-3 w-32 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Tabs skeleton */}
    <div className="h-8" />
    <div className="-mx-8 mb-12 border-accent-foreground border-t border-b">
      <div className="mx-8 p-6">
        <div className="mb-4 h-10 w-full animate-pulse bg-foreground/10" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {["a", "b", "c"].map((key) => (
            <div
              key={key}
              className="border border-accent-foreground bg-background-rich p-4"
            >
              <div className="h-4 w-16 animate-pulse bg-foreground/10" />
              <div className="mt-2 h-8 w-20 animate-pulse bg-foreground/10" />
              <div className="mt-2 h-1.5 w-full animate-pulse bg-foreground/10" />
              <div className="mt-1 h-3 w-32 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);
