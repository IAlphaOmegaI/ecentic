import { notFound } from "next/navigation";
import { Suspense } from "react";
import * as Store from "@/server/app/store";
import { Environment } from "@/server/utils/environment";
import { Sidebar } from "../_components/sidebar";
import { StoreSubscriptionGate } from "../_components/store-subscription-gate";
import { SubscriptionGate } from "../_components/subscription-gate";
import { Topbar } from "../_components/topbar";

type StoreParams = LayoutProps<"/dashboard/[store]">["params"];

// Guard: a store id in the URL must belong to the signed-in user. Anything
// else (deleted, wrong account, garbage) 404s instead of rendering a dashboard
// for it. Suspended rather than awaited in the layout body so the shell
// streams immediately — the guard's query would otherwise gate the route's
// first byte, making every navigation feel dead for a full DB round trip.
// Streaming ahead of the verdict leaks nothing: every data component scopes
// its queries by the session's user id, so a foreign store id can only ever
// render empty sections before the 404 lands.
const StoreGuard = async ({ params }: { params: StoreParams }) => {
  const { store } = await params;
  const resolved = await Store.resolveForUser(Environment.SERVER, { store });
  if (!resolved.success) notFound();

  return null;
};

// Deliberately synchronous. `params` is request data, so awaiting it in the
// layout body would push the entire dashboard — chrome *and* every page nested
// under it — out of the prerendered shell, leaving all of `/dashboard/[store]/*`
// to fall back to the parent skeleton.
//
// The chrome is synchronous for the same reason and owns the boundaries around
// its own data-backed regions, so its frame, logo and search box prerender
// while only the parts that need a query stream in.
export default ({ children, params }: LayoutProps<"/dashboard/[store]">) => (
  <>
    <Suspense>
      <StoreGuard params={params} />
    </Suspense>
    <Sidebar params={params} />
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar />
      {/* The paywall streams in beside the content on its own boundary, same
        rationale as StoreGuard above: awaiting the plan check here would push
        every nested page out of the prerendered shell. It overlays the content
        area only — chrome and settings stay reachable so a blocked account can
        always fix its billing. Enforcement lives in `withSubscription` on the
        feature actions; the overlay is the presentation of it. */}
      <div className="relative flex-1 overflow-hidden">
        <main className="h-full overflow-y-auto">{children}</main>
        <Suspense>
          <StoreSubscriptionGate>
            <SubscriptionGate />
          </StoreSubscriptionGate>
        </Suspense>
      </div>
    </div>
  </>
);
