import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceFilePenIcon,
  GaugeIcon,
  PlusIcon,
  RadarIcon,
  UploadIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { providerLogos } from "@/content/provider-logos";
import { Link } from "@/i18n/navigation";
import { formatRelativeTime } from "@/lib/date";
import type * as Store from "@/server/app/store";
import { Crosshair } from "./grid";

export const HubStoreGrid = async ({ stores }: HubStoreGrid.Props) => {
  const [translate, locale] = await Promise.all([
    getTranslations("dashboard.hub"),
    getLocale(),
  ]);
  const numbers = new Intl.NumberFormat(locale);
  const percentages = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const totals = stores.reduce(
    (current, store) => ({
      products: current.products + store.productCount,
      simulations: current.simulations + store.simulations,
      wins:
        current.wins + Math.round((store.winRate / 100) * store.simulations),
      visits: current.visits + store.agentVisits,
    }),
    { products: 0, simulations: 0, wins: 0, visits: 0 },
  );
  const multiple = stores.length > 1;

  return (
    <div className="min-w-0">
      <div className="relative isolate border-accent-foreground border-b text-background-rich">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-primary-text via-primary-text to-emphasis [clip-path:polygon(0_0,calc(100%_-_16px)_0,100%_16px,100%_100%,0_100%)]"
        />
        <div className="flex flex-col gap-6 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <CommerceBasketShoppingIcon
              aria-hidden
              className="size-8 shrink-0 text-background-rich/80"
            />
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-heading font-medium text-3xl tabular-nums">
                {numbers.format(stores.length)}
              </span>
              <span className="text-background-rich/85 text-sm">
                {translate("aggregates.stores")}
              </span>
            </p>
          </div>
          <div className="shrink-0">
            <Button
              color="neutral"
              render={<Link href="/onboarding/connect" />}
            >
              <PlusIcon aria-hidden className="size-4" />
              {translate("action.primary")}
            </Button>
          </div>
        </div>
        {multiple && (
          <dl className="grid grid-cols-1 border-background-rich/20 border-t sm:grid-cols-3 sm:divide-x sm:divide-background-rich/20">
            {[
              {
                key: "products",
                label: translate("aggregates.products"),
                value: numbers.format(totals.products),
              },
              {
                key: "winRate",
                label: translate("aggregates.avgWinRate"),
                value:
                  totals.simulations > 0
                    ? percentages.format(totals.wins / totals.simulations)
                    : "—",
              },
              {
                key: "visits",
                label: translate("aggregates.agentVisits30d"),
                value: numbers.format(totals.visits),
              },
            ].map((metric) => (
              <div
                key={metric.key}
                className="flex items-baseline justify-between gap-4 border-background-rich/20 border-b px-6 py-4 last:border-b-0 sm:block sm:border-b-0 sm:px-8"
              >
                <dt className="text-background-rich/80 text-sm">
                  {metric.label}
                </dt>
                <dd className="font-heading font-medium text-2xl tabular-nums sm:mt-2">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="grid min-w-0 grid-cols-1">
        {stores.map((store) => (
          <StoreEntry
            key={store.id}
            store={store}
            translate={translate}
            locale={locale}
            numbers={numbers}
            percentages={percentages}
          />
        ))}
      </div>
    </div>
  );
};

export namespace HubStoreGrid {
  export type Props = { stores: Store.Overview[] };
}

type HubTranslate = Awaited<
  ReturnType<typeof getTranslations<"dashboard.hub">>
>;

const StoreEntry = ({
  store,
  translate,
  locale,
  numbers,
  percentages,
}: {
  store: Store.Overview;
  translate: HubTranslate;
  locale: string;
  numbers: Intl.NumberFormat;
  percentages: Intl.NumberFormat;
}) => {
  const platform = (() => {
    switch (store.platform) {
      case "shopify":
      case "shopify-public":
        return "shopify";
      case "woocommerce":
      case "woocommerce-public":
        return "woocommerce";
      case "feed":
        return "feed";
      case "csv":
        return "csv";
      default:
        return "other";
    }
  })();
  const status = (() => {
    switch (store.status) {
      case "connected":
        return {
          label: translate("storeCard.status.connected"),
          color: "bg-success",
        };
      case "syncing":
        return {
          label: translate("storeCard.status.syncing"),
          color: "bg-primary",
        };
      case "error":
        return {
          label: translate("storeCard.status.error"),
          color: "bg-error",
        };
      case "disconnected":
        return {
          label: translate("storeCard.status.disconnected"),
          color: "bg-foreground-dimmed",
        };
      default:
        return {
          label: translate("storeCard.status.pending"),
          color: "bg-warning",
        };
    }
  })();

  return (
    <Link
      href={`/dashboard/${store.id}`}
      className="group relative block min-w-0 border-accent-foreground border-b bg-background-rich text-foreground transition-colors hover:bg-primary/3 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2"
    >
      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 px-6 py-8 sm:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-h-8 items-center gap-3">
              <PlatformMark platform={platform} />
              <span className="text-foreground-dimmed text-sm">
                {translate(`platforms.${platform}`)}
              </span>
            </div>
            <span className="inline-flex items-center gap-2 text-foreground-dimmed text-xs">
              <span
                aria-hidden
                className={cn("size-1.5 shrink-0 rounded-full", status.color)}
              />
              {status.label}
            </span>
          </div>
          <h2 className="break-words font-heading font-medium text-2xl text-foreground-rich leading-tight transition-colors group-hover:text-primary-text">
            {store.name}
          </h2>
          <p className="mt-2 break-all text-foreground-dimmed text-sm">
            {store.domain}
          </p>
        </div>
        <dl className="grid min-w-0 grid-cols-1 border-accent-foreground border-t bg-linear-to-br from-primary/10 via-primary/4 to-background-rich sm:grid-cols-3 sm:grid-rows-[auto_auto_auto] lg:border-t-0 lg:border-l">
          <StoreMetric
            icon={<CommerceFilePenIcon aria-hidden className="size-7" />}
            label={translate("storeCard.products")}
            value={numbers.format(store.productCount)}
          />
          <StoreMetric
            icon={<GaugeIcon aria-hidden className="size-7" />}
            label={translate("storeCard.winRate")}
            value={
              store.simulations > 0
                ? percentages.format(store.winRate / 100)
                : "—"
            }
            note={
              store.simulations === 0
                ? translate("storeCard.noSimulations")
                : undefined
            }
          />
          <StoreMetric
            icon={<RadarIcon aria-hidden className="size-7" />}
            label={translate("storeCard.agents30d")}
            value={numbers.format(store.agentVisits)}
          />
        </dl>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-t px-6 py-4 sm:px-8">
        <p className="text-foreground-dimmed text-xs">
          {store.lastSyncedAt
            ? translate("storeCard.synced", {
                time: formatRelativeTime(store.lastSyncedAt, locale),
              })
            : translate("storeCard.notSyncedYet")}
        </p>
        <span className="inline-flex items-center gap-2 font-medium text-primary-text text-sm">
          {translate("storeCard.openDashboard")}
          <ArrowRightIcon aria-hidden className="size-4" />
        </span>
      </div>
      <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
    </Link>
  );
};

const PlatformMark = ({ platform }: { platform: string }) => {
  switch (platform) {
    case "shopify":
    case "woocommerce": {
      const artwork = providerLogos[platform];
      return (
        <Image
          src={artwork.src}
          alt=""
          width={artwork.width}
          height={artwork.height}
          className={
            platform === "woocommerce"
              ? "h-6 w-auto max-w-20 object-contain"
              : "h-8 w-auto object-contain"
          }
        />
      );
    }
    case "csv":
      return <UploadIcon aria-hidden className="size-8 text-primary-text" />;
    default:
      return (
        <CommerceFilePenIcon aria-hidden className="size-8 text-primary-text" />
      );
  }
};

const StoreMetric = ({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note?: string;
}) => (
  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-accent-foreground border-b px-6 py-5 last:border-b-0 sm:row-span-3 sm:grid-cols-1 sm:grid-rows-subgrid sm:items-start sm:border-r sm:border-b-0 sm:py-6 sm:last:border-r-0 lg:px-4">
    <dt className="flex items-center gap-3 font-medium text-foreground-dimmed text-sm leading-relaxed sm:block sm:text-xs">
      <span className="shrink-0 text-primary-text sm:mb-4 sm:block">
        {icon}
      </span>
      {label}
    </dt>
    <dd className="break-all font-heading font-medium text-3xl text-foreground-rich tabular-nums">
      {value}
    </dd>
    {note && (
      <dd className="col-span-2 text-foreground-dimmed text-xs leading-relaxed sm:col-span-1">
        {note}
      </dd>
    )}
  </div>
);
