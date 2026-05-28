"use client";

import { PlusIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import * as Store from "@/server/app/store";

const PLATFORM_BADGE: Record<string, { label: string; className: string }> = {
  shopify: { label: "SH", className: "bg-[#96BF48] text-white" },
  "shopify-public": { label: "SH", className: "bg-[#96BF48] text-white" },
  woocommerce: { label: "WC", className: "bg-[#7F54B3] text-white" },
  feed: { label: "FD", className: "bg-primary/80 text-primary-foreground" },
  csv: { label: "CSV", className: "bg-accent-foreground text-background" },
};

export const IntegrationsSection = ({ stores }: { stores: Store.Type[] }) => {
  const toast = useToastManager();

  const [handleSync, isSyncing] = useAsyncAction(async (id: string) => {
    const result = await Store.syncProducts({ store: id });
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
            {stores.map((store) => {
              const badge = PLATFORM_BADGE[store.platform] ?? {
                label: store.platform.slice(0, 2).toUpperCase(),
                className: "bg-foreground-dimmed text-background",
              };
              return (
                <div
                  key={store.id}
                  className="flex items-center justify-between px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center font-bold text-sm",
                        badge.className,
                      )}
                    >
                      {badge.label}
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
              );
            })}
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
