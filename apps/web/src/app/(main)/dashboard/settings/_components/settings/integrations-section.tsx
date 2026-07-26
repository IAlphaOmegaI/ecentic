"use client";

import { PlusIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import Link from "next/link";
import type * as GoogleMerchant from "@/server/app/integration/google-merchant";
import * as Store from "@/server/app/store";

/** Compact Google Shopping state for the store row — management lives on the
 * dedicated /dashboard/{store}/google-shopping page. */
const googleSummary = (
  status: GoogleMerchant.Status | null,
): { label: string; className: string } => {
  if (!status?.supported)
    return {
      label: "Coming soon",
      className: "bg-foreground/5 text-foreground-dimmed",
    };

  switch (true) {
    case !status.connected:
      return {
        label: "Not connected",
        className: "bg-foreground/5 text-foreground-dimmed",
      };
    case status.provisioned:
      return {
        label: `Active · ${status.offers.live} live`,
        className: "bg-success/10 text-success",
      };
    case status.linkState === "active":
      return { label: "Linked", className: "bg-success/10 text-success" };
    default:
      return {
        label: "Setup in progress",
        className: "bg-warning/10 text-warning",
      };
  }
};

const PLATFORM_BADGE: Record<string, { label: string; className: string }> = {
  shopify: { label: "SH", className: "bg-[#96BF48] text-background-rich" },
  "shopify-public": {
    label: "SH",
    className: "bg-[#96BF48] text-background-rich",
  },
  woocommerce: { label: "WC", className: "bg-[#7F54B3] text-background-rich" },
  feed: { label: "FD", className: "bg-primary/80 text-primary-foreground" },
  csv: { label: "CSV", className: "bg-accent-foreground text-background" },
};

export const IntegrationsSection = ({
  stores,
  google,
}: {
  stores: Store.Type[];
  google: Record<string, GoogleMerchant.Status | null>;
}) => {
  const toast = useToastManager();

  const [handleSync, isSyncing] = useAsyncAction(async (id: string) => {
    const result = await Store.syncProducts({ store: id });
    if (!result.success) {
      // const isExpired = result.error.message.includes(
      //   "Shopify authorization has expired",
      // );
      // toast.add({
      //   title: isExpired ? "Reconnect required" : "Sync failed",
      //   description: isExpired
      //     ? "Your Shopify authorization has expired. Please reconnect your store."
      //     : undefined,
      //   type: "error",
      //   ...(isExpired && {
      //     actionLabel: "Reconnect",
      //     onAction: () => {
      //       const shopId = new URL(domain).hostname;
      //       window.location.href = `/api/integrations/shopify/install?shop=${encodeURIComponent(shopId)}`;
      //     },
      //   }),
      // });

      toast.add({ title: "Sync failed", type: "error" });
      return;
    }
    toast.add({ title: "Sync started", type: "success" });
  });

  return (
    <div className="divide-y divide-accent-foreground">
      <div>
        <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-semibold text-foreground-rich text-sm">
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
                <div key={store.id} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-9 items-center justify-center rounded-md font-bold text-sm",
                          badge.className,
                        )}
                      >
                        {badge.label}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {store.domain}
                        </p>
                        <p className="mt-0.5 text-foreground-dimmed text-xs capitalize">
                          {store.platform} · {store.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-success/10 px-2 py-0.5 font-semibold text-[11px] text-success uppercase tracking-[0.05em]">
                        Connected
                      </span>
                      <Button
                        color="neutral"
                        disabled={isSyncing}
                        onClick={() => handleSync(store.id)}
                      >
                        {isSyncing ? "Syncing…" : "Sync Now"}
                      </Button>
                    </div>
                  </div>
                  {(() => {
                    const status = google[store.id] ?? null;
                    const summary = googleSummary(status);
                    return (
                      <div className="mt-3 flex flex-wrap items-center gap-3 border-accent-foreground border-t pt-3">
                        <span className="text-foreground-dimmed text-xs">
                          Google Shopping
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-semibold text-[11px] uppercase tracking-[0.05em]",
                            summary.className,
                          )}
                        >
                          {summary.label}
                        </span>
                        {status?.supported && (
                          <Link
                            href={`/dashboard/${store.id}/google-shopping`}
                            className="text-primary text-xs hover:underline"
                          >
                            Manage →
                          </Link>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4">
        <Link
          href="/onboarding/connect"
          className="flex w-fit items-center gap-2 rounded-md border border-accent-foreground border-dashed px-4 py-2.5 text-foreground-dimmed text-sm transition-colors duration-150 hover:border-primary hover:text-primary"
        >
          <PlusIcon className="size-4" />
          Connect another store
        </Link>
      </div>
    </div>
  );
};
