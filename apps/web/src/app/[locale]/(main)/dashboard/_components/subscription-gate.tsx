import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import * as Subscription from "@/server/app/subscription";
import { isEntitled } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { PricingCTA } from "../../pricing/_components/pricing-cta";

const PLAN_KEYS = ["payg", "compete", "scale", "dominate"] as const;

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
  const plans = await getTranslations("pricing.plans");

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-8 px-6 py-12">
        <div className="flex flex-col gap-3">
          <p className="font-medium text-primary text-sm">
            {translate("kicker")}
          </p>
          <h1 className="font-bold text-2xl text-foreground-rich tracking-[-0.02em]">
            {translate("title")}
          </h1>
          <p className="max-w-xl text-foreground-dimmed text-sm">
            {translate("description")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PLAN_KEYS.map((plan) => (
            <div
              key={plan}
              className="flex flex-col gap-3 border border-accent-foreground bg-background-rich p-6"
            >
              <div>
                <p className="font-semibold text-foreground-rich text-lg">
                  {plans(`${plan}.name`)}
                </p>
                <p className="mt-0.5 text-foreground-dimmed text-sm">
                  {plans(`${plan}.tagline`)}
                </p>
              </div>
              <p>
                <span className="font-semibold text-3xl text-foreground-rich">
                  {plans(`${plan}.figure`)}
                </span>{" "}
                <span className="text-foreground-dimmed text-sm">
                  {plans(`${plan}.suffix`)}
                </span>
              </p>
              <p className="text-foreground-dimmed text-xs">
                {plans(`${plan}.note`)}
              </p>
              <PricingCTA plan={plan} className="mt-auto w-full">
                {plans(`${plan}.action.primary`)}
              </PricingCTA>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1 text-foreground-dimmed text-sm">
          <Link
            href="/pricing"
            className="w-fit text-primary transition-opacity hover:opacity-80"
          >
            {translate("compare")}
          </Link>
          <p>
            {translate("manage")}{" "}
            <Link
              href="/dashboard/settings"
              className="text-primary transition-opacity hover:opacity-80"
            >
              {translate("manageAction")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
