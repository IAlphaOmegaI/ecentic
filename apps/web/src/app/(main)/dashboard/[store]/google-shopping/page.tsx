import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import * as GoogleMerchant from "@/server/app/integration/google-merchant";
import { Environment } from "@/server/utils/environment";
import { Crosshair, SectionGutter } from "../../_components/grid";
import {
  DiagnosticsPanel,
  GoogleShoppingManager,
} from "./_components/google-shopping-client";

const SectionBox = ({ children }: { children: React.ReactNode }) => (
  <div className="-mx-8 border-accent-foreground border-b">
    <div className="relative mx-8 bg-background-rich">
      <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      {children}
    </div>
  </div>
);

const ManagerSkeleton = () => (
  <div className="flex flex-col divide-y divide-accent-foreground">
    {(["a", "b"] as const).map((key) => (
      <div key={key} className="flex flex-col gap-2 p-4">
        <div className="h-4 w-56 animate-pulse bg-foreground/10" />
        <div className="h-3 w-full max-w-2xl animate-pulse bg-foreground/10" />
        <div className="h-9 w-40 animate-pulse bg-foreground/10" />
      </div>
    ))}
  </div>
);

/**
 * Manager + diagnostics off one status read. Diagnostics only exist once a
 * Merchant Center account is detected for the store — before that every call
 * behind the panel fails with "No Merchant Center account detected yet", so the
 * whole section stays out of the DOM rather than offering a dead button.
 */
const ChannelSections = async ({ store }: { store: string }) => {
  await connection();
  const status = unwrapResult(
    await GoogleMerchant.getStatus(Environment.SERVER, { store }),
  );

  return (
    <>
      <SectionBox>
        <GoogleShoppingManager store={store} status={status} />
      </SectionBox>

      {status.googleAccountId !== null && (
        <>
          <SectionGutter />
          <SectionBox>
            <div className="border-accent-foreground border-b p-4">
              <p className="font-semibold text-foreground-dimmed text-xs uppercase tracking-[0.14em]">
                Merchant Center diagnostics
              </p>
              <p className="mt-1 font-medium text-base text-foreground">
                Why products are disapproved or limited on Google
              </p>
            </div>
            <DiagnosticsPanel store={store} />
          </SectionBox>
        </>
      )}
    </>
  );
};

export default async ({ params }: { params: Promise<{ store: string }> }) => {
  const { store } = await params;

  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <div className="-mx-8 border-accent-foreground border-b">
          <div className="relative mx-8 px-6 py-8">
            <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
            <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
            <p className="font-semibold text-primary text-xs uppercase tracking-[0.14em]">
              Channel · Google Shopping
            </p>
            <h1 className="mt-2 font-bold text-2xl text-foreground-rich">
              Optimized listings on Google, without touching your store
            </h1>
            <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm">
              ecentic layers your published listing optimizations over your
              existing Google product feed as attribute overrides. Your store's
              Google plugin keeps owning prices, stock, and the product feed —
              ecentic manages titles, descriptions, and diagnostics on top.
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <SectionBox>
              <ManagerSkeleton />
            </SectionBox>
          }
        >
          <ChannelSections store={store} />
        </Suspense>
      </div>
    </div>
  );
};
