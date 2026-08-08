import { unwrapResult } from "@zenncore/utils";
import { Suspense } from "react";
import * as Ucp from "@/server/app/intelligence/ucp/profile";
import * as Product from "@/server/app/product";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { UcpSectionSkeleton, UcpShell } from "./_components/shell";
import { UcpManager } from "./_components/ucp-manager";

type StoreParams = PageProps<"/dashboard/[store]/ucp">["params"];

const UcpContent = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;
  const [profile, products, stores] = await Promise.all([
    unwrapResult(Ucp.getProfile(Environment.SERVER)),
    unwrapResult(Product.skimForCurrentUser(Environment.SERVER, { store })),
    unwrapResult(Store.getForCurrentUser(Environment.SERVER)),
  ]);

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
