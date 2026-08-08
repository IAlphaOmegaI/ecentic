import { ArrowLeftIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Product from "@/server/app/product";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import {
  Crosshair,
  SectionGutter,
  StatusPill,
} from "../../../_components/grid";
import { AddProducts } from "./_components/add-products";

type StoreParams = PageProps<"/dashboard/[store]/products/add">["params"];

export default ({ params }: PageProps<"/dashboard/[store]/products/add">) => {
  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <div>
              <Suspense
                fallback={
                  <div className="h-5 w-56 animate-pulse rounded-full bg-foreground/10" />
                }
              >
                <CatalogStatus params={params} />
              </Suspense>
              <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
                Add Products
              </h1>
              <p className="mt-1 text-foreground-dimmed text-sm">
                Bring more of your catalog in from the platform this store is
                connected to. Everything you add here belongs to this store
                only.
              </p>
            </div>
            <Suspense
              fallback={
                <div className="h-9 w-40 animate-pulse bg-foreground/10" />
              }
            >
              <BackToProducts params={params} />
            </Suspense>
          </div>
        </div>

        <SectionGutter />

        <div className="-mx-8 border-accent-foreground border-t border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <Suspense fallback={<SourcesSkeleton />}>
              <Sources params={params} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

const CatalogStatus = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const [resolved, total] = await Promise.all([
    unwrapResult(Store.resolveForUser(Environment.SERVER, { store })),
    unwrapResult(Product.countForCurrentUser(Environment.SERVER, { store })),
  ]);

  return (
    <StatusPill tone={resolved.lastSyncedAt ? "success" : "neutral"}>
      {`${total} ${total === 1 ? "product" : "products"} · `}
      {resolved.lastSyncedAt
        ? `synced ${formatRelativeTime(resolved.lastSyncedAt)}`
        : "never synced"}
    </StatusPill>
  );
};

const Sources = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  // The layout already 404s an unowned store, but this component reads the row
  // itself — resolve through the ownership-checked path rather than a bare get.
  const resolved = await Store.resolveForUser(Environment.SERVER, { store });
  if (!resolved.success) notFound();

  return (
    <AddProducts
      store={store}
      platform={resolved.data.platform}
      domain={resolved.data.domain}
    />
  );
};

const SourcesSkeleton = () => (
  <div className="flex flex-col gap-6 bg-background-rich p-6">
    <div className="flex flex-col gap-2">
      <div className="h-3 w-28 animate-pulse bg-foreground/10" />
      <div className="h-6 w-44 animate-pulse bg-foreground/10" />
      <div className="h-4 w-full max-w-2xl animate-pulse bg-foreground/10" />
      <div className="h-4 w-2/3 max-w-2xl animate-pulse bg-foreground/10" />
    </div>
    <div className="h-9 w-32 animate-pulse bg-foreground/10" />
  </div>
);

const BackToProducts = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;

  return (
    <Button
      color="accent"
      render={<Link href={`/dashboard/${store}/products`} />}
    >
      <ArrowLeftIcon className="size-4" />
      Back to products
    </Button>
  );
};
