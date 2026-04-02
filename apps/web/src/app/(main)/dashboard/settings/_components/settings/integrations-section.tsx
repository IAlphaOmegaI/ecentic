"use client";

import { PlusIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import * as Store from "@/server/app/store";

export const IntegrationsSection = ({ stores }: { stores: Store.Type[] }) => {
  const toast = useToastManager();

  const [handleSync, isSyncing] = useAsyncAction(async (storeId: string) => {
    const result = await Store.syncProducts({ storeId });
    if (!result.success) {
      toast.add({ title: "Sync failed", type: "error" });
      return;
    }
    toast.add({ title: "Sync started", type: "success" });
  });

  return (
    <div className="divide-y divide-accent-foreground">
      <div>
        <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-medium text-base text-foreground">
            Connected Stores
          </p>
        </div>
        {stores.length === 0 ? (
          <div className="p-6 text-foreground-dimmed text-sm">
            No stores connected yet.
          </div>
        ) : (
          <div className="divide-y divide-accent-foreground">
            {stores.map((store) => (
              <div
                key={store.id}
                className="flex items-center justify-between px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center bg-[#96BF48] font-bold text-sm text-white">
                    {store.platform === "shopify" ? "SH" : "WC"}
                  </div>
                  <div>
                    <p className="font-medium text-base text-foreground">
                      {store.domain}
                    </p>
                    <p className="font-light text-foreground-dimmed text-sm capitalize">
                      {store.platform} · {store.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-success/10 px-2 py-0.5 font-medium text-sm text-success">
                    Connected
                  </span>
                  <Button
                    variant="outline"
                    color="neutral"
                    disabled={isSyncing}
                    onClick={() => handleSync(store.id)}
                  >
                    {isSyncing ? "Syncing…" : "Sync Now"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        <button
          type="button"
          className="flex items-center gap-2 border border-accent-foreground border-dashed px-4 py-2.5 text-foreground-dimmed text-sm transition-colors hover:border-primary hover:text-primary"
        >
          <PlusIcon className="size-4" />
          Connect another store
        </button>
      </div>
    </div>
  );
};
