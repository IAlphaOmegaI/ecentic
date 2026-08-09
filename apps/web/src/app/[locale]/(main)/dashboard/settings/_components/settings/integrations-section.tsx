"use client";

import { PlusIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import * as Store from "@/server/app/store";

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

export const IntegrationsSection = ({ stores }: { stores: Store.Type[] }) => {
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
              return (
                <div
                  key={store.id}
                  className="flex items-center justify-between px-4 py-4"
                >
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
          {translate("action.connectAnother")}
        </Link>
      </div>
    </div>
  );
};
