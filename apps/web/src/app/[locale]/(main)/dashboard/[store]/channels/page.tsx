import { connection } from "next/server";
import { Suspense } from "react";
import * as GoogleMerchant from "@/server/app/integration/google-merchant";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { ChannelLoadError, ChannelsSummary } from "./_components/summary";
import { ChannelsHomeShell, ChannelsSkeleton } from "./_components/workspace";

const ChannelRecords = async ({
  params,
}: {
  params: Promise<{ store: string }>;
}) => {
  await connection();
  const { store } = await params;
  const [record, google] = await Promise.all([
    Store.resolveForUser(Environment.SERVER, { store }),
    GoogleMerchant.getStatus(Environment.SERVER, { store }),
  ]);
  if (!record.success) return <ChannelLoadError />;
  const source = record.data;
  return (
    <ChannelsSummary
      store={store}
      source={{
        name: source.name,
        domain: source.domain,
        platform: source.platform,
        status: source.status,
        lastSyncedAt: source.lastSyncedAt?.toISOString() ?? null,
      }}
      google={google.success ? google.data : null}
    />
  );
};

export default function ChannelsPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  return (
    <ChannelsHomeShell>
      <Suspense fallback={<ChannelsSkeleton />}>
        <ChannelRecords params={params} />
      </Suspense>
    </ChannelsHomeShell>
  );
}
