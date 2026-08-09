import { ArrowLeftIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { connection } from "next/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { StatusPillSkeleton } from "../../../_components/chrome-skeletons";
import { StatusPill } from "../../../_components/grid";
import { AddCompetitors } from "./_components/add-competitors";
import {
  AddCompetitorsShell,
  BackLinkSkeleton,
  SourcesSkeleton,
} from "./_components/shell";

type StoreParams = PageProps<"/dashboard/[store]/competitors/add">["params"];

export default ({
  params,
}: PageProps<"/dashboard/[store]/competitors/add">) => (
  <AddCompetitorsShell
    statusPill={
      <Suspense fallback={<StatusPillSkeleton />}>
        <RosterStatus params={params} />
      </Suspense>
    }
    action={
      <Suspense fallback={<BackLinkSkeleton />}>
        <BackToCompetitors params={params} />
      </Suspense>
    }
  >
    <Suspense fallback={<SourcesSkeleton />}>
      <Sources params={params} />
    </Suspense>
  </AddCompetitorsShell>
);

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

const _AddSkeleton = () => (
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
