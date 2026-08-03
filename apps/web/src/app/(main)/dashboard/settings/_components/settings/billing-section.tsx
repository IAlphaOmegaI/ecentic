"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import * as Payg from "@/server/app/billing/payg";
import type * as PerformanceFee from "@/server/app/billing/performance-fee";
import * as Subscription from "@/server/app/subscription";

type Props = {
  subscription: Subscription.Type | null;
  invoices: Subscription.InvoiceSummary[];
  performanceFee: PerformanceFee.PeriodSummary | null;
};

type SubscriptionPlan = "compete" | "scale" | "dominate";

const PLAN_META = {
  compete: { name: "Compete", label: "Compete Plan", price: "14.90" },
  scale: { name: "Scale", label: "Scale Plan", price: "44.90" },
  dominate: { name: "Dominate", label: "Dominate Plan", price: "149" },
} as const;

/** Next tier up for the in-dashboard upgrade button; Dominate is the ceiling. */
const UPGRADE_LADDER = {
  compete: "scale",
  scale: "dominate",
  dominate: null,
} as const satisfies Record<SubscriptionPlan, SubscriptionPlan | null>;

/** Cheapest first. Explicit so the button order does not ride on key order. */
const PLAN_ORDER = [
  "compete",
  "scale",
  "dominate",
] as const satisfies readonly SubscriptionPlan[];

const PlanCheckoutButtons = ({
  onCheckout,
  isCheckingOut,
  checkoutPlan,
}: {
  onCheckout: (plan: SubscriptionPlan) => void;
  isCheckingOut: boolean;
  checkoutPlan: SubscriptionPlan | null;
}) => (
  <div className="flex flex-wrap gap-3">
    {PLAN_ORDER.map((plan) => (
      <Button
        key={plan}
        color="neutral"
        className="flex-1"
        disabled={isCheckingOut}
        onClick={() => onCheckout(plan)}
      >
        {isCheckingOut && checkoutPlan === plan
          ? "Loading…"
          : `${PLAN_META[plan].name} · $${PLAN_META[plan].price}/mo`}
      </Button>
    ))}
  </div>
);

const STATUS_PILL_CLASS_NAME =
  "rounded-full px-2 py-0.5 font-semibold text-[11px] uppercase tracking-[0.05em]";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success/10 text-success",
  trialing: "bg-success/10 text-success",
  past_due: "bg-warning/10 text-warning",
  unpaid: "bg-warning/10 text-warning",
  canceled: "bg-background-dimmed text-foreground-dimmed",
  incomplete: "bg-background-dimmed text-foreground-dimmed",
  incomplete_expired: "bg-background-dimmed text-foreground-dimmed",
  paused: "bg-background-dimmed text-foreground-dimmed",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Past Due",
  unpaid: "Unpaid",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  paused: "Paused",
};

const formatDate = (date: Date | null) =>
  date
    ? date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

const formatAmount = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);

const formatRate = (rateBps: number) =>
  (rateBps / 100).toFixed(rateBps % 100 === 0 ? 0 : 2);

const ActivePlan = ({
  subscription,
  onManage,
  onCheckout,
  isManaging,
  isCheckingOut,
  checkoutPlan,
}: {
  subscription: Subscription.Type;
  onManage: () => void;
  onCheckout: (plan: SubscriptionPlan) => void;
  isManaging: boolean;
  isCheckingOut: boolean;
  checkoutPlan: SubscriptionPlan | null;
}) => {
  const planKey =
    subscription.plan === "compete" ||
    subscription.plan === "scale" ||
    subscription.plan === "dominate"
      ? subscription.plan
      : null;
  const meta = planKey ? PLAN_META[planKey] : null;
  const statusKey = subscription.status;
  const statusClass =
    STATUS_STYLES[statusKey] ?? "bg-background-dimmed text-foreground-dimmed";
  const statusLabel = STATUS_LABELS[statusKey] ?? statusKey;
  const upgradeTarget: SubscriptionPlan | null = planKey
    ? UPGRADE_LADDER[planKey]
    : null;

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-base text-foreground-rich">
            {meta?.label ?? "No active plan"}
          </p>
          {meta && (
            <p className="mt-1 font-bold text-2xl text-primary tracking-[-0.02em]">
              ${meta.price}
              <span className="font-medium text-foreground-dimmed text-sm">
                /mo
              </span>
            </p>
          )}
        </div>
        <span className={`${STATUS_PILL_CLASS_NAME} ${statusClass}`}>
          {statusLabel}
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <div className="flex justify-between">
          <span className="text-foreground-dimmed text-sm">Billing cycle</span>
          <span className="font-medium text-foreground text-sm">Monthly</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground-dimmed text-sm">
            {subscription.cancelAtPeriodEnd ? "Ends on" : "Next billing date"}
          </span>
          <span className="font-medium text-foreground text-sm">
            {formatDate(subscription.currentPeriodEnd)}
          </span>
        </div>
        {subscription.cancelAtPeriodEnd && (
          <p className="mt-1 text-foreground-dimmed text-sm">
            Your plan is set to cancel at the end of the current period.
          </p>
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        {upgradeTarget && (
          <Button
            color="primary"
            className="flex-1"
            disabled={isCheckingOut}
            onClick={() => onCheckout(upgradeTarget)}
          >
            {isCheckingOut && checkoutPlan === upgradeTarget
              ? "Loading…"
              : `Upgrade to ${PLAN_META[upgradeTarget].name}`}
          </Button>
        )}
        <Button color="neutral" onClick={onManage} disabled={isManaging}>
          {isManaging ? "Loading…" : "Manage Billing"}
        </Button>
      </div>
    </>
  );
};

const PaygPlan = ({
  summary,
  onCheckout,
  isCheckingOut,
  checkoutPlan,
}: {
  summary: PerformanceFee.PeriodSummary;
  onCheckout: (plan: SubscriptionPlan) => void;
  isCheckingOut: boolean;
  checkoutPlan: SubscriptionPlan | null;
}) => (
  <>
    <div className="flex items-start justify-between">
      <div>
        <p className="font-semibold text-base text-foreground-rich">
          Pay-as-you-go
        </p>
        <p className="mt-1 text-foreground-dimmed text-sm">
          Free to start · you only pay when AI agents drive sales.
        </p>
      </div>
      <span className={`${STATUS_PILL_CLASS_NAME} bg-success/10 text-success`}>
        Active
      </span>
    </div>
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex justify-between">
        <span className="text-foreground-dimmed text-sm">Fee</span>
        <span className="font-medium text-foreground text-sm">
          {formatRate(summary.rateBps)}% on AI-attributed orders
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-foreground-dimmed text-sm">Monthly cap</span>
        <span className="font-medium text-foreground text-sm">
          {formatAmount(summary.capCents, "USD")}
        </span>
      </div>
    </div>
    <div className="mt-6">
      <p className="text-foreground-dimmed text-sm">
        Prefer predictable billing? Switch to a flat monthly plan (no
        performance fee):
      </p>
      <div className="mt-3">
        <PlanCheckoutButtons
          onCheckout={onCheckout}
          isCheckingOut={isCheckingOut}
          checkoutPlan={checkoutPlan}
        />
      </div>
    </div>
  </>
);

const NoPlan = ({
  onStartPayg,
  onCheckout,
  isStartingPayg,
  isCheckingOut,
  checkoutPlan,
}: {
  onStartPayg: () => void;
  onCheckout: (plan: SubscriptionPlan) => void;
  isStartingPayg: boolean;
  isCheckingOut: boolean;
  checkoutPlan: SubscriptionPlan | null;
}) => (
  <>
    <div>
      <p className="font-semibold text-base text-foreground-rich">
        Choose how you pay
      </p>
      <p className="mt-1 text-foreground-dimmed text-sm">
        Start free with pay-as-you-go, or pick a flat monthly subscription with
        no performance fee.
      </p>
    </div>
    <div className="mt-6 flex flex-col gap-3">
      <Button
        color="primary"
        className="w-full"
        disabled={isStartingPayg}
        onClick={onStartPayg}
      >
        {isStartingPayg ? "Loading…" : "Start Pay-as-you-go — free, no card"}
      </Button>
      <PlanCheckoutButtons
        onCheckout={onCheckout}
        isCheckingOut={isCheckingOut}
        checkoutPlan={checkoutPlan}
      />
    </div>
  </>
);

const PerformanceFeeCard = ({
  summary,
  onAddPayment,
  isAddingPayment,
}: {
  summary: PerformanceFee.PeriodSummary;
  onAddPayment: () => void;
  isAddingPayment: boolean;
}) => {
  const usedPercent =
    summary.capCents > 0
      ? Math.min(
          100,
          Math.round((summary.billedCents / summary.capCents) * 100),
        )
      : 0;

  const pill = (() => {
    switch (true) {
      case summary.awaitingPayment:
        return {
          label: "Action needed",
          className: "bg-warning/10 text-warning",
        };
      case summary.enabled:
        return { label: "Active", className: "bg-success/10 text-success" };
      default:
        return {
          label: "Off",
          className: "bg-background-dimmed text-foreground-dimmed",
        };
    }
  })();

  return (
    <div>
      <div className="flex items-center justify-between border-accent-foreground border-b bg-background-dimmed px-4 py-3">
        <p className="font-semibold text-foreground-rich text-sm">
          Performance Fee
        </p>
        <span className={`${STATUS_PILL_CLASS_NAME} ${pill.className}`}>
          {pill.label}
        </span>
      </div>
      <div className="p-6">
        <p className="text-foreground-dimmed text-sm">
          {formatRate(summary.rateBps)}% on AI-attributed orders · capped at{" "}
          {formatAmount(summary.capCents, "USD")}/mo. Free to start — you only
          pay when an agent buys because of an optimization we made, never on
          your other sales.
        </p>

        {summary.awaitingPayment && (
          <div className="mt-4 flex flex-col gap-3 border border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground-rich text-sm">
                {formatAmount(summary.amountOwedCents, "USD")} due
              </p>
              <p className="mt-0.5 text-foreground-dimmed text-xs">
                Add a payment method to settle this period's fee.
              </p>
            </div>
            <Button
              color="primary"
              onClick={onAddPayment}
              disabled={isAddingPayment}
            >
              {isAddingPayment ? "Loading…" : "Add a payment method"}
            </Button>
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-end justify-between">
            <p className="font-bold text-2xl text-primary tracking-[-0.02em]">
              {formatAmount(summary.billedCents, "USD")}
            </p>
            <p className="text-foreground-dimmed text-sm">
              of {formatAmount(summary.capCents, "USD")} cap this period
            </p>
          </div>
          <div className="mt-2 h-2 w-full bg-accent-foreground">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-foreground-dimmed text-xs">
            <span>
              {formatAmount(summary.reportedCents, "USD")} billed so far
            </span>
            <span>Resets {formatDate(summary.periodEnd)}</span>
          </div>
        </div>

        {summary.conversions.length > 0 && (
          <div className="mt-6">
            <p className="font-semibold text-foreground-rich text-xs uppercase tracking-[0.05em]">
              Attributed orders
            </p>
            <div className="mt-2 divide-y divide-accent-foreground border-accent-foreground border-t">
              {summary.conversions.map((conversion) => (
                <div
                  key={conversion.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      Order {conversion.orderExternalId}
                    </p>
                    <p className="mt-0.5 text-foreground-dimmed text-xs">
                      {formatAmount(
                        conversion.orderValueCents,
                        conversion.currency,
                      )}{" "}
                      · {conversion.attributedAgentType}
                    </p>
                  </div>
                  <span className="font-medium text-foreground text-sm">
                    {formatAmount(conversion.feeCents, conversion.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const BillingSection = ({
  subscription,
  invoices,
  performanceFee,
}: Props) => {
  const router = useRouter();
  const toast = useToastManager();

  const [handleManage, isManaging] = useAsyncAction(async () => {
    const result = await Subscription.createBillingPortalSession();
    if (!result.success) {
      toast.add({
        title: "Could not open billing portal",
        description: result.error.message,
        type: "error",
      });
      return;
    }
    window.location.href = result.data.url;
  });

  const [handleStartPayg, isStartingPayg] = useAsyncAction(async () => {
    const activation = await Payg.startPayAsYouGo();
    if (!activation.success) {
      toast.add({
        title: "Could not start pay-as-you-go",
        description: activation.error.message,
        type: "error",
      });
      return;
    }
    router.refresh();
  });

  const [handleAddPayment, isAddingPayment] = useAsyncAction(async () => {
    const session = await Payg.createPaymentSetupSession();
    if (!session.success) {
      toast.add({
        title: "Could not open payment setup",
        description: session.error.message,
        type: "error",
      });
      return;
    }
    window.location.href = session.data.url;
  });

  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(
    null,
  );

  const [handleCheckout, isCheckingOut] = useAsyncAction(
    async (plan: SubscriptionPlan) => {
      setCheckoutPlan(plan);
      try {
        const result = await Subscription.createCheckoutSession({ plan });
        if (!result.success) {
          if (result.error.name === "unauthenticated-error") {
            router.push("/sign-in?next=/dashboard/settings");
            return;
          }
          toast.add({
            title: "Could not start checkout",
            description: result.error.message,
            type: "error",
          });
          return;
        }
        window.location.href = result.data.url;
      } finally {
        setCheckoutPlan(null);
      }
    },
  );

  const activeStatuses = new Set([
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "paused",
  ]);

  const isPayg = subscription?.billingMode === "payg";
  const hasActiveSubscription =
    subscription?.billingMode === "subscription" &&
    activeStatuses.has(subscription.status);

  return (
    <div className="divide-y divide-accent-foreground">
      <div>
        <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-semibold text-foreground-rich text-sm">
            Current Plan
          </p>
        </div>
        <div className="p-6">
          {(() => {
            switch (true) {
              case isPayg && performanceFee !== null:
                return (
                  <PaygPlan
                    summary={performanceFee}
                    onCheckout={(plan) => handleCheckout(plan)}
                    isCheckingOut={isCheckingOut}
                    checkoutPlan={checkoutPlan}
                  />
                );
              case hasActiveSubscription && subscription !== null:
                return (
                  <ActivePlan
                    subscription={subscription}
                    onManage={() => handleManage()}
                    onCheckout={(plan) => handleCheckout(plan)}
                    isManaging={isManaging}
                    isCheckingOut={isCheckingOut}
                    checkoutPlan={checkoutPlan}
                  />
                );
              default:
                return (
                  <NoPlan
                    onStartPayg={() => handleStartPayg()}
                    onCheckout={(plan) => handleCheckout(plan)}
                    isStartingPayg={isStartingPayg}
                    isCheckingOut={isCheckingOut}
                    checkoutPlan={checkoutPlan}
                  />
                );
            }
          })()}
        </div>
      </div>

      {isPayg && performanceFee !== null && (
        <PerformanceFeeCard
          summary={performanceFee}
          onAddPayment={() => handleAddPayment()}
          isAddingPayment={isAddingPayment}
        />
      )}

      <div>
        <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-semibold text-foreground-rich text-sm">
            Invoice History
          </p>
        </div>
        {invoices.length === 0 ? (
          <div className="px-4 py-6 text-foreground-dimmed text-sm">
            No invoices yet.
          </div>
        ) : (
          <div className="divide-y divide-accent-foreground">
            {invoices.map((invoice) => {
              const statusClass = (() => {
                switch (true) {
                  case invoice.status === "paid":
                    return "bg-success/10 text-success";
                  case invoice.status === "open":
                    return "bg-warning/10 text-warning";
                  default:
                    return "bg-background-dimmed text-foreground-dimmed";
                }
              })();
              return (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {formatDate(invoice.createdAt)}
                    </p>
                    <p className="mt-0.5 text-foreground-dimmed text-xs">
                      {formatAmount(invoice.amountPaid, invoice.currency)}
                      {invoice.number ? ` · ${invoice.number}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`${STATUS_PILL_CLASS_NAME} ${statusClass}`}
                    >
                      {invoice.status}
                    </span>
                    {invoice.pdfUrl && (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary text-sm transition-colors hover:text-primary-rich"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
