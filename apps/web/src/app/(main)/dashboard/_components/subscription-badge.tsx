import type * as Subscription from "@/server/app/subscription";

// Statuses where the subscription still grants plan access (mirrors billing-section).
const ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);

// Active but the payment needs the user's attention.
const ATTENTION_STATUSES = new Set(["past_due", "unpaid"]);

// Short suffix appended to the plan name when the status isn't a clean "active".
const STATUS_NOTE: Record<string, string> = {
  trialing: "Trial",
  past_due: "Past due",
  unpaid: "Unpaid",
  paused: "Paused",
};

export const SubscriptionBadge = ({
  subscription,
}: {
  subscription: Subscription.Type | null;
}) => {
  const isPayg = subscription?.billingMode === "payg";
  const plan = subscription?.plan ?? null;
  const status = subscription?.status ?? null;

  const hasActivePlan =
    !isPayg && plan !== null && status !== null && ACTIVE_STATUSES.has(status);
  const needsAttention = status !== null && ATTENTION_STATUSES.has(status);
  const isPremium =
    hasActivePlan && (status === "active" || status === "trialing");

  const label = (() => {
    if (isPayg) return "Pay-as-you-go";
    if (!hasActivePlan) return "No plan";
    const note = status ? STATUS_NOTE[status] : undefined;
    return note ? `${plan} · ${note}` : plan;
  })();

  const variantClassName = (() => {
    switch (true) {
      case isPayg:
        return "border-primary/40 bg-primary/10 text-primary";
      case isPremium:
        return "animate-gold-shine border-[hsl(42_78%_45%)] capitalize";
      case hasActivePlan && needsAttention:
        return "border-warning/40 bg-warning/10 text-warning capitalize";
      case hasActivePlan:
        return "border-accent-foreground bg-background-dimmed text-foreground-dimmed capitalize";
      default:
        return "border-accent-foreground bg-background-dimmed text-foreground-dimmed";
    }
  })();

  return (
    <span
      className={`cursor-default rounded-md border px-3 py-1 font-semibold text-sm ${variantClassName}`}
    >
      {label}
    </span>
  );
};
