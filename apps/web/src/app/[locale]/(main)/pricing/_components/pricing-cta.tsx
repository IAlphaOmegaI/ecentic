"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import * as Payg from "@/server/app/billing/payg";
import * as Subscription from "@/server/app/subscription";

type Props = {
  plan: "payg" | "compete" | "scale" | "dominate";
  color?: Button.Props["color"];
  className?: string;
  children: React.ReactNode;
};

export const PricingCTA = ({ plan, color, className, children }: Props) => {
  const router = useRouter();
  const toast = useToastManager();
  const translate = useTranslations("pricing");
  const general = useTranslations("general");

  const [handleClick, isPending] = useAsyncAction(async () => {
    // Pay-as-you-go is free to start — activate the account and land on the
    // dashboard; no Stripe checkout.
    if (plan === "payg") {
      const activation = await Payg.startPayAsYouGo();
      if (!activation.success) {
        if (activation.error.name === "unauthenticated-error") {
          router.push(`/sign-in?next=${encodeURIComponent("/dashboard")}`);
          return;
        }
        toast.add({
          title: translate("error.payg.title"),
          description: activation.error.message,
          type: "error",
        });
        return;
      }
      router.push("/dashboard");
      return;
    }

    const checkout = await Subscription.createCheckoutSession({ plan });
    if (!checkout.success) {
      if (checkout.error.name === "unauthenticated-error") {
        router.push(`/sign-in?next=${encodeURIComponent("/pricing#pricing")}`);
        return;
      }
      toast.add({
        title: translate("error.checkout.title"),
        description: checkout.error.message,
        type: "error",
      });
      return;
    }

    window.location.href = checkout.data.url;
  });

  return (
    <Button
      color={color ?? (plan === "payg" ? "accent" : "primary")}
      type="button"
      className={className}
      onClick={() => handleClick()}
      disabled={isPending}
    >
      {isPending ? general("states.pending.primary") : children}
    </Button>
  );
};
