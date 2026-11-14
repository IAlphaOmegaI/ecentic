import { connection } from "next/server";
import { Suspense } from "react";
import { DiscoveryClient } from "@/components/discovery/discovery-client";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { ResearchUnavailable } from "../research/_components/shell";
import { DiscoveryShell, DiscoverySkeleton } from "./_components/shell";

type StoreParams = PageProps<"/[locale]/dashboard/[store]/discovery">["params"];

// Resolve the store the dashboard is scoped to and hand the discovery tool its
// domain as the fixed target, so the merchant never retypes their own store —
// they just enter shopping queries and run.
const StoreDiscovery = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const result = await Store.resolveForUser(Environment.SERVER, { store });
  if (!result.success) return <ResearchUnavailable />;
  const record = result.data;

  return <DiscoveryClient defaultTargetStore={record.domain} lockStore />;
};

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/discovery">) => (
  <DiscoveryShell>
    <Suspense fallback={<DiscoverySkeleton />}>
      <StoreDiscovery params={params} />
    </Suspense>
  </DiscoveryShell>
);
