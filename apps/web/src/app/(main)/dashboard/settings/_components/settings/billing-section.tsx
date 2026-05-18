"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import * as Subscription from "@/server/app/subscription";

type Props = {
  subscription: Subscription.Type | null;
  invoices: Subscription.InvoiceSummary[];
};

const PLAN_META = {
  compete: { label: "Compete Plan", price: 149 },
  dominate: { label: "Dominate Plan", price: 449 },
} as const;

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success/10 text-success",
  trialing: "bg-success/10 text-success",
  past_due: "bg-warning/10 text-warning",
  unpaid: "bg-warning/10 text-warning",
  canceled: "bg-foreground/10 text-foreground-dimmed",
  incomplete: "bg-foreground/10 text-foreground-dimmed",
  incomplete_expired: "bg-foreground/10 text-foreground-dimmed",
  paused: "bg-foreground/10 text-foreground-dimmed",
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
    STATUS_STYLES[statusKey] ?? "bg-foreground/10 text-foreground-dimmed";
  const statusLabel = STATUS_LABELS[statusKey] ?? statusKey;
  const upgradeTarget: "compete" | "dominate" | null =
    planKey === "compete" ? "dominate" : null;

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-base text-foreground">
            {meta?.label ?? "No active plan"}
          </p>
          {meta && (
            <p className="mt-1 font-semibold text-2xl text-primary">
              ${meta.price}
              <span className="font-light text-base text-foreground-dimmed">
                /mo
              </span>
            </p>
          )}
        </div>
        <span
          className={`px-2 py-0.5 font-medium text-sm ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <div className="flex justify-between">
          <span className="font-light text-foreground-dimmed text-sm">
            Billing cycle
          </span>
          <span className="font-medium text-base text-foreground">
            Monthly
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-light text-foreground-dimmed text-sm">
            {subscription.cancelAtPeriodEnd ? "Ends on" : "Next billing date"}
          </span>
          <span className="font-medium text-base text-foreground">
            {formatDate(subscription.currentPeriodEnd)}
          </span>
        </div>
        {subscription.cancelAtPeriodEnd && (
          <p className="mt-1 font-light text-foreground-dimmed text-sm">
            Your plan is set to cancel at the end of the current period.
          </p>
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        {upgradeTarget && (
          <Button
            variant="flat"
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
        <Button
          variant="outline"
          color="neutral"
          onClick={onManage}
          disabled={isManaging}
        >
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
      <p className="font-medium text-base text-foreground">No active plan</p>
      <p className="mt-1 font-light text-foreground-dimmed text-sm">
        Pick a plan to start running daily agent simulations.
      </p>
    </div>
    <div className="mt-6 flex flex-wrap gap-3">
      <Button
        variant="outline"
        color="accent"
        className="flex-1 border-primary text-primary"
        disabled={isCheckingOut}
        onClick={() => onCheckout("compete")}
      >
        {isCheckingOut && checkoutPlan === "compete"
          ? "Loading…"
          : "Start Compete · $149/mo"}
      </Button>
      <Button
        variant="flat"
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

export const BillingSection = ({ subscription, invoices }: Props) => {
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

  return (
    <div className="divide-y divide-accent-foreground">
      <div>
        <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-medium text-base text-foreground">Current Plan</p>
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

      <div>
        <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-3">
          <p className="font-medium text-base text-foreground">
            Invoice History
          </p>
        </div>
        {invoices.length === 0 ? (
          <div className="px-4 py-6 font-light text-foreground-dimmed text-sm">
            No invoices yet.
          </div>
        ) : (
          <div className="divide-y divide-accent-foreground">
            {invoices.map((invoice) => {
              const statusClass =
                invoice.status === "paid"
                  ? "bg-success/10 text-success"
                  : invoice.status === "open"
                    ? "bg-warning/10 text-warning"
                    : "bg-foreground/10 text-foreground-dimmed";
              return (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-base text-foreground">
                      {formatDate(invoice.createdAt)}
                    </p>
                    <p className="font-light text-foreground-dimmed text-sm">
                      {formatAmount(invoice.amountPaid, invoice.currency)}
                      {invoice.number ? ` · ${invoice.number}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 font-medium text-sm ${statusClass}`}
                    >
                      {invoice.status}
                    </span>
                    {invoice.pdfUrl && (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-light text-primary text-sm hover:underline"
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
