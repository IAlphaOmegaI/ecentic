import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import * as BrandSnapshot from "@/server/app/brand-snapshot";
import { Environment } from "@/server/utils/environment";
import { RefreshBrand } from "./_components/refresh-brand";
import { BrandEmpty, BrandReport, FailedNote } from "./_components/report";
import { RunningBanner } from "./_components/running-banner";
import { BrandShell, BrandSkeleton } from "./_components/shell";

// Brand.analyze posts against this segment and its `after()` continuation runs
// ~20 audited AI queries plus a synthesis pass — well past the default
// function window.
export const maxDuration = 300;

type StoreParams = PageProps<"/[locale]/dashboard/[store]/brand">["params"];

const BrandContent = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const overview = unwrapResult(
    await BrandSnapshot.overviewForStore(Environment.SERVER, { store }),
  );

  return (
    <>
      {overview.running && <RunningBanner store={store} />}
      {!overview.running && overview.failed && (
        <FailedNote error={overview.failed.error} />
      )}
      {overview.complete?.report ? (
        <BrandReport
          report={overview.complete.report}
          analyzedAt={overview.complete.updatedAt}
        />
      ) : overview.running ? (
        <BrandSkeleton />
      ) : (
        <BrandEmpty params={params} />
      )}
    </>
  );
};

export default ({ params }: PageProps<"/[locale]/dashboard/[store]/brand">) => (
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
