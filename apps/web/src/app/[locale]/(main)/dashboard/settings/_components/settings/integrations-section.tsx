"use client";

import { PlusIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { seo } from "@/lib/seo";
import type * as GoogleMerchant from "@/server/app/integration/google-merchant";
import * as Store from "@/server/app/store";

/** Compact Google Shopping state for the store row — management lives on the
 * dedicated /dashboard/{store}/google-shopping page. Takes the translator so the
 * label follows the active locale instead of being pinned to English. */
const googleSummary = (
  status: GoogleMerchant.Status | null,
  translate: ReturnType<
    typeof useTranslations<"dashboard.settings.integrations">
  >,
): { label: string; className: string } => {
  if (!status?.supported)
    return {
      label: translate("google.comingSoon"),
      className: "bg-foreground/5 text-foreground-dimmed",
    };

  switch (true) {
    case !status.connected:
      return {
        label: translate("google.notConnected"),
        className: "bg-foreground/5 text-foreground-dimmed",
      };
    case status.provisioned:
      return {
        label: translate("google.active", { count: status.offers.live }),
        className: "bg-success/10 text-success",
      };
    case status.linkState === "active":
      return {
        label: translate("google.linked"),
        className: "bg-success/10 text-success",
      };
    default:
      return {
        label: translate("google.setupInProgress"),
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
  "woocommerce-public": {
    label: "WC",
    className: "bg-[#7F54B3] text-background-rich",
  },
  feed: { label: "FD", className: "bg-primary/80 text-primary-foreground" },
  csv: { label: "CSV", className: "bg-accent-foreground text-background" },
};

/**
 * Public catalog imports are read-only — no credentials, so no publishing, no
 * tracker, no attribution. Each points at the verified connect that upgrades
 * the same row in place.
 */
const upgradeFor = (store: Store.Type) => {
  switch (store.platform) {
    case "shopify-public":
      return { key: "upgradeShopify" as const, href: seo.shopifyAppStore };
    case "woocommerce-public":
      return {
        key: "upgradeWooCommerce" as const,
        href: `/onboarding/connect/woocommerce?store_url=${encodeURIComponent(store.domain)}`,
      };
    default:
      return null;
  }
};

export const IntegrationsSection = ({
  stores,
  google,
}: {
  stores: Store.Type[];
  google: Record<string, GoogleMerchant.Status | null>;
}) => {
  const translate = useTranslations("dashboard.settings.integrations");
  const toast = useToastManager();

  const [handleSync, isSyncing] = useAsyncAction(async (store: Store.Type) => {
    await toast
      .promise(
        (async () => {
          const result = await Store.syncProducts({ store: store.id });
          if (!result.success) throw result.error;
          return result.data;
        })(),
        {
          loading: {
            title: translate("toast.syncing"),
            description: store.domain,
          },
          success: {
            title: translate("toast.synced"),
            description: store.domain,
          },
          error: (error: unknown) => {
            const message =
              error instanceof Error
                ? error.message
                : translate("toast.genericError");
            const needsReconnect =
              (store.platform === "shopify" ||
                store.platform === "shopify-public") &&
              /reconnect your store|access token/i.test(message);
            const returnTo = `${window.location.pathname}${window.location.search}`;

            return {
              title: needsReconnect
                ? translate("toast.reconnectRequired")
                : translate("toast.syncFailed"),
              description: message,
              ...(needsReconnect && {
                actionLabel: translate("toast.reconnectAction"),
                onAction: () => {
                  window.location.href = `/api/integrations/shopify/install?shop=${encodeURIComponent(store.domain)}&return_to=${encodeURIComponent(returnTo)}`;
                },
              }),
            };
          },
        },
      )
      .catch(() => null);
  });

  return (
    <div className="divide-y divide-accent-foreground">
      <div>
        <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-semibold text-foreground-rich text-sm">
            {translate("title")}
          </p>
        </div>
        {stores.length === 0 ? (
          <div className="p-6 text-foreground-dimmed text-sm">
            {translate("empty")}
          </div>
        ) : (
          <div className="divide-y divide-accent-foreground">
            {stores.map((store) => {
              const badge = PLATFORM_BADGE[store.platform] ?? {
                label: store.platform.slice(0, 2).toUpperCase(),
                className: "bg-foreground-dimmed text-background",
              };
              const status = google[store.id] ?? null;
              const summary = googleSummary(status, translate);
              const upgrade = upgradeFor(store);

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
                        {upgrade && (
                          <p className="mt-1 text-foreground-dimmed text-xs">
                            {translate("publicImport.note")}{" "}
                            <Link
                              href={upgrade.href}
                              className="text-primary hover:underline"
                            >
                              {translate(`publicImport.${upgrade.key}`)}
                            </Link>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-success/10 px-2 py-0.5 font-semibold text-[11px] text-success uppercase tracking-[0.05em]">
                        {translate("connected")}
                      </span>
                      <Button
                        color="neutral"
                        disabled={isSyncing}
                        onClick={() => handleSync(store)}
                      >
                        {isSyncing
                          ? translate("action.syncing")
                          : translate("action.sync")}
                      </Button>
                    </div>
                  </div>
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
                        {translate("google.manage")}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4">
        <Link
          href="/onboarding/connect"
          className="flex w-fit items-center gap-2 rounded-md border border-accent-foreground border-dashed px-4 py-2.5 text-foreground-dimmed text-sm transition-colors duration-150 hover:border-primary hover:text-primary-text"
        >
          <PlusIcon className="size-4" />
          {translate("action.connectAnother")}
        </Link>
      </div>
    </div>
  );
};
