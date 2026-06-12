type SubscriptionBadgeProps = {
  plan: string | null;
};

export const SubscriptionBadge = ({ plan }: SubscriptionBadgeProps) => (
  <p
    className={`animate-dominate-pulse cursor-default rounded-md border-[1.5px] border-primary px-3 py-1 font-semibold text-[13px] text-primary ${plan && "capitalize"}`}
  >
    {plan ?? "No plan"}
  </p>
);
