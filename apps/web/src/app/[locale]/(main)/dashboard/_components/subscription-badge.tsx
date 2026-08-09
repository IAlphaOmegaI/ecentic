import { getTranslations } from "next-intl/server";
import type * as Subscription from "@/server/app/subscription";

const ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);

const ATTENTION_STATUSES = new Set(["past_due", "unpaid"]);

const STATUS_NOTE_KEYS = {
  trialing: "trial",
  past_due: "pastDue",
  unpaid: "unpaid",
  paused: "paused",
} as const;

export const SubscriptionBadge = async ({
  subscription,
}: {
  subscription: Subscription.Type | null;
}) => {
  const translate = await getTranslations("dashboard.subscription");

  const isPayg = subscription?.billingMode === "payg";
  const plan = subscription?.plan ?? null;
  const status = subscription?.status ?? null;

  const hasActivePlan =
    !isPayg && plan !== null && status !== null && ACTIVE_STATUSES.has(status);
  const needsAttention = status !== null && ATTENTION_STATUSES.has(status);
  const isPremium =
    hasActivePlan && (status === "active" || status === "trialing");

  const label = (() => {
    if (isPayg) return translate("payAsYouGo");
    if (!hasActivePlan) return translate("noPlan");
    const noteKey =
      status && status in STATUS_NOTE_KEYS
        ? STATUS_NOTE_KEYS[status as keyof typeof STATUS_NOTE_KEYS]
        : undefined;
    const note = noteKey ? translate(`status.${noteKey}`) : undefined;
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
