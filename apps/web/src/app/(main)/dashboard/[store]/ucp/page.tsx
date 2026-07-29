import { unwrapResult } from "@zenncore/utils";
import { Suspense } from "react";
import * as Ucp from "@/server/app/intelligence/ucp/profile";
import * as Product from "@/server/app/product";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { Crosshair, SectionKicker, StatusPill } from "../../_components/grid";
import { UcpManager } from "./_components/ucp-manager";
import { UcpSectionSkeleton } from "./skeletons";

const UcpContent = async ({ store }: { store: string }) => {
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

export default async ({ params }: { params: Promise<{ store: string }> }) => {
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
                Universal Commerce Protocol
              </StatusPill>
              <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
                UCP & Structured Data
              </h1>
              <p className="mt-1 text-foreground-dimmed text-sm">
                Your merchant identity for AI shopping agents.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 bg-background-rich">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <div className="border-accent-foreground border-b p-4">
              <SectionKicker>01 — Protocol</SectionKicker>
              <h2 className="mt-2 font-semibold text-foreground-rich text-lg">
                Structured Data
              </h2>
            </div>
            <div className="p-6">
              <Suspense fallback={<UcpSectionSkeleton />}>
                <UcpContent store={store} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
