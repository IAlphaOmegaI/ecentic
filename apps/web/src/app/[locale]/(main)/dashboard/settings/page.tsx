import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { getLocale, getMessages } from "next-intl/server";
import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import * as Authentication from "@/server/app/authentication";
import * as PerformanceFee from "@/server/app/billing/performance-fee";
import * as GoogleMerchant from "@/server/app/integration/google-merchant";
import * as Loop from "@/server/app/integration/loop/actions";
import * as Recharge from "@/server/app/integration/recharge/actions";
import * as Store from "@/server/app/store";
import * as Subscription from "@/server/app/subscription";
import { Environment } from "@/server/utils/environment";
import {
  AccountSection,
  SecuritySection,
} from "./_components/settings/account-section";
import { BillingSection } from "./_components/settings/billing-section";
import { IntegrationsSection } from "./_components/settings/integrations-section";
import { SettingsClient } from "./_components/settings-client";
import { PanelSkeleton, SettingsShell } from "./_components/shell";

// Sign-out runs as a server action on this page, so Next re-renders these
// panels in the same response with the session already destroyed. Redirect
// rather than throw, exactly as the layout's user badge does.
const requireSession = async () => {
  const account = await Authentication.getCurrentUser(Environment.SERVER);
  if (!account.success)
    return redirect({ href: "/sign-in", locale: await getLocale() });

  return account.data;
};

const Account = async () => {
  await connection();
  const [user, messages] = await Promise.all([requireSession(), getMessages()]);

  return <AccountSection user={user} roles={messages.signUp.roles} />;
};

const Integrations = async () => {
  await connection();
  await requireSession();
  const stores = await unwrapResult(
    Store.getForCurrentUser(Environment.SERVER),
  );

  const googleEntries = await Promise.all(
    stores.map(async (store) => {
      const status = await GoogleMerchant.getStatus(Environment.SERVER, {
        store: store.id,
      });
      return [store.id, status.success ? status.data : null] as const;
    }),
  );
  const google = Object.fromEntries(googleEntries);

  const rechargeEntries = await Promise.all(
    stores.map(async (store) => {
      const status = await Recharge.getStatus(Environment.SERVER, {
        store: store.id,
      });
      return [store.id, status.success ? status.data : null] as const;
    }),
  );
  const loopEntries = await Promise.all(
    stores.map(async (store) => {
      const status = await Loop.getStatus(Environment.SERVER, {
        store: store.id,
      });
      return [store.id, status.success ? status.data : null] as const;
    }),
  );
  return (
    <IntegrationsSection
      stores={stores}
      google={google}
      recharge={Object.fromEntries(rechargeEntries)}
      loop={Object.fromEntries(loopEntries)}
    />
  );
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
      security={<SecuritySection key="security" />}
      account={
        <Suspense key="account" fallback={<PanelSkeleton />}>
          <Account />
        </Suspense>
      }
      integrations={
        <Suspense
          key="integrations"
          fallback={<PanelSkeleton section="integrations" />}
        >
          <Integrations />
        </Suspense>
      }
      billing={
        <Suspense key="billing" fallback={<PanelSkeleton section="billing" />}>
          <Billing />
        </Suspense>
      }
    />
  </SettingsShell>
);
