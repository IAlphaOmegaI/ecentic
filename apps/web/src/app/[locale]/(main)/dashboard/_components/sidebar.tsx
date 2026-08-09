import { unwrapResult } from "@zenncore/utils";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import * as Optimizations from "@/server/app/optimization";
import * as Products from "@/server/app/product";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import {
  NavBadgeSkeleton,
  SidebarNavSkeleton,
  StoreSwitcherSkeleton,
} from "./chrome-skeletons";
import { SidebarNav } from "./sidebar-nav";
import { StoreSwitcher } from "./store-switcher";

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
  <aside className="relative hidden w-60 flex-col overflow-hidden border-accent-foreground border-r bg-background-rich md:flex">
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

const OptimizationCount = async ({ store }: { store: string }) =>
  unwrapResult(Optimizations.countPublished(Environment.SERVER, { store }));

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
