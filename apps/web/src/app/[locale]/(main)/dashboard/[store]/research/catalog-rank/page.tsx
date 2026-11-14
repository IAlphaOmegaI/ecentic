import { connection } from "next/server";
import { Suspense } from "react";
import * as CatalogRank from "@/server/app/intelligence/catalog-rank";
import { RankChecker } from "./_components/rank-checker";
import { CatalogRankShell, CatalogRankSkeleton } from "./_components/shell";

type StoreParams = Promise<{ locale: string; store: string }>;
export default ({ params }: { params: StoreParams }) => (
  <CatalogRankShell>
    <Suspense fallback={<CatalogRankSkeleton />}>
      <RankContent params={params} />
    </Suspense>
  </CatalogRankShell>
);
const RankContent = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  return (
    <RankChecker
      store={store}
      configured={await CatalogRank.isCatalogConfigured()}
    />
  );
};
