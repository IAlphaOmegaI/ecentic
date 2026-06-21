type SubscriptionBadgeProps = {
  plan: string | null;
  status: string | null;
};

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

export const SubscriptionBadge = ({ plan, status }: SubscriptionBadgeProps) => {
  const hasActivePlan =
    plan !== null && status !== null && ACTIVE_STATUSES.has(status);
  const needsAttention = status !== null && ATTENTION_STATUSES.has(status);
  const isPremium =
    hasActivePlan && (status === "active" || status === "trialing");

  const label = (() => {
    if (!hasActivePlan) return "No plan";
    const note = STATUS_NOTE[status];
    return note ? `${plan} · ${note}` : plan;
  })();

  const variantClassName = (() => {
    switch (true) {
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
