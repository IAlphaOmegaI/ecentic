import { connection } from "next/server";
import { Suspense } from "react";
import * as ClaimCheck from "@/server/app/intelligence/claim-check";
import { unwrapEntitled } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { BackToProduct, RunClaimCheck } from "./_components/actions";
import {
  ClaimsEmpty,
  ClaimsReport,
  FailedNote,
  ProductBand,
} from "./_components/report";
import { RunningBanner } from "./_components/running-banner";
import {
  ClaimsShell,
  ClaimsSkeleton,
  ReportSkeleton,
} from "./_components/shell";

// ClaimCheck.start posts against this segment, and its `after()` continuation
// reads the live page, makes ~6 model calls and opens cited pages — well past
// the default function window.
export const maxDuration = 300;

type ClaimsParams =
  PageProps<"/[locale]/dashboard/[store]/products/[id]/claims">["params"];

const ClaimsContent = async ({ params }: { params: ClaimsParams }) => {
  await connection();
  const { store, id } = await params;
  // Renders beneath the paywall overlay for accounts without a plan — see
  // `unwrapEntitled`.
  const overview = unwrapEntitled(
    await ClaimCheck.overviewForProduct(Environment.SERVER, {
      store,
      product: id,
    }),
  );
  if (!overview) return null;

  return (
    <>
      {overview.running && <RunningBanner run={overview.running.id} />}
      {!overview.running && overview.failed && (
        <FailedNote
          expired={overview.failed.expired}
          error={overview.failed.error}
        />
      )}
      <ProductBand
        product={overview.product}
        checkedAt={overview.complete?.completedAt ?? null}
        listingChanged={overview.complete?.listingChanged ?? false}
      />
      {overview.complete ? (
        <ClaimsReport report={overview.complete.report} />
      ) : overview.running ? (
        <ReportSkeleton />
      ) : (
        <ClaimsEmpty params={params} />
      )}
    </>
  );
};

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/products/[id]/claims">) => (
  <ClaimsShell
    actions={
      <Suspense>
        <BackToProduct params={params} />
        <RunClaimCheck params={params} />
      </Suspense>
    }
    content={
      <Suspense fallback={<ClaimsSkeleton />}>
        <ClaimsContent params={params} />
      </Suspense>
    }
  />
);
