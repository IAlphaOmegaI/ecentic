import { unwrapResult } from "@zenncore/utils";
import { Suspense } from "react";
import { DiscoveryClient } from "@/components/discovery/discovery-client";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { DiscoveryShell, DiscoverySkeleton } from "./_components/shell";

type StoreParams = PageProps<"/dashboard/[store]/discovery">["params"];

// Resolve the store the dashboard is scoped to and hand the discovery tool its
// domain as the fixed target, so the merchant never retypes their own store —
// they just enter shopping queries and run.
const StoreDiscovery = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;
  const record = await unwrapResult(
    Store.resolveForUser(Environment.SERVER, { store }),
  );

  return <DiscoveryClient defaultTargetStore={record.domain} lockStore />;
};

export default ({ params }: PageProps<"/dashboard/[store]/discovery">) => (
  <DiscoveryShell>
    <Suspense fallback={<DiscoverySkeleton />}>
      <StoreDiscovery params={params} />
    </Suspense>
  </DiscoveryShell>
);
