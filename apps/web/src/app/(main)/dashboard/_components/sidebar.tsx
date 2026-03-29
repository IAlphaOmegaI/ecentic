import { unwrapResult } from "@zenncore/utils";
import Image from "next/image";
import * as Optimizations from "@/server/app/optimization";
import * as Products from "@/server/app/product";
import { Environment } from "@/server/utils/environment";
import { SidebarNav } from "./sidebar-nav";
import { TrialCard } from "./trial-card";

export const Sidebar = async () => {
  const [products, optimizations] = await Promise.all([
    unwrapResult(Products.skimForCurrentUser(Environment.SERVER)),
    unwrapResult(Optimizations.listDashboard(Environment.SERVER)),
  ]);

  return (
    <aside className="relative hidden w-60 flex-col overflow-hidden border-accent-foreground border-r bg-background-rich md:flex">
      <div className="flex h-14 items-center justify-center overflow-hidden border-accent-foreground border-b pr-22 pl-5">
        <Image
          src="/images/trademark.svg"
          alt="écentic"
          width={96}
          height={28}
          className="w-full"
          loading="eager"
        />
      </div>

      <SidebarNav products={products} optimizations={optimizations.published} />
      <TrialCard />
    </aside>
  );
};
