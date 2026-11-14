import { connection } from "next/server";
import { Suspense } from "react";
import * as Optimization from "@/server/app/optimization";
import { isSubscriptionRequired } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { OptimizeClient } from "./_components/optimize-client";
import {
  OptimizeFeedback,
  OptimizeShell,
  OptimizeSkeleton,
} from "./_components/shell";

type StoreParams = PageProps<"/[locale]/dashboard/[store]/optimize">["params"];

const OptimizeContent = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const result = await Optimization.listDashboard(Environment.SERVER, {
    store,
  });
  if (!result.success) {
    if (isSubscriptionRequired(result.error)) return null;
    return <OptimizeFeedback kind="error" />;
  }
  return <OptimizeClient data={result.data} store={store} />;
};

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/optimize">) => (
  <OptimizeShell>
    <Suspense fallback={<OptimizeSkeleton />}>
      <OptimizeContent params={params} />
    </Suspense>
  </OptimizeShell>
);
