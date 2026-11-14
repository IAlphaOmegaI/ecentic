import { Suspense } from "react";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { ChannelLoadError } from "../channels/_components/summary";
import { ComparisonClient } from "./_components/comparison-client";
import { ComparisonSetupSkeleton, ComparisonShell } from "./_components/shell";

type StoreParams =
  PageProps<"/[locale]/dashboard/[store]/ucp-comparison">["params"];

const ComparisonSetup = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;
  const record = await Store.resolveForUser(Environment.SERVER, { store });
  if (!record.success) return <ChannelLoadError />;
  return <ComparisonClient initialSourceStore={record.data.domain} />;
};

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/ucp-comparison">) => (
  <ComparisonShell>
    <Suspense fallback={<ComparisonSetupSkeleton />}>
      <ComparisonSetup params={params} />
    </Suspense>
  </ComparisonShell>
);
