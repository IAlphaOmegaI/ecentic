import { unwrapResult } from "@zenncore/utils";
import { Suspense } from "react";
import * as Ucp from "@/server/app/intelligence/ucp/profile";
import * as Product from "@/server/app/product";
import * as Store from "@/server/app/store";
import { isSubscriptionRequired } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { UcpSectionSkeleton, UcpShell } from "./_components/shell";
import { UcpManager } from "./_components/ucp-manager";

type StoreParams = PageProps<"/dashboard/[store]/ucp">["params"];

const UcpContent = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;
  const [profileResult, products, stores] = await Promise.all([
    Ucp.getProfile(Environment.SERVER),
    unwrapResult(Product.skimForCurrentUser(Environment.SERVER, { store })),
    unwrapResult(Store.getForCurrentUser(Environment.SERVER)),
  ]);

  // Blocked accounts render nothing beneath the paywall overlay. An entitled
  // account with no profile saved yet resolves to `null` too, so the two are
  // told apart by the result rather than by the unwrapped value.
  if (!profileResult.success) {
    if (isSubscriptionRequired(profileResult.error)) return null;
    throw profileResult.error;
  }

  const profile = profileResult.data;

  const shopifyStores = stores
    .filter(
      (store) =>
        store.platform === "shopify-public" || store.platform === "shopify",
    )
    .map((store) => ({ id: store.id, name: store.name }));

  return (
    <UcpManager
      profile={profile}
      products={products}
      shopifyStores={shopifyStores}
    />
  );
};

export default ({ params }: PageProps<"/dashboard/[store]/ucp">) => (
  <UcpShell>
    <Suspense fallback={<UcpSectionSkeleton />}>
      <UcpContent params={params} />
    </Suspense>
  </UcpShell>
);
