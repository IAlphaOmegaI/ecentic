import { PlusIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import Link from "next/link";
import { Suspense } from "react";
import * as Product from "@/server/app/product";
import { ProductsTable } from "./_components/products-table";

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      {/* Title */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex items-center justify-between px-6 py-8">
          <div>
            <h1 className="font-medium text-3xl text-foreground">Products</h1>
            <p className="font-light text-foreground-dimmed text-sm">
              Monitor how AI agents evaluate your product listings
            </p>
          </div>
          <Link
            href="/onboarding/products"
            className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90"
          >
            <PlusIcon className="size-4" />
            Add Products
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8">
          <Suspense fallback={<StatsSkeleton />}>
            <Statistics />
          </Suspense>
        </div>
      </div>

      {/* Table */}
      <div className="h-8" />
      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8">
          <Suspense fallback={<TableSkeleton />}>
            <Products />
          </Suspense>
        </div>
      </div>

      {/* Insights */}
      <div className="h-8" />
      <div className="-mx-8 border-accent-foreground border-t border-b">
        <div className="mx-8 px-6 py-6">
          <Suspense fallback={<InsightsSkeleton />}>
            <Insights />
          </Suspense>
        </div>
      </div>
    </div>
  </div>
);

const Statistics = async () => {
  const data = await unwrapResult(Product.gatherIntelligence());
  if (!data) return null;

  const { products } = data;
  if (products.length === 0) return null;

  const averageWinRate = Math.round(
    products.reduce((sum, product) => sum + product.winRate.total, 0) /
      products.length,
  );

  const needsAttention = products.filter(
    (product) => product.winRate.total < 30,
  ).length;

  const highPerformers = products.filter(
    (product) => product.winRate.total >= 60,
  ).length;

  return (
    <div className="grid grid-cols-1 gap-px border-accent-foreground border-b bg-accent-foreground sm:grid-cols-4">
      <div className="bg-background p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Total Products
        </p>
        <p className="mt-1 font-semibold text-3xl text-foreground">
          {products.length}
        </p>
      </div>
      <div className="bg-background p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Average Win Rate
        </p>
        <p className="mt-1 font-semibold text-3xl text-foreground">
          {averageWinRate}%
        </p>
      </div>
      <div className="bg-background p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          High Performers
        </p>
        <p className="mt-1 font-semibold text-3xl text-success">
          {highPerformers}
        </p>
      </div>
      <div className="bg-background p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Needs Attention
        </p>
        <p className="mt-1 font-semibold text-3xl text-error">
          {needsAttention}
        </p>
      </div>
    </div>
  );
};

const Products = async () => {
  const data = await unwrapResult(Product.gatherIntelligence());

  if (data.products.length === 0)
    return (
      <div className="bg-background p-8 text-center">
        <p className="font-medium text-base text-foreground">
          No products imported yet
        </p>
        <p className="mt-1 font-light text-foreground-dimmed text-xs">
          Connect your store or import products to start simulating.
        </p>
      </div>
    );

  return <ProductsTable rows={data.products} />;
};

const Insights = async () => {
  const data = await unwrapResult(Product.gatherIntelligence());
  if (!data?.scan?.topFinding) return null;

  return (
    <div>
      <p className="mb-2 font-medium text-base text-foreground">
        Latest Scan Insights
      </p>
      <p className="font-light text-foreground text-sm">
        {data.scan.topFinding}
      </p>
      <div className="mt-2 flex items-center gap-4">
        <span className="font-light text-foreground-dimmed text-xs">
          {data.scan.wins}W / {data.scan.losses}L
        </span>
        <span className="font-light text-foreground-dimmed text-xs">
          {data.scan.completedSimulations} simulations
        </span>
      </div>
    </div>
  );
};

const StatsSkeleton = () => {
  const keys = ["total", "average", "high", "attention"];

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-4">
      {keys.map((key) => (
        <div key={key} className="bg-background p-4">
          <div className="h-3 w-24 animate-pulse bg-foreground/10" />
          <div className="mt-3 h-8 w-16 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
  );
};

const TableSkeleton = () => {
  const keys = ["row-a", "row-b", "row-c", "row-d", "row-e"];

  return (
    <div>
      <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
        <div className="h-4 w-32 animate-pulse bg-foreground/10" />
      </div>
      {keys.map((key) => (
        <div
          key={key}
          className="flex items-center gap-4 border-accent-foreground border-b px-4 py-3 last:border-b-0"
        >
          <div className="size-9 animate-pulse bg-foreground/10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 animate-pulse bg-foreground/10" />
            <div className="h-3 w-20 animate-pulse bg-foreground/10" />
          </div>
          <div className="h-4 w-12 animate-pulse bg-foreground/10" />
          <div className="h-4 w-16 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
  );
};

const InsightsSkeleton = () => (
  <div>
    <div className="h-4 w-40 animate-pulse bg-foreground/10" />
    <div className="mt-2 h-4 w-full animate-pulse bg-foreground/10" />
    <div className="mt-2 h-3 w-32 animate-pulse bg-foreground/10" />
  </div>
);
