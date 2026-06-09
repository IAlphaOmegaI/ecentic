import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import * as Authentication from "@/server/app/authentication";
import * as Store from "@/server/app/store";
import * as Subscription from "@/server/app/subscription";
import { Environment } from "@/server/utils/environment";
import { Crosshair } from "../_components/grid";
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
  const [user, stores, subscriptionResult, invoicesResult] = await Promise.all([
    unwrapResult(Authentication.getCurrentUser(Environment.SERVER)),
    unwrapResult(Store.getForCurrentUser(Environment.SERVER)),
    Subscription.getCurrentSubscription(Environment.SERVER),
    Subscription.listInvoices(Environment.SERVER),
  ]);

  const subscription = subscriptionResult.success
    ? subscriptionResult.data
    : null;
  const invoices = invoicesResult.success ? invoicesResult.data : [];

  return (
    <SettingsClient
      user={user}
      stores={stores}
      subscription={subscription}
      invoices={invoices}
    />
  );
};

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
              <span className="size-2 bg-accent-rich" />
              Account & workspace
            </div>
            <h1 className="mt-3 font-medium text-4xl text-foreground">
              Settings
            </h1>
            <p className="mt-1 font-light text-foreground-dimmed text-lg">
              Manage your account, integrations, and preferences.
            </p>
          </div>
        </div>
      </div>

      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 bg-background-rich">
          <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Suspense fallback={<SettingsSkeleton />}>
            <SettingsContent />
          </Suspense>
        </div>
      </div>
    </div>
  </div>
);
