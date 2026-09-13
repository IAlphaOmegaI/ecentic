import { unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import * as Subscription from "@/server/app/subscription";
import { isEntitled } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { PlanCards, PlanEnterprise } from "../../pricing/_components/plan-grid";

/**
 * The dashboard paywall. Rendered in its own Suspense boundary *beside* the
 * page content, never around it — the StoreGuard pattern: awaiting a plan
 * check in the layout body would collapse every nested page's prerendered
 * shell into one fallback. The shell streams first; this resolves against the
 * stored subscription row (webhooks keep it current — no Stripe round trip)
 * and covers the content area with an opaque overlay when the account has no
 * plan. The overlay is presentation only: every feature action is enforced
 * server-side by `withSubscription`, so stripping it reveals nothing that can
 * be acted on.
 *
 * Sidebar, topbar, and settings stay outside the overlay on purpose — billing
 * must remain reachable for exactly the accounts this blocks.
 */
export const SubscriptionGate = async () => {
  await connection();

  const subscription = await unwrapResult(
    Subscription.getStoredSubscription(Environment.SERVER),
  );

  if (isEntitled(subscription)) return null;

  const translate = await getTranslations("dashboard.paywall");

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="relative border border-accent-foreground">
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

          <div className="p-6 md:p-12">
            <p className="font-medium text-primary text-sm">
              {translate("kicker")}
            </p>
            <h1 className="mt-2 max-w-2xl font-body font-medium text-3xl text-foreground md:text-5xl">
              {translate("title")}
            </h1>
            <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-lg md:text-xl">
              {translate("description")}
            </p>
          </div>

          <PlanCards />

          <PlanEnterprise />

          <div className="grid grid-cols-1 border-accent-foreground border-t md:grid-cols-3">
            <div className="col-span-2 flex flex-col justify-center bg-background p-6 md:px-12 md:py-8">
              <p className="font-body font-light text-foreground-dimmed">
                {translate("manage")}{" "}
                <Link
                  href="/dashboard/settings"
                  className="text-primary transition-opacity hover:opacity-80"
                >
                  {translate("manageAction")}
                </Link>
              </p>
            </div>
            <div className="flex flex-col justify-end border-accent-foreground border-t bg-background p-6 md:border-t-0 md:border-l md:p-8">
              <Button
                color="neutral"
                className="w-full"
                render={<Link href="/pricing" />}
              >
                {translate("compare")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
