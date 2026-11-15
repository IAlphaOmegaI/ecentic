import * as CatalogRank from "@/server/app/intelligence/catalog-rank";
import { CatalogRankShell, CatalogRankSkeleton } from "./_components/shell";

export default async () => {
  const configured = await CatalogRank.isCatalogConfigured();
  return (
    <CatalogRankShell>
      <CatalogRankSkeleton configured={configured} />
    </CatalogRankShell>
  );
};
