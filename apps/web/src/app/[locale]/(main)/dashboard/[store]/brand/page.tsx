import { connection } from "next/server";
import { Suspense } from "react";
import * as BrandSnapshot from "@/server/app/brand-snapshot";
import { isSubscriptionRequired } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { BrandEmpty, BrandReport, FailedNote } from "./_components/report";
import { RunningBanner } from "./_components/running-banner";
import { BrandShell, BrandUnavailable } from "./_components/shell";
import { BrandSkeleton } from "./_components/skeletons";

// Brand.analyze posts against this segment and its `after()` continuation runs
// ~20 audited AI queries plus a synthesis pass — well past the default
// function window.
export const maxDuration = 300;

type StoreParams = PageProps<"/[locale]/dashboard/[store]/brand">["params"];

const BrandContent = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const overview = await BrandSnapshot.overviewForStore(Environment.SERVER, {
    store,
  });
  if (!overview.success) {
    if (isSubscriptionRequired(overview.error)) return null;
    return <BrandUnavailable />;
  }

  return (
    <>
      {overview.data.running && (
        <RunningBanner
          store={store}
          hasReport={Boolean(overview.data.complete?.report)}
        />
      )}
      {!overview.data.running &&
        (overview.data.failed || overview.data.interrupted) && (
          <FailedNote hasReport={Boolean(overview.data.complete?.report)} />
        )}
      {overview.data.complete?.report ? (
        <BrandReport
          store={store}
          running={Boolean(overview.data.running)}
          report={overview.data.complete.report}
          analyzedAt={overview.data.complete.updatedAt}
        />
      ) : overview.data.running ? null : (
        <BrandEmpty store={store} />
      )}
    </>
  );
};

export default ({ params }: PageProps<"/[locale]/dashboard/[store]/brand">) => (
  <BrandShell
    content={
      <Suspense fallback={<BrandSkeleton />}>
        <BrandContent params={params} />
      </Suspense>
    }
  />
);
