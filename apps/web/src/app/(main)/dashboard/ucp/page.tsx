import { getProfile } from "@/server/app/intelligence/ucp";
import { getForCurrentUser } from "@/server/app/product";
import { UcpManager } from "./_components/ucp-manager";
import { unwrapResult } from "@zenncore/utils";

export default async () => {
  const [profile, products] = await Promise.all([
    unwrapResult(getProfile()),
    unwrapResult(getForCurrentUser()),
  ]);

  return <UcpManager profile={profile} products={products} />;
};
