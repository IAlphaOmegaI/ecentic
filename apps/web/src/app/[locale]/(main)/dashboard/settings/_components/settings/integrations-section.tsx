"use client";

import { ArrowRightIcon, FileIcon, GlobeIcon, PlusIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { seo } from "@/lib/seo";
import type * as GoogleMerchant from "@/server/app/integration/google-merchant";
import type { Status as RechargeStatus } from "@/server/app/integration/recharge/types";
import * as Store from "@/server/app/store.actions";
import { DashboardEmptyState } from "../../../_components/empty-state";
import { StoreDisconnection } from "./lifecycle-controls";
import { RechargeControls } from "./recharge-controls";

/** Compact Google Shopping state for the store row — management lives on the
 * dedicated /dashboard/{store}/google-shopping page. Takes the translator so the
 * label follows the active locale instead of being pinned to English. */
const googleSummary = (
  status: GoogleMerchant.Status | null,
  translate: ReturnType<
    typeof useTranslations<"dashboard.settings.integrations">
  >,
  unavailable: string,
): { label: string; className: string } => {
  if (!status)
    return {
      label: unavailable,
      className: "bg-foreground/5 text-foreground-dimmed",
    };
  if (!status.supported)
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
  recharge,
}: {
  stores: Store.Type[];
  google: Record<string, GoogleMerchant.Status | null>;
  recharge: Record<string, RechargeStatus | null>;
}) => {
  const translate = useTranslations("dashboard.settings.integrations");
  const workspace = useTranslations("dashboard.settings.workspace");
  const toast = useToastManager();
  const lifecycle = useTranslations("dashboard.lifecycle");

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
        <div className="flex justify-end border-accent-foreground border-b px-4 py-4 sm:px-6">
          <Button
            variant="soft"
            color="primary"
            render={<Link href="/onboarding/connect" />}
          >
            <PlusIcon aria-hidden className="size-4" />
            {translate("action.connectAnother")}
          </Button>
        </div>
        {stores.length === 0 ? (
          <DashboardEmptyState
            title={translate("empty")}
            figure="channel-plug-hub"
            compact
          />
        ) : (
          <div className="divide-y divide-accent-foreground">
            {stores.map((store) => {
              const platformLogo = store.platform.startsWith("shopify")
                ? "/providers/shopify.svg"
                : store.platform.startsWith("woocommerce")
                  ? "/providers/woocommerce.svg"
                  : null;
              const status = google[store.id] ?? null;
              const summary = googleSummary(
                status,
                translate,
                workspace("unavailable"),
              );
              const upgrade = upgradeFor(store);

              return (
                <article
                  key={store.id}
                  id={`store-${store.id}`}
                  aria-labelledby={`store-${store.id}-name`}
                  className="min-w-0 scroll-mt-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        aria-hidden
                        className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-background-dimmed text-foreground-dimmed"
                      >
                        {platformLogo ? (
                          <Image
                            width={28}
                            height={28}
                            src={platformLogo}
                            alt=""
                            className="size-7 object-contain"
                          />
                        ) : store.platform === "csv" ? (
                          <FileIcon className="size-6" />
                        ) : (
                          <GlobeIcon className="size-6" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3
                          id={`store-${store.id}-name`}
                          className="wrap-anywhere font-semibold text-base text-foreground-rich"
                        >
                          {store.name}
                        </h3>
                        <p className="wrap-anywhere mt-0.5 text-foreground-dimmed text-sm">
                          {store.domain}
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 font-medium text-xs",
                          store.status === "disconnected" || upgrade
                            ? "bg-foreground/5 text-foreground-dimmed"
                            : "bg-success/10 text-success",
                        )}
                      >
                        {store.status === "disconnected"
                          ? lifecycle("disconnected")
                          : upgrade
                            ? workspace("readOnly")
                            : translate("connected")}
                      </span>
                      <Button
                        variant="ghost"
                        color="neutral"
                        render={<Link href={`/dashboard/${store.id}`} />}
                      >
                        {workspace("manageStore")}
                        <ArrowRightIcon aria-hidden className="size-4" />
                      </Button>
                      <Button
                        color="neutral"
                        variant="soft"
                        disabled={isSyncing || store.status === "disconnected"}
                        onClick={() => handleSync(store)}
                      >
                        {isSyncing
                          ? translate("action.syncing")
                          : translate("action.sync")}
                      </Button>
                      {store.status !== "disconnected" && (
                        <StoreDisconnection
                          store={store.id}
                          domain={store.domain}
                        />
                      )}
                    </div>
                  </div>
                  <section
                    aria-label={workspace("services")}
                    className="bg-background"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-t px-4 py-4 sm:px-6">
                      <div className="space-y-2">
                        <h4 className="font-medium text-foreground text-sm">
                          Google Shopping
                        </h4>
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 font-medium text-xs",
                            summary.className,
                          )}
                        >
                          {summary.label}
                        </span>
                      </div>
                      {status?.supported && (
                        <Button
                          variant="soft"
                          color="neutral"
                          render={
                            <Link
                              href={`/dashboard/${store.id}/google-shopping`}
                            />
                          }
                        >
                          {translate("google.manage")}
                        </Button>
                      )}
                    </div>
                    <RechargeControls
                      store={store.id}
                      status={recharge[store.id] ?? null}
                    />
                  </section>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
