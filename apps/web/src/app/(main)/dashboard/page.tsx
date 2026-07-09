import {
  ArrowRightIcon,
  CopyIcon,
  GaugeIcon,
  PlusIcon,
  RadarIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { type ReactNode, Suspense } from "react";
import { formatRelativeTime } from "@/lib/date";
import * as Authentication from "@/server/app/authentication";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { Crosshair, StatusPill } from "./_components/grid";
import { NotificationBell } from "./_components/notification-bell";

const PLATFORM_LABELS: Record<string, string> = {
  shopify: "Shopify",
  "shopify-public": "Shopify",
  woocommerce: "WooCommerce",
  feed: "Product Feed",
  csv: "CSV Import",
};

export default () => (
  <div className="flex flex-1 flex-col overflow-hidden">
    <header className="flex h-14 shrink-0 items-center justify-between border-accent-foreground border-b bg-background-rich px-8">
      <Link href="/dashboard" aria-label="ecentic">
        <Image
          src="/images/trademark.svg"
          alt="ecentic"
          width={96}
          height={28}
          loading="eager"
        />
      </Link>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <Suspense fallback={<div className="size-8 bg-accent-foreground/30" />}>
          <UserBadge />
        </Suspense>
      </div>
    </header>

    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <StatusPill tone="neutral">Workspace</StatusPill>
            <h1 className="mt-3 font-bold text-3xl text-foreground-rich tracking-[-0.02em]">
              Your stores
            </h1>
            <p className="mt-1 text-foreground-dimmed text-sm">
              Select a store to view how AI shopping agents rank its catalog, or
              connect another.
            </p>
          </div>
          <Button color="primary" render={<Link href="/onboarding/connect" />}>
            <PlusIcon className="size-4" />
            Connect a store
          </Button>
        </div>

        <div className="mt-8">
          <Suspense fallback={<StoresSkeleton />}>
            <Stores />
          </Suspense>
        </div>
      </div>
    </main>
  </div>
);

const UserBadge = async () => {
  const user = await unwrapResult(
    Authentication.getCurrentUser(Environment.SERVER),
  );

  return (
    <Link
      href="/dashboard/settings"
      className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
    >
      <div className="flex size-8 items-center justify-center rounded-md bg-primary font-bold text-background-rich text-sm">
        {user.name.charAt(0)}
      </div>
      <span className="hidden font-medium text-base text-foreground md:block">
        {user.name} {user.surname}
      </span>
    </Link>
  );
};

const Stores = async () => {
  await connection();
  const stores = await unwrapResult(
    Store.overviewForCurrentUser(Environment.SERVER),
  );

  if (stores.length === 0) return <EmptyState />;

  const totals = stores.reduce(
    (accumulator, store) => ({
      products: accumulator.products + store.productCount,
      simulations: accumulator.simulations + store.simulations,
      wins:
        accumulator.wins +
        Math.round((store.winRate / 100) * store.simulations),
      agentVisits: accumulator.agentVisits + store.agentVisits,
    }),
    { products: 0, simulations: 0, wins: 0, agentVisits: 0 },
  );

  const averageWinRate =
    totals.simulations > 0
      ? Math.round((totals.wins / totals.simulations) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="relative grid grid-cols-2 gap-px border border-accent-foreground bg-accent-foreground lg:grid-cols-4">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <Aggregate
          icon={<ShoppingCartIcon className="size-4 text-secondary" />}
          label="Stores"
          value={`${stores.length}`}
        />
        <Aggregate
          icon={<CopyIcon className="size-4 text-warning" />}
          label="Products"
          value={`${totals.products}`}
        />
        <Aggregate
          icon={<GaugeIcon className="size-4 text-primary" />}
          label="Avg Win Rate"
          value={`${averageWinRate}%`}
        />
        <Aggregate
          icon={<RadarIcon className="size-4 text-success" />}
          label="Agent Visits · 30d"
          value={`${totals.agentVisits}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    </div>
  );
};

// Mirrors <Metric> below (icon + uppercase label, then value) so the aggregate
// row and the per-store metrics read as one system.
const Aggregate = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <div className="bg-background-rich p-5">
    <div className="flex items-center gap-1.5 text-foreground-dimmed">
      {icon}
      <p className="font-medium text-[10px] uppercase tracking-[0.08em]">
        {label}
      </p>
    </div>
    <p className="mt-2 font-bold text-3xl text-foreground-rich tabular-nums tracking-[-0.02em]">
      {value}
    </p>
  </div>
);

const StoreCard = ({ store }: { store: Store.Overview }) => (
  <Link
    href={`/dashboard/${store.id}`}
    className="group relative flex flex-col border border-accent-foreground bg-background-rich transition-colors hover:border-primary/40"
  >
    <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
    <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
    <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
    <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

    <div className="flex items-start justify-between gap-3 border-accent-foreground border-b p-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center border border-accent-foreground bg-background-dimmed">
          <ShoppingCartIcon className="size-5 text-foreground-dimmed" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground-rich text-lg transition-colors group-hover:text-primary">
            {store.name}
          </p>
          <p className="truncate text-foreground-dimmed text-sm">
            {PLATFORM_LABELS[store.platform] ?? store.platform} · {store.domain}
          </p>
        </div>
      </div>
      <StatusPill tone={store.status === "connected" ? "success" : "neutral"}>
        {store.status}
      </StatusPill>
    </div>

    <div className="grid grid-cols-3 divide-x divide-accent-foreground">
      <Metric
        icon={<GaugeIcon className="size-4 text-primary" />}
        label="Win Rate"
        value={`${store.winRate}%`}
      />
      <Metric
        icon={<CopyIcon className="size-4 text-warning" />}
        label="Products"
        value={`${store.productCount}`}
      />
      <Metric
        icon={<RadarIcon className="size-4 text-success" />}
        label="Agents 30d"
        value={`${store.agentVisits}`}
      />
    </div>

    <div className="mt-auto flex items-center justify-between border-accent-foreground border-t p-4">
      <span className="text-foreground-dimmed text-xs">
        {store.lastSyncedAt
          ? `Synced ${formatRelativeTime(store.lastSyncedAt)}`
          : "Not synced yet"}
      </span>
      <span className="inline-flex items-center gap-1 font-medium text-primary text-sm transition-colors group-hover:text-primary-rich">
        Open dashboard
        <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </div>
  </Link>
);

const Metric = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <div className="flex flex-col gap-2 p-4">
    <div className="flex items-center gap-1.5 text-foreground-dimmed">
      {icon}
      <span className="font-medium text-[10px] uppercase tracking-[0.08em]">
        {label}
      </span>
    </div>
    <p className="font-bold text-2xl text-foreground-rich tabular-nums tracking-[-0.02em]">
      {value}
    </p>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center gap-6 border border-accent-foreground border-dashed bg-background-rich px-6 py-16 text-center">
    <div className="flex size-16 items-center justify-center border border-accent-foreground bg-background-dimmed">
      <ShoppingCartIcon className="size-8 text-foreground-dimmed" />
    </div>
    <div className="max-w-md space-y-2">
      <h2 className="font-medium text-2xl text-foreground">
        Connect your first store
      </h2>
      <p className="text-foreground-dimmed">
        Link a store to import its products and start tracking how AI shopping
        agents compare them against competitors.
      </p>
    </div>
    <Button color="primary" render={<Link href="/onboarding/connect" />}>
      Connect a store <ArrowRightIcon className="size-4" />
    </Button>
  </div>
);

const StoresSkeleton = () => (
  <div className="flex flex-col gap-8">
    <div className="grid grid-cols-2 gap-px border border-accent-foreground bg-accent-foreground lg:grid-cols-4">
      {(["a", "b", "c", "d"] as const).map((key) => (
        <div key={key} className="bg-background-rich p-5">
          <div className="flex items-center gap-1.5">
            <div className="size-4 animate-pulse bg-foreground/10" />
            <div className="h-3 w-20 animate-pulse bg-foreground/10" />
          </div>
          <div className="mt-2 h-8 w-16 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {(["a", "b", "c", "d"] as const).map((key) => (
        <div
          key={key}
          className="border border-accent-foreground bg-background-rich"
        >
          <div className="flex items-center gap-3 border-accent-foreground border-b p-5">
            <div className="size-11 animate-pulse bg-foreground/10" />
            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse bg-foreground/10" />
              <div className="h-3 w-40 animate-pulse bg-foreground/10" />
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-accent-foreground">
            {(["x", "y", "z"] as const).map((cell) => (
              <div key={cell} className="space-y-2 p-4">
                <div className="h-3 w-14 animate-pulse bg-foreground/10" />
                <div className="h-7 w-12 animate-pulse bg-foreground/10" />
              </div>
            ))}
          </div>
          <div className="border-accent-foreground border-t p-4">
            <div className="h-4 w-24 animate-pulse bg-foreground/10" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
