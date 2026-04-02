import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import * as Authentication from "@/server/app/authentication";
import * as Store from "@/server/app/store";
import { SettingsClient } from "./_components/settings-client";

const SettingsSkeleton = () => (
  <div className="-mx-8 mb-12 border-accent-foreground border-b">
    <div className="mx-8 flex gap-px bg-accent-foreground">
      <div className="hidden w-44 shrink-0 flex-col gap-px bg-accent-foreground md:flex">
        {(["a", "b", "c", "d", "e", "f"] as const).map((key) => (
          <div key={key} className="h-11 animate-pulse bg-background" />
        ))}
        <div className="min-h-8 flex-1 bg-background" />
      </div>
      <div className="flex-1 bg-background p-6">
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
  </div>
);

async function SettingsContent() {
  await connection();
  const [user, stores] = await Promise.all([
    unwrapResult(Authentication.getCurrentUser()),
    unwrapResult(Store.getForCurrentUser()),
  ]);
  return <SettingsClient user={user} stores={stores} />;
}

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="mx-8 px-6 py-8">
          <h1 className="font-medium text-4xl text-foreground">Settings</h1>
          <p className="mt-1 font-light text-2xl text-foreground-dimmed">
            Manage your account, integrations, and preferences.
          </p>
        </div>
      </div>
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </div>
  </div>
);
