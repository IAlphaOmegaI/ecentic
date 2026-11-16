import { connection } from "next/server";
import { Suspense } from "react";
import * as CatalogRank from "@/server/app/intelligence/catalog-rank";
import { RankChecker } from "./_components/rank-checker";
import { CatalogRankShell, CatalogRankSkeleton } from "./_components/shell";

type StoreParams = Promise<{ locale: string; store: string }>;
export default async ({ params }: { params: StoreParams }) => {
  const configured = await CatalogRank.isCatalogConfigured();
  return (
    <CatalogRankShell>
      <Suspense fallback={<CatalogRankSkeleton configured={configured} />}>
        <RankContent params={params} configured={configured} />
      </Suspense>
    </CatalogRankShell>
  );
};
const RankContent = async ({
  params,
  configured,
}: {
  params: StoreParams;
  configured: boolean;
}) => {
  await connection();
  const { store } = await params;
  return <RankChecker store={store} configured={configured} />;
};
