import { ArrowLeftIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import * as Competitor from "@/server/app/competitor";
import * as Product from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { StatusPillSkeleton } from "../../../_components/chrome-skeletons";
import { ResearchUnavailable } from "../../research/_components/shell";
import { AddCompetitors } from "./_components/add-competitors";
import {
  AddCompetitorsShell,
  BackLinkSkeleton,
  SourcesSkeleton,
} from "./_components/shell";

type StoreParams =
  PageProps<"/[locale]/dashboard/[store]/competitors/add">["params"];

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/competitors/add">) => (
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
  const translate = await getTranslations("dashboard.research.competitors");
  const result = await Competitor.countForCurrentUser(Environment.SERVER, {
    store,
  });
  if (!result.success) return null;
  return (
    <p>
      {translate("roster", {
        total: String(result.data.total),
        selected: String(result.data.selected),
      })}
    </p>
  );
};

const Sources = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;

  // Detection reasons about this store's catalog, and the roster shows what the
  // store already tracks — both scoped so nothing from another store leaks in.
  const [productResult, competitorResult] = await Promise.all([
    Product.listForCurrentUser(Environment.SERVER, { store }),
    Competitor.listForStore(Environment.SERVER, { store }),
  ]);
  if (!productResult.success || !competitorResult.success)
    return <ResearchUnavailable />;
  const products = productResult.data;
  const existing = competitorResult.data;

  return (
    <AddCompetitors
      store={store}
      products={products.map((product) => product.id)}
      productNames={products.map((product) => product.title).filter(Boolean)}
      existing={existing}
    />
  );
};

const BackToCompetitors = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;
  const translate = await getTranslations("dashboard.research.competitors");

  return (
    <Button
      variant="soft"
      render={<Link href={`/dashboard/${store}/competitors`} />}
    >
      <ArrowLeftIcon className="size-4" />
      {translate("action.tertiary")}
    </Button>
  );
};
