import { unwrapResult } from "@zenncore/utils";
import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import {
  formatPlanPrice,
  isPlanKey as isCatalogPlanKey,
} from "@/lib/agent-api";
import * as Optimizations from "@/server/app/optimization";
import * as Products from "@/server/app/product";
import * as Store from "@/server/app/store";
import * as Subscription from "@/server/app/subscription";
import { unwrapEntitled } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { isPlanKey, PLANS } from "@/server/utils/stripe";
import {
  NavBadgeSkeleton,
  SidebarNavSkeleton,
  StoreSwitcherSkeleton,
} from "./chrome-skeletons";
import { SidebarNav } from "./sidebar-nav";
import { StoreSwitcher } from "./store-switcher";
import { TrialCard } from "./trial-card";

type StoreParams = LayoutProps<"/dashboard/[store]">["params"];

/**
 * The sidebar is split by what each region waits on, not rendered as one unit.
 *
 * The frame and the logo need nothing at all, so they belong in the static
 * shell. The nav needs only the store id from the URL — no query — so it paints
 * as soon as params resolve. Only the switcher and the two badge counts touch
 * the database, and each waits alone. Previously the whole sidebar, logo
 * included, sat behind all three queries.
 */
export const Sidebar = ({ params }: { params: StoreParams }) => (
  <aside className="relative hidden min-h-0 w-60 flex-col overflow-hidden border-accent-foreground border-r bg-background-rich md:flex">
    <Suspense
      fallback={
        <div className="flex h-14 items-center justify-center overflow-hidden border-accent-foreground border-b pr-22 pl-5">
          <Link href="/dashboard" className="w-full">
            <Image
              src="/images/trademark.svg"
              alt="ecentic"
              width={96}
              height={28}
              className="w-full"
              loading="eager"
            />
          </Link>
        </div>
      }
    >
      <SidebarLogo />
    </Suspense>

    <Suspense fallback={<StoreSwitcherSkeleton />}>
      <CurrentStoreSwitcher params={params} />
    </Suspense>

    <Suspense fallback={<SidebarNavSkeleton />}>
      <Navigation params={params} />
    </Suspense>

    {/* No skeleton: this renders for trial accounts only, and a placeholder
        shown to everyone else is a flash of a trial nobody is on. */}
    <div className="mt-auto">
      <Suspense fallback={null}>
        <TrialStatus />
      </Suspense>
    </div>
  </aside>
);

const CurrentStoreSwitcher = async ({ params }: { params: StoreParams }) => {
  const [{ store }, stores] = await Promise.all([
    params,
    unwrapResult(Store.getForCurrentUser(Environment.SERVER)),
  ]);

  const current = stores.find((item) => item.id === store) ?? null;

  return <StoreSwitcher store={store} current={current} stores={stores} />;
};

// The nav itself only needs the store id for its hrefs; the counts arrive
// separately as slots so a slow count never holds back the whole menu.
const Navigation = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;

  return (
    <SidebarNav
      store={store}
      productBadge={
        <Suspense fallback={<NavBadgeSkeleton />}>
          <ProductCount store={store} />
        </Suspense>
      }
      optimizationBadge={
        <Suspense fallback={<NavBadgeSkeleton />}>
          <OptimizationCount store={store} />
        </Suspense>
      }
    />
  );
};

const ProductCount = async ({ store }: { store: string }) =>
  unwrapResult(Products.countForCurrentUser(Environment.SERVER, { store }));

// Gated, and this is layout chrome: a throw here takes down the whole route —
// paywall included — for exactly the accounts the paywall is meant to catch.
// `unwrapEntitled` drops the badge instead, leaving the sidebar navigable so a
// blocked account can still reach billing settings.
const OptimizationCount = async ({ store }: { store: string }) =>
  unwrapEntitled(
    await Optimizations.countPublished(Environment.SERVER, { store }),
  );

const DAY = 24 * 60 * 60 * 1000;

/**
 * The free-trial footer, for accounts actually on one.
 *
 * Reads the stored row (`getStoredSubscription`), never `getCurrentSubscription`
 * — the latter reconciles against Stripe on every call, and this is shared
 * chrome on every dashboard page. Webhooks keep the row current.
 *
 * A failed read renders nothing rather than throwing: this is layout chrome and
 * there are no error boundaries under the dashboard, so a throw would replace
 * the whole route with the error page over a decorative card.
 */
const TrialStatus = async () => {
  const stored = await Subscription.getStoredSubscription(Environment.SERVER);
  if (!stored.success) return null;

  const subscription = stored.data;
  if (subscription?.status !== "trialing") return null;

  // Everything below is derived from the period Stripe gave us. With no end
  // date there is no honest thing to render — the old component invented one.
  const {
    currentPeriodEnd: end,
    currentPeriodStart: start,
    plan,
  } = subscription;
  if (!end) return null;

  // A trialing row with no plan is the bespoke-price failure: Stripe says the
  // trial is running, `isEntitled` says it is not, and the account is behind the
  // paywall. Offering to "keep" a plan it does not have would be the most
  // confusing thing on the screen. `grant` refuses to create this; a
  // hand-made Stripe subscription still can.
  if (!plan || !isPlanKey(plan)) return null;

  const format = await getFormatter();

  const daysLeft = Math.max(0, Math.ceil((end.getTime() - Date.now()) / DAY));

  const progress = (() => {
    if (!start) return null;
    const total = Math.round((end.getTime() - start.getTime()) / DAY);
    if (total <= 0) return null;
    const used = Math.max(0, Math.min(total, total - daysLeft));
    return { used, total, percent: Math.round((used / total) * 100) };
  })();

  return (
    <TrialCard
      plan={PLANS[plan].name}
      price={isCatalogPlanKey(plan) ? formatPlanPrice(plan) : null}
      daysLeft={daysLeft}
      endsOn={format.dateTime(end, { day: "numeric", month: "long" })}
      progress={progress}
    />
  );
};

const SidebarLogo = async () => {
  const translate = await getTranslations("dashboard.sidebar");

  return (
    <div className="flex h-14 items-center justify-center overflow-hidden border-accent-foreground border-b pr-22 pl-5">
      <Link
        href="/dashboard"
        aria-label={translate("allStores")}
        className="w-full"
      >
        <Image
          src="/images/trademark.svg"
          alt="ecentic"
          width={96}
          height={28}
          className="w-full"
          loading="eager"
        />
      </Link>
    </div>
  );
};
