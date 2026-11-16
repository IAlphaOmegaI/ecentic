import { and, eq } from "drizzle-orm";
import { Suspense } from "react";
import * as Ucp from "@/server/app/intelligence/ucp/profile";
import * as Product from "@/server/app/product";
import * as Store from "@/server/app/store";
import { schema } from "@/server/database";
import { isSubscriptionRequired } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { ChannelLoadError } from "../channels/_components/summary";
import { UcpSectionSkeleton, UcpShell } from "./_components/shell";
import { UcpManager } from "./_components/ucp-manager";

type StoreParams = PageProps<"/[locale]/dashboard/[store]/ucp">["params"];

const UcpContent = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;
  const resolvedStore = await Store.resolveForUser(Environment.SERVER, {
    store,
  });
  if (!resolvedStore.success) return <ChannelLoadError />;
  const [profileResult, productsResult, storesResult] = await Promise.all([
    Ucp.getProfile(Environment.SERVER),
    Product.find(Environment.SERVER, {
      where: and(
        eq(schema.product.storeId, resolvedStore.data.id),
        eq(schema.product.userId, resolvedStore.data.userId),
      ),
    }),
    Store.getForCurrentUser(Environment.SERVER),
  ]);

  // Blocked accounts render nothing beneath the paywall overlay. An entitled
  // account with no profile saved yet resolves to `null` too, so the two are
  // told apart by the result rather than by the unwrapped value.
  if (!profileResult.success) {
    if (isSubscriptionRequired(profileResult.error)) return null;
    return <ChannelLoadError />;
  }

  if (!productsResult.success || !storesResult.success)
    return <ChannelLoadError />;
  const profile = profileResult.data;
  const products = productsResult.data;
  const stores = storesResult.data;

  const shopifyStores = stores
    .filter(
      (store) =>
        store.platform === "shopify-public" || store.platform === "shopify",
    )
    .map((store) => ({ id: store.id, name: store.name }));

  return (
    <UcpManager
      store={store}
      domain={resolvedStore.data.domain}
      profile={profile}
      products={products}
      shopifyStores={shopifyStores}
    />
  );
};

export default ({ params }: PageProps<"/[locale]/dashboard/[store]/ucp">) => (
  <UcpShell>
    <Suspense fallback={<UcpSectionSkeleton />}>
      <UcpContent params={params} />
    </Suspense>
  </UcpShell>
);
