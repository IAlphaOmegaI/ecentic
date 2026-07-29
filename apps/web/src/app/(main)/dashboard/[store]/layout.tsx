import { notFound } from "next/navigation";
import { type PropsWithChildren, Suspense } from "react";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import {
  SidebarSkeleton,
  TopbarSkeleton,
} from "../_components/chrome-skeletons";
import { Sidebar } from "../_components/sidebar";
import { Topbar } from "../_components/topbar";

type LayoutProps = PropsWithChildren<{
  params: Promise<{ store: string }>;
}>;

// Guard: a store id in the URL must belong to the signed-in user. Anything
// else (deleted, wrong account, garbage) 404s instead of rendering a dashboard
// for it. Suspended rather than awaited in the layout body so the shell
// streams immediately — the guard's query would otherwise gate the route's
// first byte, making every navigation feel dead for a full DB round trip.
// Streaming ahead of the verdict leaks nothing: every data component scopes
// its queries by the session's user id, so a foreign store id can only ever
// render empty sections before the 404 lands.
const StoreGuard = async ({ store }: { store: string }) => {
  const resolved = await Store.resolveForUser(Environment.SERVER, { store });
  if (!resolved.success) notFound();

  return null;
};

export default async ({ children, params }: LayoutProps) => {
  const { store } = await params;

  return (
    <>
      <Suspense>
        <StoreGuard store={store} />
      </Suspense>
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar store={store} />
      </Suspense>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Suspense fallback={<TopbarSkeleton />}>
          <Topbar store={store} />
        </Suspense>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </>
  );
};
