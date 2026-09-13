import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image from "next/image";
import { getMessages } from "next-intl/server";
import { BookCall } from "@/components/cal";
import { Plus } from "@/components/plus";
import crown from "@/public/images/ascii/crown.png";
import knight from "@/public/images/ascii/knight.png";
import piggybank from "@/public/images/ascii/piggybank.png";
import rocket from "@/public/images/ascii/rocket.png";
import type { PageBanner } from "../../_components/page-banner";
import { PricingCTA } from "./pricing-cta";

type PlanId = "payg" | "compete" | "scale" | "dominate";

const planArt: Record<PlanId, PageBanner.Art> = {
  payg: { source: piggybank, alt: "" },
  compete: { source: knight, alt: "" },
  scale: { source: rocket, alt: "" },
  dominate: { source: crown, alt: "" },
};

const planIds: readonly PlanId[] = [
  "payg",
  "compete",
  "scale",
  "dominate",
] as const;

const loadPlans = async () => {
  const messages = await getMessages();

  return {
    plans: planIds.map((id) => {
      const copy = messages.pricing.plans[id];
      return {
        id,
        ...copy,
        art: {
          source: planArt[id].source,
          alt: copy.art.alt,
        },
        highlighted: id === "payg",
        badge: id === "payg" && "badge" in copy ? copy.badge : undefined,
      };
    }),
    enterprise: messages.pricing.plans.enterprise,
  };
};

/**
 * The pricing 2×2 — seamed cells, ASCII art, PAYG on primary. Shared by
 * `/pricing` and the dashboard paywall so the commercial decision looks the
 * same in both places.
 */
export const PlanCards = async () => {
  const { plans } = await loadPlans();

  return (
    <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
      <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
      <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={cn(
            "relative flex flex-col overflow-hidden p-6 md:min-h-108 md:p-8",
            plan.highlighted
              ? "bg-primary text-white"
              : "bg-background-rich text-foreground",
          )}
        >
          <Image
            src={plan.art.source}
            alt={plan.art.alt}
            className={cn(
              "pointer-events-none absolute -right-3 -bottom-3 h-[46%] w-[92%] max-w-none select-none object-contain object-right-bottom brightness-0 [mask-image:linear-gradient(to_bottom,transparent,black_35%)]",
              plan.highlighted ? "opacity-25 invert" : "opacity-25",
            )}
          />
          <div className="relative flex flex-1 flex-col">
            <p
              className={cn(
                "font-medium text-sm",
                plan.highlighted ? "text-white" : "text-foreground-dimmed",
              )}
            >
              {plan.category}
            </p>
            <div className="mt-2 flex h-7 items-center justify-between gap-2">
              <h3 className="font-body font-medium text-2xl">{plan.name}</h3>
              {plan.badge && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 font-medium text-xs uppercase tracking-tight",
                    plan.highlighted
                      ? "bg-white/15 text-white"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {plan.badge}
                </span>
              )}
            </div>
            <p
              className={cn(
                "mt-1 font-body font-light text-lg",
                plan.highlighted ? "text-white" : "text-foreground-dimmed",
              )}
            >
              {plan.tagline}
            </p>

            <div className="mt-6 flex items-baseline gap-2">
              <span
                className={cn(
                  "font-body font-medium text-5xl tracking-tight",
                  !plan.highlighted && "text-primary",
                )}
              >
                {plan.figure}
              </span>
              <span
                className={cn(
                  "font-light text-lg",
                  plan.highlighted ? "text-white" : "text-foreground-dimmed",
                )}
              >
                {plan.suffix}
              </span>
            </div>
            <p
              className={cn(
                "mt-2 min-h-10 font-light text-sm",
                plan.highlighted ? "text-white" : "text-foreground-dimmed",
              )}
            >
              {plan.note}
            </p>

            <div
              className={cn(
                "mt-6 flex flex-col gap-2.5 border-t pt-6",
                plan.highlighted
                  ? "border-white/20"
                  : "border-accent-foreground",
              )}
            >
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-2">
                  <CheckIcon
                    className={cn(
                      "mt-1 size-4 shrink-0",
                      plan.highlighted ? "text-white/80" : "text-primary",
                    )}
                  />
                  <p
                    className={cn(
                      "font-body font-light",
                      plan.highlighted
                        ? "text-white"
                        : "text-foreground-dimmed",
                    )}
                  >
                    {feature}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 md:mt-auto md:pt-6">
              <PricingCTA
                plan={plan.id}
                color={plan.highlighted ? "accent" : "primary"}
                className="w-full"
              >
                {plan.action.primary}
              </PricingCTA>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const PlanEnterprise = async () => {
  const { enterprise } = await loadPlans();

  return (
    <div className="grid grid-cols-1 border-accent-foreground border-t md:grid-cols-3">
      <div className="col-span-2 flex flex-col justify-center bg-background-dimmed p-6 md:px-12 md:py-8">
        <h3 className="font-body font-medium text-2xl text-foreground">
          {enterprise.title}
        </h3>
        <p className="mt-1 max-w-xl font-body font-light text-foreground-dimmed text-lg">
          {enterprise.description}
        </p>
      </div>
      <div className="flex flex-col justify-end border-accent-foreground border-t bg-background-dimmed p-6 md:border-t-0 md:border-l md:p-8">
        <BookCall color="primary" className="w-full">
          {enterprise.action.primary}
          <ArrowRightIcon className="size-4" />
        </BookCall>
      </div>
    </div>
  );
};
