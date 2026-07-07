"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type * as PerformanceFee from "@/server/app/billing/performance-fee";
import * as Subscription from "@/server/app/subscription";

type Props = {
  subscription: Subscription.Type | null;
  invoices: Subscription.InvoiceSummary[];
  performanceFee: PerformanceFee.PeriodSummary | null;
};

const PLAN_META = {
  compete: { label: "Compete Plan", price: 149 },
  dominate: { label: "Dominate Plan", price: 449 },
} as const;

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
  onCheckout: (plan: "compete" | "dominate") => void;
  isManaging: boolean;
  isCheckingOut: boolean;
  checkoutPlan: "compete" | "dominate" | null;
}) => {
  const planKey =
    subscription.plan === "compete" || subscription.plan === "dominate"
      ? subscription.plan
      : null;
  const meta = planKey ? PLAN_META[planKey] : null;
  const statusKey = subscription.status;
  const statusClass =
    STATUS_STYLES[statusKey] ?? "bg-background-dimmed text-foreground-dimmed";
  const statusLabel = STATUS_LABELS[statusKey] ?? statusKey;
  const upgradeTarget: "compete" | "dominate" | null =
    planKey === "compete" ? "dominate" : null;

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
              : "Upgrade to Dominate"}
          </Button>
        )}
        <Button color="neutral" onClick={onManage} disabled={isManaging}>
          {isManaging ? "Loading…" : "Manage Billing"}
        </Button>
      </div>
    </>
  );
};

const NoPlan = ({
  onCheckout,
  isCheckingOut,
  checkoutPlan,
}: {
  onCheckout: (plan: "compete" | "dominate") => void;
  isCheckingOut: boolean;
  checkoutPlan: "compete" | "dominate" | null;
}) => (
  <>
    <div>
      <p className="font-semibold text-base text-foreground-rich">
        No active plan
      </p>
      <p className="mt-1 text-foreground-dimmed text-sm">
        Pick a plan to start running daily agent simulations.
      </p>
    </div>
    <div className="mt-6 flex flex-wrap gap-3">
      <Button
        color="primary"
        className="flex-1"
        disabled={isCheckingOut}
        onClick={() => onCheckout("compete")}
      >
        {isCheckingOut && checkoutPlan === "compete"
          ? "Loading…"
          : "Start Compete · $149/mo"}
      </Button>
      <Button
        color="primary"
        className="flex-1"
        disabled={isCheckingOut}
        onClick={() => onCheckout("dominate")}
      >
        {isCheckingOut && checkoutPlan === "dominate"
          ? "Loading…"
          : "Start Dominate · $449/mo"}
      </Button>
    </div>
  </>
);

const PerformanceFeeCard = ({
  summary,
}: {
  summary: PerformanceFee.PeriodSummary;
}) => {
  const ratePercent = (summary.rateBps / 100).toFixed(
    summary.rateBps % 100 === 0 ? 0 : 2,
  );
  const usedPercent =
    summary.capCents > 0
      ? Math.min(
          100,
          Math.round((summary.billedCents / summary.capCents) * 100),
        )
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between border-accent-foreground border-b bg-background-dimmed px-4 py-3">
        <p className="font-semibold text-foreground-rich text-sm">
          Performance Fee
        </p>
        <span
          className={`${STATUS_PILL_CLASS_NAME} ${
            summary.enabled
              ? "bg-success/10 text-success"
              : "bg-background-dimmed text-foreground-dimmed"
          }`}
        >
          {summary.enabled ? "Active" : "Off"}
        </span>
      </div>
      <div className="p-6">
        <p className="text-foreground-dimmed text-sm">
          {ratePercent}% on AI-attributed orders · capped at{" "}
          {formatAmount(summary.capCents, "USD")}/mo. You only pay when an agent
          buys because of an optimization we made — never on your other sales.
        </p>

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

  const [checkoutPlan, setCheckoutPlan] = useState<
    "compete" | "dominate" | null
  >(null);

  const [handleCheckout, isCheckingOut] = useAsyncAction(
    async (plan: "compete" | "dominate") => {
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

  const hasActivePlan =
    subscription !== null && activeStatuses.has(subscription.status);

  const showPerformanceFee =
    performanceFee !== null &&
    (performanceFee.enabled ||
      performanceFee.accruedCents > 0 ||
      performanceFee.conversions.length > 0);

  return (
    <div className="divide-y divide-accent-foreground">
      <div>
        <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-semibold text-foreground-rich text-sm">
            Current Plan
          </p>
        </div>
        <div className="p-6">
          {hasActivePlan && subscription ? (
            <ActivePlan
              subscription={subscription}
              onManage={() => handleManage()}
              onCheckout={(plan) => handleCheckout(plan)}
              isManaging={isManaging}
              isCheckingOut={isCheckingOut}
              checkoutPlan={checkoutPlan}
            />
          ) : (
            <NoPlan
              onCheckout={(plan) => handleCheckout(plan)}
              isCheckingOut={isCheckingOut}
              checkoutPlan={checkoutPlan}
            />
          )}
        </div>
      </div>

      {showPerformanceFee && performanceFee && (
        <PerformanceFeeCard summary={performanceFee} />
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
