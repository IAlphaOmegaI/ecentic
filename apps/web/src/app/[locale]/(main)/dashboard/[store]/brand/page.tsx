import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import * as BrandSnapshot from "@/server/app/brand-snapshot";
import { Environment } from "@/server/utils/environment";
import { RefreshBrand } from "./_components/refresh-brand";
import { BrandEmpty, BrandReport } from "./_components/report";
import { BrandShell, BrandSkeleton } from "./_components/shell";

// Brand.analyze posts against this segment and runs ~20 audited AI queries
// plus a synthesis pass — well past the default function window.
export const maxDuration = 300;

type StoreParams = PageProps<"/dashboard/[store]/brand">["params"];

const BrandContent = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const snapshot = unwrapResult(
    await BrandSnapshot.latestForStore(Environment.SERVER, { store }),
  );

  if (!snapshot?.report) return <BrandEmpty params={params} />;

  return (
    <BrandReport report={snapshot.report} analyzedAt={snapshot.updatedAt} />
  );
};

export default ({ params }: PageProps<"/dashboard/[store]/brand">) => (
  <BrandShell
    actions={
      <Suspense>
        <RefreshBrand params={params} />
      </Suspense>
    }
    content={
      <Suspense fallback={<BrandSkeleton />}>
        <BrandContent params={params} />
      </Suspense>
    }
  />
);
