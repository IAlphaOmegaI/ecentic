import { unwrapResult } from "@zenncore/utils";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import * as Authentication from "@/server/app/authentication";
import * as PerformanceFee from "@/server/app/billing/performance-fee";
import * as GoogleMerchant from "@/server/app/integration/google-merchant";
import * as Store from "@/server/app/store";
import * as Subscription from "@/server/app/subscription";
import { Environment } from "@/server/utils/environment";
import { Crosshair, StatusPill } from "../_components/grid";
import { SettingsClient } from "./_components/settings-client";

const SettingsSkeleton = () => (
  <div className="flex gap-px bg-accent-foreground">
    <div className="hidden w-44 shrink-0 flex-col gap-px bg-accent-foreground md:flex">
      {(["a", "b", "c", "d", "e", "f"] as const).map((key) => (
        <div key={key} className="h-11 animate-pulse bg-background-rich" />
      ))}
      <div className="min-h-8 flex-1 bg-background-rich" />
    </div>
    <div className="flex-1 bg-background-rich p-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="size-16 animate-pulse bg-foreground/10" />
        <div className="h-8 w-32 animate-pulse bg-foreground/10" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {(["g", "h", "i", "j"] as const).map((key) => (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="h-3 w-20 animate-pulse bg-foreground/10" />
            <div className="h-9 animate-pulse bg-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SettingsContent = async () => {
  await connection();

  // Resolve the session before fanning out. A server action on this page can
  // destroy the session and Next then re-renders us in the same response —
  // sign-out does exactly that — so treat a missing session as "go sign in",
  // not as an error. Checking first also skips the Stripe/database calls below,
  // which would only fail anyway.
  const account = await Authentication.getCurrentUser(Environment.SERVER);

  if (!account.success) redirect("/sign-in");

  const user = account.data;
  const [stores, subscriptionResult, invoicesResult, performanceResult] =
    await Promise.all([
      unwrapResult(Store.getForCurrentUser(Environment.SERVER)),
      Subscription.getCurrentSubscription(Environment.SERVER),
      Subscription.listInvoices(Environment.SERVER),
      PerformanceFee.getCurrentPeriodSummary(Environment.SERVER),
    ]);

  const googleEntries = await Promise.all(
    stores.map(async (store) => {
      const status = await GoogleMerchant.getStatus(Environment.SERVER, {
        store: store.id,
      });
      return [store.id, status.success ? status.data : null] as const;
    }),
  );
  const google = Object.fromEntries(googleEntries);

  const subscription = subscriptionResult.success
    ? subscriptionResult.data
    : null;
  const invoices = invoicesResult.success ? invoicesResult.data : [];
  const performanceFee = performanceResult.success
    ? performanceResult.data
    : null;

  return (
    <SettingsClient
      user={user}
      stores={stores}
      google={google}
      subscription={subscription}
      invoices={invoices}
      performanceFee={performanceFee}
    />
  );
};

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div>
            <StatusPill tone="neutral">Account & workspace</StatusPill>
            <h1 className="mt-3 font-bold text-[28px] text-foreground-rich tracking-[-0.02em]">
              Settings
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              Manage your account, integrations, and preferences.
            </p>
          </div>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <Suspense fallback={<SettingsSkeleton />}>
            <SettingsContent />
          </Suspense>
        </div>
      </div>
    </div>
  </div>
);
