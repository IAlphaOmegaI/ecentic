import { ArrowLeftIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import {
  parseReviewQuery,
  type ReviewSearchParams,
  reviewQueueHref,
} from "@/lib/outbound-review";
import * as ReviewData from "@/server/app/outbound/review-context";
import { Environment } from "@/server/utils/environment";
import { Empty } from "../../_components/status";
import { ReviewShell } from "../_components/shell";
import { ReviewDetailSkeleton } from "../_components/skeletons";
import { ReviewEditor } from "./_components/editor";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<ReviewSearchParams>;
};

export default function Page({ params, searchParams }: PageProps) {
  return (
    <ReviewShell mode="detail">
      <Suspense fallback={<ReviewDetailSkeleton />}>
        <ReviewDetailData params={params} searchParams={searchParams} />
      </Suspense>
    </ReviewShell>
  );
}

const ReviewDetailData = async ({ params, searchParams }: PageProps) => {
  const [path, search] = await Promise.all([params, searchParams]);
  const backHref = reviewQueueHref(parseReviewQuery(search));
  const result = await ReviewData.readReviewContext(Environment.SERVER, {
    prospectId: path.id,
  });
  const translate = await getTranslations("outbound.review.queue");
  if (!result.success)
    return (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {translate("error")}
      </p>
    );
  if (!result.data)
    return (
      <Empty
        title={translate("missingTitle")}
        description={translate("missingDescription")}
      >
        <Button
          variant="outline"
          color="neutral"
          render={<Link href={backHref} />}
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          {translate("action.secondary")}
        </Button>
      </Empty>
    );
  return (
    <ReviewEditor
      key={`${result.data.prospect.id}-${result.data.prospect.revision}`}
      context={result.data}
      backHref={backHref}
    />
  );
};
