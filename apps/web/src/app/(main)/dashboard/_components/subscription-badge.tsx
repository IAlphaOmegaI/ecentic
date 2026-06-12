type SubscriptionBadgeProps = {
  plan: string | null;
};

export const SubscriptionBadge = ({ plan }: SubscriptionBadgeProps) => (
  <span
    className={`animate-gold-shine cursor-default rounded-md border border-[hsl(42_78%_45%)] px-3 py-1 font-semibold text-sm ${plan ? "capitalize" : ""}`}
  >
    {plan ?? "No plan"}
  </span>
);
