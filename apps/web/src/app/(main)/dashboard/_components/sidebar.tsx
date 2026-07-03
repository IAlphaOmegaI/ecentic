import { unwrapResult } from "@zenncore/utils";
import Image from "next/image";
import Link from "next/link";
import * as Optimizations from "@/server/app/optimization";
import * as Products from "@/server/app/product";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { SidebarNav } from "./sidebar-nav";
import { StoreSwitcher } from "./store-switcher";

export const Sidebar = async ({ store }: { store: string }) => {
  const [products, optimizations, stores] = await Promise.all([
    unwrapResult(Products.skimForCurrentUser(Environment.SERVER, { store })),
    unwrapResult(Optimizations.listDashboard(Environment.SERVER, { store })),
    unwrapResult(Store.getForCurrentUser(Environment.SERVER)),
  ]);

  const current = stores.find((item) => item.id === store) ?? null;

  return (
    <aside className="relative hidden w-60 flex-col overflow-hidden border-accent-foreground border-r bg-background-rich md:flex">
      <div className="flex h-14 items-center justify-center overflow-hidden border-accent-foreground border-b pr-22 pl-5">
        <Link href="/dashboard" aria-label="All stores" className="w-full">
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

      <StoreSwitcher store={store} current={current} stores={stores} />

      <SidebarNav
        store={store}
        products={products}
        optimizations={optimizations.published}
      />
    </aside>
  );
};
