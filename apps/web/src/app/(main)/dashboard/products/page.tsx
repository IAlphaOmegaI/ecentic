import { PlusIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import Link from "next/link";
import { Suspense } from "react";

import * as Product from "@/server/app/product";
import { ProductsTable } from "./_components/products-table";

export default () => (
  <div className="p-6">
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="font-medium text-foreground text-xl">Products</h1>
        <p className="font-light text-foreground-dimmed text-sm">
          Monitor how AI agents evaluate your product listings
        </p>
      </div>
      <Link
        href="/onboarding/products"
        className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90"
      >
        <PlusIcon className="size-3.5" />
        Add Products
      </Link>
    </div>

    <Suspense fallback={<StatsSkeleton />}>
      <Statistics />
    </Suspense>

    <Suspense fallback={<TableSkeleton />}>
      <Products />
    </Suspense>

    <Suspense fallback={<InsightsSkeleton />}>
      <Insights />
    </Suspense>
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
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
      <div className="border border-accent-foreground bg-background-rich p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Total Products
        </p>
        <p className="mt-1 font-semibold text-3xl text-foreground">
          {products.length}
        </p>
      </div>
      <div className="border border-accent-foreground bg-background-rich p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          Average Win Rate
        </p>
        <p className="mt-1 font-semibold text-3xl text-foreground">
          {averageWinRate}%
        </p>
      </div>
      <div className="border border-accent-foreground bg-background-rich p-4">
        <p className="font-light text-foreground-dimmed text-xs uppercase tracking-wide">
          High Performers
        </p>
        <p className="mt-1 font-semibold text-3xl text-success">
          {highPerformers}
        </p>
      </div>
      <div className="border border-accent-foreground bg-background-rich p-4">
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
      <div className="mb-6 border border-accent-foreground bg-background-rich p-8 text-center">
        <p className="font-medium text-foreground text-sm">
          No products imported yet
        </p>
        <p className="mt-1 font-light text-foreground-dimmed text-xs">
          Connect your store or import products to start simulating.
        </p>
      </div>
    );

  return (
    <div className="mb-6 border border-accent-foreground bg-background-rich">
      <ProductsTable rows={data.products} />
    </div>
  );
};

const Insights = async () => {
  const data = await unwrapResult(Product.gatherIntelligence());
  if (!data?.scan?.topFinding) return null;

  return (
    <div className="border border-accent-foreground bg-background-rich">
      <div className="border-accent-foreground border-b px-4 py-3">
        <p className="font-medium text-foreground text-sm">
          Latest Scan Insights
        </p>
      </div>
      <div className="px-4 py-3">
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
    </div>
  );
};

const StatsSkeleton = () => {
  const keys = ["total", "average", "high", "attention"];

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
      {keys.map((key) => (
        <div
          key={key}
          className="border border-accent-foreground bg-background-rich p-4"
        >
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
    <div className="mb-6 border border-accent-foreground bg-background-rich">
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
  <div className="border border-accent-foreground bg-background-rich">
    <div className="border-accent-foreground border-b px-4 py-3">
      <div className="h-4 w-40 animate-pulse bg-foreground/10" />
    </div>
    <div className="px-4 py-3">
      <div className="h-4 w-full animate-pulse bg-foreground/10" />
      <div className="mt-2 h-3 w-32 animate-pulse bg-foreground/10" />
    </div>
  </div>
);
