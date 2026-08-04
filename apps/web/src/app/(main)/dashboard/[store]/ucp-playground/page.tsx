import { unwrapResult } from "@zenncore/utils";
import { Suspense } from "react";
import { PlaygroundClient } from "@/components/ucp-playground/playground-client";
import {
  AGENT_PROFILE,
  resolveShoppingService,
} from "@/server/app/intelligence/ucp/playground";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { Crosshair, StatusPill } from "../../_components/grid";
import { PlaygroundSkeleton } from "./_components/skeletons";

type StoreParams = PageProps<"/dashboard/[store]/ucp-playground">["params"];

// Resolve the store the dashboard is scoped to and hand the playground an
// already-connected session, so the merchant never retypes their own domain.
// A store without a reachable UCP profile falls through to the connect form
// with its domain prefilled.
const ConnectedPlayground = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;
  const record = await unwrapResult(
    Store.resolveForUser(Environment.SERVER, { store }),
  );

  const service = await resolveShoppingService(record.domain);

  return (
    <PlaygroundClient
      defaultStoreUrl={record.domain}
      lockStore
      initialConnection={
        service.success
          ? {
              transport: service.transport,
              endpoint: service.endpoint,
              profileUrl: service.profileUrl,
              agentProfileUrl: AGENT_PROFILE,
            }
          : null
      }
    />
  );
};

export default ({ params }: PageProps<"/dashboard/[store]/ucp-playground">) => {
  return (
    <div className="mx-8 flex h-full flex-col border-accent-foreground border-x pb-8">
      {/* Title */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <StatusPill tone="neutral">Sandbox — UCP flow testing</StatusPill>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              UCP Playground
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              Test catalog search, product lookup, cart, and checkout operations
              against any UCP-compliant store.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="-mx-8 min-h-0 flex-1 border-accent-foreground border-b">
        <div className="relative mx-8 flex h-full flex-col bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <Suspense fallback={<PlaygroundSkeleton />}>
            <ConnectedPlayground params={params} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};
