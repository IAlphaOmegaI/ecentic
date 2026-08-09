"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useTranslations } from "next-intl";
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

const PLAN_PRICES = {
  compete: "14.90",
  scale: "44.90",
  dominate: "149",
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

type BillingTranslate = ReturnType<
  typeof useTranslations<"dashboard.settings.billing">
>;

const planName = (plan: SubscriptionPlan, translate: BillingTranslate) => {
  switch (plan) {
    case "compete":
      return translate("plans.compete");
    case "scale":
      return translate("plans.scale");
    case "dominate":
      return translate("plans.dominate");
    default: {
      const exhaustive: never = plan;
      return exhaustive;
    }
  }
};

const planLabel = (plan: SubscriptionPlan, translate: BillingTranslate) => {
  switch (plan) {
    case "compete":
      return translate("plans.competeLabel");
    case "scale":
      return translate("plans.scaleLabel");
    case "dominate":
      return translate("plans.dominateLabel");
    default: {
      const exhaustive: never = plan;
      return exhaustive;
    }
  }
};

const subscriptionStatusLabel = (
  statusKey: string,
  translate: BillingTranslate,
) => {
  switch (statusKey) {
    case "active":
      return translate("status.active");
    case "trialing":
      return translate("status.trialing");
    case "past_due":
      return translate("status.pastDue");
    case "unpaid":
      return translate("status.unpaid");
    case "canceled":
      return translate("status.canceled");
    case "incomplete":
      return translate("status.incomplete");
    case "incomplete_expired":
      return translate("status.expired");
    case "paused":
      return translate("status.paused");
    default:
      return statusKey;
  }
};

const PlanCheckoutButtons = ({
  onCheckout,
  isCheckingOut,
  checkoutPlan,
  translate,
}: {
  onCheckout: (plan: SubscriptionPlan) => void;
  isCheckingOut: boolean;
  checkoutPlan: SubscriptionPlan | null;
  translate: BillingTranslate;
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
          ? translate("loading")
          : `${planName(plan, translate)} · $${PLAN_PRICES[plan]}${translate("perMonth")}`}
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
  translate,
}: {
  subscription: Subscription.Type;
  onManage: () => void;
  onCheckout: (plan: SubscriptionPlan) => void;
  isManaging: boolean;
  isCheckingOut: boolean;
  checkoutPlan: SubscriptionPlan | null;
  translate: BillingTranslate;
}) => {
  const planKey =
    subscription.plan === "compete" ||
    subscription.plan === "scale" ||
    subscription.plan === "dominate"
      ? subscription.plan
      : null;
  const statusKey = subscription.status;
  const statusClass =
    STATUS_STYLES[statusKey] ?? "bg-background-dimmed text-foreground-dimmed";
  const statusLabel = subscriptionStatusLabel(statusKey, translate);
  const upgradeTarget: SubscriptionPlan | null = planKey
    ? UPGRADE_LADDER[planKey]
    : null;

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-base text-foreground-rich">
            {planKey ? planLabel(planKey, translate) : translate("noActivePlan")}
          </p>
          {planKey && (
            <p className="mt-1 font-bold text-2xl text-primary tracking-[-0.02em]">
              ${PLAN_PRICES[planKey]}
              <span className="font-medium text-foreground-dimmed text-sm">
                {translate("perMonth")}
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
          <span className="text-foreground-dimmed text-sm">
            {translate("billingCycle")}
          </span>
          <span className="font-medium text-foreground text-sm">
            {translate("monthly")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground-dimmed text-sm">
            {subscription.cancelAtPeriodEnd
              ? translate("endsOn")
              : translate("nextBillingDate")}
          </span>
          <span className="font-medium text-foreground text-sm">
            {formatDate(subscription.currentPeriodEnd)}
          </span>
        </div>
        {subscription.cancelAtPeriodEnd && (
          <p className="mt-1 text-foreground-dimmed text-sm">
            {translate("cancelNotice")}
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
              ? translate("loading")
              : translate("upgradeTo", {
                  plan: planName(upgradeTarget, translate),
                })}
          </Button>
        )}
        <Button color="neutral" onClick={onManage} disabled={isManaging}>
          {isManaging ? translate("loading") : translate("manageBilling")}
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
  translate,
}: {
  summary: PerformanceFee.PeriodSummary;
  onCheckout: (plan: SubscriptionPlan) => void;
  isCheckingOut: boolean;
  checkoutPlan: SubscriptionPlan | null;
  translate: BillingTranslate;
}) => (
  <>
    <div className="flex items-start justify-between">
      <div>
        <p className="font-semibold text-base text-foreground-rich">
          {translate("payAsYouGo.title")}
        </p>
        <p className="mt-1 text-foreground-dimmed text-sm">
          {translate("payAsYouGo.description")}
        </p>
      </div>
      <span className={`${STATUS_PILL_CLASS_NAME} bg-success/10 text-success`}>
        {translate("payAsYouGo.active")}
      </span>
    </div>
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex justify-between">
        <span className="text-foreground-dimmed text-sm">
          {translate("payAsYouGo.fee")}
        </span>
        <span className="font-medium text-foreground text-sm">
          {translate("payAsYouGo.feeDetail", {
            rate: formatRate(summary.rateBps),
          })}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-foreground-dimmed text-sm">
          {translate("payAsYouGo.monthlyCap")}
        </span>
        <span className="font-medium text-foreground text-sm">
          {formatAmount(summary.capCents, "USD")}
        </span>
      </div>
    </div>
    <div className="mt-6">
      <p className="text-foreground-dimmed text-sm">
        {translate("payAsYouGo.switchHint")}
      </p>
      <div className="mt-3">
        <PlanCheckoutButtons
          onCheckout={onCheckout}
          isCheckingOut={isCheckingOut}
          checkoutPlan={checkoutPlan}
          translate={translate}
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
  translate,
}: {
  onStartPayg: () => void;
  onCheckout: (plan: SubscriptionPlan) => void;
  isStartingPayg: boolean;
  isCheckingOut: boolean;
  checkoutPlan: SubscriptionPlan | null;
  translate: BillingTranslate;
}) => (
  <>
    <div>
      <p className="font-semibold text-base text-foreground-rich">
        {translate("choosePlan.title")}
      </p>
      <p className="mt-1 text-foreground-dimmed text-sm">
        {translate("choosePlan.description")}
      </p>
    </div>
    <div className="mt-6 flex flex-col gap-3">
      <Button
        color="primary"
        className="w-full"
        disabled={isStartingPayg}
        onClick={onStartPayg}
      >
        {isStartingPayg
          ? translate("loading")
          : translate("choosePlan.startPayg")}
      </Button>
      <PlanCheckoutButtons
        onCheckout={onCheckout}
        isCheckingOut={isCheckingOut}
        checkoutPlan={checkoutPlan}
        translate={translate}
      />
    </div>
  </>
);

const PerformanceFeeCard = ({
  summary,
  onAddPayment,
  isAddingPayment,
  translate,
}: {
  summary: PerformanceFee.PeriodSummary;
  onAddPayment: () => void;
  isAddingPayment: boolean;
  translate: BillingTranslate;
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
          label: translate("performanceFee.actionNeeded"),
          className: "bg-warning/10 text-warning",
        };
      case summary.enabled:
        return {
          label: translate("performanceFee.active"),
          className: "bg-success/10 text-success",
        };
      default:
        return {
          label: translate("performanceFee.off"),
          className: "bg-background-dimmed text-foreground-dimmed",
        };
    }
  })();

  return (
    <div>
      <div className="flex items-center justify-between border-accent-foreground border-b bg-background-dimmed px-4 py-3">
        <p className="font-semibold text-foreground-rich text-sm">
          {translate("performanceFee.title")}
        </p>
        <span className={`${STATUS_PILL_CLASS_NAME} ${pill.className}`}>
          {pill.label}
        </span>
      </div>
      <div className="p-6">
        <p className="text-foreground-dimmed text-sm">
          {translate("performanceFee.description", {
            rate: formatRate(summary.rateBps),
            cap: formatAmount(summary.capCents, "USD"),
          })}
        </p>

        {summary.awaitingPayment && (
          <div className="mt-4 flex flex-col gap-3 border border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground-rich text-sm">
                {translate("performanceFee.due", {
                  amount: formatAmount(summary.amountOwedCents, "USD"),
                })}
              </p>
              <p className="mt-0.5 text-foreground-dimmed text-xs">
                {translate("performanceFee.dueHint")}
              </p>
            </div>
            <Button
              color="primary"
              onClick={onAddPayment}
              disabled={isAddingPayment}
            >
              {isAddingPayment
                ? translate("loading")
                : translate("performanceFee.addPayment")}
            </Button>
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-end justify-between">
            <p className="font-bold text-2xl text-primary tracking-[-0.02em]">
              {formatAmount(summary.billedCents, "USD")}
            </p>
            <p className="text-foreground-dimmed text-sm">
              {translate("performanceFee.ofCap", {
                cap: formatAmount(summary.capCents, "USD"),
              })}
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
              {translate("performanceFee.billedSoFar", {
                amount: formatAmount(summary.reportedCents, "USD"),
              })}
            </span>
            <span>
              {translate("performanceFee.resets", {
                date: formatDate(summary.periodEnd),
              })}
            </span>
          </div>
        </div>

        {summary.conversions.length > 0 && (
          <div className="mt-6">
            <p className="font-semibold text-foreground-rich text-xs uppercase tracking-[0.05em]">
              {translate("performanceFee.attributedOrders")}
            </p>
            <div className="mt-2 divide-y divide-accent-foreground border-accent-foreground border-t">
              {summary.conversions.map((conversion) => (
                <div
                  key={conversion.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {translate("performanceFee.order", {
                        id: conversion.orderExternalId,
                      })}
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
  const translate = useTranslations("dashboard.settings.billing");

  const [handleManage, isManaging] = useAsyncAction(async () => {
    const result = await Subscription.createBillingPortalSession();
    if (!result.success) {
      toast.add({
        title: translate("toast.portalFailed"),
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
        title: translate("toast.paygFailed"),
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
        title: translate("toast.paymentSetupFailed"),
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
            title: translate("toast.checkoutFailed"),
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
            {translate("currentPlan")}
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
                    translate={translate}
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
                    translate={translate}
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
                    translate={translate}
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
          translate={translate}
        />
      )}

      <div>
        <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-semibold text-foreground-rich text-sm">
            {translate("invoiceHistory")}
          </p>
        </div>
        {invoices.length === 0 ? (
          <div className="px-4 py-6 text-foreground-dimmed text-sm">
            {translate("noInvoices")}
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
                        {translate("download")}
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
