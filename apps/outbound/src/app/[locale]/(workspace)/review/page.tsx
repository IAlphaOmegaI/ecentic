import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  parseReviewQuery,
  type ReviewSearchParams,
} from "@/lib/outbound-review";
import * as Outbound from "@/server/app/outbound";
import { Environment } from "@/server/utils/environment";
import { ReviewQueueTable } from "./_components/queue";
import { ReviewShell } from "./_components/shell";
import { ReviewQueueSkeleton } from "./_components/skeletons";
import { CampaignContext } from "../_components/campaign-context";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<ReviewSearchParams>;
}) {
  return (
    <ReviewShell mode="queue">
      <Suspense fallback={<ReviewQueueSkeleton />}>
        <QueueData searchParams={searchParams} />
      </Suspense>
    </ReviewShell>
  );
}

const QueueData = async ({
  searchParams,
}: {
  searchParams: Promise<ReviewSearchParams>;
}) => {
  const query = parseReviewQuery(await searchParams);
  const result = await Outbound.getReviewQueue(Environment.SERVER, query);
  if (!result.success) {
    const translate = await getTranslations("outbound.review.queue");
    return (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {translate("error")}
      </p>
    );
  }
  return (
    <>
    <CampaignContext campaign={query.campaign} />
    <ReviewQueueTable
      queue={result.data}
      query={{ ...query, page: result.data.page }}
    />
    </>
  );
};
