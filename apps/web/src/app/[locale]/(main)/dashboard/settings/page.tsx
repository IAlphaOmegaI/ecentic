import { unwrapResult } from "@zenncore/utils";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import * as Authentication from "@/server/app/authentication";
import * as PerformanceFee from "@/server/app/billing/performance-fee";
import * as Store from "@/server/app/store";
import * as Subscription from "@/server/app/subscription";
import { Environment } from "@/server/utils/environment";
import { AccountSection } from "./_components/settings/account-section";
import { BillingSection } from "./_components/settings/billing-section";
import { IntegrationsSection } from "./_components/settings/integrations-section";
import { SettingsClient } from "./_components/settings-client";
import { PanelSkeleton, SettingsShell } from "./_components/shell";

// Sign-out runs as a server action on this page, so Next re-renders these
// panels in the same response with the session already destroyed. Redirect
// rather than throw, exactly as the layout's user badge does.
const requireSession = async () => {
  const account = await Authentication.getCurrentUser(Environment.SERVER);
  if (!account.success) redirect({ href: "/sign-in", locale: await getLocale() });

  return account.data;
};

const Account = async () => {
  await connection();
  const user = await requireSession();

  return <AccountSection user={user} />;
};

const Integrations = async () => {
  await connection();
  await requireSession();
  const stores = await unwrapResult(
    Store.getForCurrentUser(Environment.SERVER),
  );

  return <IntegrationsSection stores={stores} />;
};

// The slow one: `getCurrentSubscription` reconciles against Stripe and the
// invoice list is a second remote call. Isolated here so Account and
// Integrations no longer wait on a payment provider to answer.
const Billing = async () => {
  await connection();
  await requireSession();

  const [subscriptionResult, invoicesResult, performanceResult] =
    await Promise.all([
      Subscription.getCurrentSubscription(Environment.SERVER),
      Subscription.listInvoices(Environment.SERVER),
      PerformanceFee.getCurrentPeriodSummary(Environment.SERVER),
    ]);

  return (
    <BillingSection
      subscription={subscriptionResult.success ? subscriptionResult.data : null}
      invoices={invoicesResult.success ? invoicesResult.data : []}
      performanceFee={performanceResult.success ? performanceResult.data : null}
    />
  );
};

export default () => (
  <SettingsShell>
    <SettingsClient
      account={
        <Suspense fallback={<PanelSkeleton />}>
          <Account />
        </Suspense>
      }
      integrations={
        <Suspense fallback={<PanelSkeleton />}>
          <Integrations />
        </Suspense>
      }
      billing={
        <Suspense fallback={<PanelSkeleton />}>
          <Billing />
        </Suspense>
      }
    />
  </SettingsShell>
);
