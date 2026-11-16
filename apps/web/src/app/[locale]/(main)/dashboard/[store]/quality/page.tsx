import { connection } from "next/server";
import { Suspense } from "react";
import * as ListingQuality from "@/server/app/intelligence/listing-quality";
import { isSubscriptionRequired } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { QualityWorkspace } from "./_components/catalog-products";
import {
  QualityFeedback,
  QualityShell,
  QualitySkeleton,
} from "./_components/shell";

type StoreParams = PageProps<"/[locale]/dashboard/[store]/quality">["params"];

const Quality = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const report = await ListingQuality.auditListings(Environment.SERVER, {
    store,
  });
  if (!report.success) {
    if (isSubscriptionRequired(report.error)) return null;
    return <QualityFeedback kind="error" />;
  }
  if (!report.data.total) return <QualityFeedback kind="empty" store={store} />;
  return <QualityWorkspace products={report.data.products} store={store} />;
};

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/quality">) => (
  <QualityShell>
    <Suspense fallback={<QualitySkeleton />}>
      <Quality params={params} />
    </Suspense>
  </QualityShell>
);
