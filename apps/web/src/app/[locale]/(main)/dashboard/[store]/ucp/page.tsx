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
  const resolved = await Store.resolveForUser(Environment.SERVER, {
    store,
  });
  if (!resolved.success) return <ChannelLoadError />;
  const [profile, products] = await Promise.all([
    Ucp.getProfile(Environment.SERVER),
    Product.find(Environment.SERVER, {
      where: and(
        eq(schema.product.storeId, resolved.data.id),
        eq(schema.product.userId, resolved.data.userId),
      ),
    }),
  ]);

  // Blocked accounts render nothing beneath the paywall overlay. An entitled
  // account with no profile saved yet resolves to `null` too, so the two are
  // told apart by the result rather than by the unwrapped value.
  if (!profile.success) {
    if (isSubscriptionRequired(profile.error)) return null;
    return <ChannelLoadError />;
  }

  if (!products.success) return <ChannelLoadError />;

  return (
    <UcpManager
      store={resolved.data}
      profile={profile.data}
      products={products.data}
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
