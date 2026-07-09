import { unwrapResult } from "@zenncore/utils";
import { Suspense } from "react";
import { DiscoveryClient } from "@/components/discovery/discovery-client";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { Crosshair, StatusPill } from "../../_components/grid";

type PageProps = {
  params: Promise<{ store: string }>;
};

const DiscoverySkeleton = () => (
  <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end">
    <div className="h-4 w-40 animate-pulse bg-accent-foreground/30" />
    <div className="h-9 flex-1 animate-pulse bg-accent-foreground/20" />
    <div className="h-9 w-40 animate-pulse bg-accent-foreground/30" />
  </div>
);

// Resolve the store the dashboard is scoped to and hand the discovery tool its
// domain as the fixed target, so the merchant never retypes their own store —
// they just enter shopping queries and run.
const StoreDiscovery = async ({ store }: { store: string }) => {
  const record = await unwrapResult(
    Store.resolveForUser(Environment.SERVER, { store }),
  );

  return <DiscoveryClient defaultTargetStore={record.domain} lockStore />;
};

export default async ({ params }: PageProps) => {
  const { store } = await params;

  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        {/* Title */}
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <div>
              <StatusPill tone="neutral">
                AI Visibility — Store discovery
              </StatusPill>
              <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
                AI Discovery
              </h1>
              <p className="mt-1 text-foreground-dimmed text-sm">
                See which stores AI shopping agents recommend for a query — and
                exactly why your store did or didn’t make the cut, and how it
                ranked.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <Suspense fallback={<DiscoverySkeleton />}>
              <StoreDiscovery store={store} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};
