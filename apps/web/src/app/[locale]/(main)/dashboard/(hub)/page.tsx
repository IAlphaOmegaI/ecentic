import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { HubEmptyState } from "../_components/hub-empty-state";
import { HubShell, StoresSkeleton } from "../_components/hub-shell";
import { HubStoreGrid } from "../_components/hub-store-grid";

export default () => (
  <HubShell
    stores={
      <Suspense fallback={<StoresSkeleton />}>
        <Stores />
      </Suspense>
    }
  />
);

const Stores = async () => {
  await connection();
  const stores = await unwrapResult(
    Store.overviewForCurrentUser(Environment.SERVER),
  );

  if (stores.length === 0) return <HubEmptyState />;

  return <HubStoreGrid stores={stores} />;
};
