import { unwrapResult } from "@zenncore/utils";
import { Suspense } from "react";
import * as Ucp from "@/server/app/intelligence/ucp/profile";
import * as Product from "@/server/app/product";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { Crosshair, SectionKicker, StatusPill } from "../../_components/grid";
import { UcpManager } from "./_components/ucp-manager";

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
              <Suspense fallback={<Skeleton />}>
                <UcpContent store={store} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Skeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="border border-accent-foreground bg-background-rich p-5">
      <div className="flex items-center gap-6">
        <div className="size-14 shrink-0 bg-accent-foreground/20" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 bg-accent-foreground/20" />
          <div className="h-3 w-72 bg-accent-foreground/10" />
        </div>
      </div>
    </div>

    <div className="flex border border-accent-foreground">
      <div className="h-9 w-36 bg-accent-foreground/20" />
      <div className="h-9 w-48 bg-accent-foreground/10" />
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="border border-accent-foreground bg-background-rich">
        <div className="border-accent-foreground border-b px-4 py-2.5">
          <div className="h-4 w-24 bg-accent-foreground/20" />
        </div>
        <div className="divide-y divide-accent-foreground">
          {Array.from({ length: 9 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <div key={index} className="flex items-center gap-3 px-4 py-2.5">
              <div className="size-1.5 shrink-0 bg-accent-foreground/30" />
              <div className="h-3 w-28 bg-accent-foreground/20" />
              <div className="h-7 flex-1 bg-accent-foreground/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-72 border border-accent-foreground bg-background-rich" />
        <div className="h-32 border border-accent-foreground bg-background-rich" />
      </div>
    </div>
  </div>
);
