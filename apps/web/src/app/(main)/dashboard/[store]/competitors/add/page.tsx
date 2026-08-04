import { ArrowLeftIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import {
  Crosshair,
  SectionGutter,
  StatusPill,
} from "../../../_components/grid";
import { AddCompetitors } from "./_components/add-competitors";

type StoreParams = PageProps<"/dashboard/[store]/competitors/add">["params"];

export default ({
  params,
}: PageProps<"/dashboard/[store]/competitors/add">) => {
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
                <RosterStatus params={params} />
              </Suspense>
              <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
                Add Competitors
              </h1>
              <p className="mt-1 text-foreground-dimmed text-sm">
                The brands this store's catalog is judged against. Competitors
                belong to one store, so these never mix with your other stores.
              </p>
            </div>
            <Suspense
              fallback={
                <div className="h-9 w-40 animate-pulse bg-foreground/10" />
              }
            >
              <BackToCompetitors params={params} />
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
            <Suspense fallback={<AddSkeleton />}>
              <Sources params={params} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

const RosterStatus = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const counts = await unwrapResult(
    Competitor.countForCurrentUser(Environment.SERVER, { store }),
  );

  return (
    <StatusPill tone={counts.selected > 0 ? "success" : "neutral"}>
      {counts.total === 0
        ? "No competitors tracked yet"
        : `${counts.total} tracked — ${counts.selected} selected`}
    </StatusPill>
  );
};

const Sources = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;

  // Detection reasons about this store's catalog, and the roster shows what the
  // store already tracks — both scoped so nothing from another store leaks in.
  const [products, existing] = await Promise.all([
    unwrapResult(Product.listForCurrentUser(Environment.SERVER, { store })),
    unwrapResult(Competitor.listForStore(Environment.SERVER, { store })),
  ]);

  return (
    <AddCompetitors
      store={store}
      products={products.map((product) => product.id)}
      productNames={products.map((product) => product.title).filter(Boolean)}
      existing={existing}
    />
  );
};

const AddSkeleton = () => (
  <div className="flex flex-col gap-px bg-accent-foreground">
    <div className="bg-background-rich">
      <div className="space-y-2 p-4">
        <div className="h-3 w-24 animate-pulse bg-foreground/10" />
        <div className="h-6 w-64 animate-pulse bg-foreground/10" />
        <div className="h-4 w-full max-w-2xl animate-pulse bg-foreground/10" />
      </div>
      <div className="flex gap-px border-accent-foreground border-y bg-accent-foreground">
        {(["a", "b", "c"] as const).map((key) => (
          <div key={key} className="flex-1 bg-background-rich p-3">
            <div className="mx-auto h-4 w-24 animate-pulse bg-foreground/10" />
          </div>
        ))}
      </div>
      <div className="h-130 animate-pulse bg-foreground/5" />
    </div>
    <div className="bg-background-rich p-4">
      <div className="h-3 w-24 animate-pulse bg-foreground/10" />
      <div className="mt-2 h-6 w-48 animate-pulse bg-foreground/10" />
      <div className="mt-4 h-105 animate-pulse bg-foreground/5" />
    </div>
  </div>
);

const BackToCompetitors = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;

  return (
    <Button
      color="accent"
      render={<Link href={`/dashboard/${store}/competitors`} />}
    >
      <ArrowLeftIcon className="size-4" />
      Back to competitors
    </Button>
  );
};
