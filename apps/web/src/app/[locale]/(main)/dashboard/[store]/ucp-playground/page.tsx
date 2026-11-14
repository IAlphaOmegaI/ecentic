import { Suspense } from "react";
import { PlaygroundClient } from "@/components/ucp-playground/playground-client";
import {
  AGENT_PROFILE,
  resolveShoppingService,
} from "@/server/app/intelligence/ucp/playground";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { ChannelLoadError } from "../channels/_components/summary";
import { PlaygroundShell, PlaygroundSkeleton } from "./_components/shell";

type StoreParams =
  PageProps<"/[locale]/dashboard/[store]/ucp-playground">["params"];

// Resolve the store the dashboard is scoped to and hand the playground an
// already-connected session, so the merchant never retypes their own domain.
// A store without a reachable UCP profile falls through to the connect form
// with its domain prefilled.
const ConnectedPlayground = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;
  const storeResult = await Store.resolveForUser(Environment.SERVER, { store });
  if (!storeResult.success) return <ChannelLoadError />;
  const record = storeResult.data;

  const service = await resolveShoppingService(record.domain);

  return (
    <PlaygroundClient
      appearance="dashboard"
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

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/ucp-playground">) => (
  <PlaygroundShell>
    <Suspense fallback={<PlaygroundSkeleton />}>
      <ConnectedPlayground params={params} />
    </Suspense>
  </PlaygroundShell>
);
