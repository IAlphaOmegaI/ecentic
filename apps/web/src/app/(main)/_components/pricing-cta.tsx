"use client";

import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useRouter } from "next/navigation";
import * as Subscription from "@/server/app/subscription";

type Props = {
  plan: "compete" | "dominate";
  className?: string;
  children: React.ReactNode;
  variant?: "outline" | "flat";
};

export const PricingCTA = ({ plan, className, children, variant }: Props) => {
  const router = useRouter();
  const toast = useToastManager();

  const [handleClick, isPending] = useAsyncAction(async () => {
    const result = await Subscription.createCheckoutSession({ plan });

    if (!result.success) {
      if (result.error.name === "unauthenticated-error") {
        router.push(`/sign-in?next=${encodeURIComponent("/#pricing")}`);
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
  });

  return (
    <Button
      variant={variant ?? "outline"}
      color={variant === "flat" ? "primary" : "accent"}
      type="button"
      className={className}
      onClick={() => handleClick()}
      disabled={isPending}
    >
      {isPending ? "Loading…" : children}
    </Button>
  );
};
