import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BookCall } from "@/components/cal";
import { Plus } from "@/components/plus";
import crown from "@/public/images/ascii/crown.png";
import knight from "@/public/images/ascii/knight.png";
import piggybank from "@/public/images/ascii/piggybank.png";
import rocket from "@/public/images/ascii/rocket.png";
import shopify from "@/public/images/shopify.svg";
import woocommerce from "@/public/images/woocommerce.svg";
import type { PageBanner } from "../../_components/page-banner";
import { PricingCTA } from "./pricing-cta";

type PlanId = "payg" | "compete" | "scale" | "dominate";

type PlanCopy = {
  name: string;
  category: string;
  tagline: string;
  badge?: string;
  figure: string;
  suffix: string;
  note: string;
  features: readonly string[];
  action: {
    primary: string;
  };
  art: {
    alt: string;
  };
};

type Plan = PlanCopy & {
  id: PlanId;
  art: PageBanner.Art;
  highlighted?: boolean;
};

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

export const Plans = async () => {
  const translate = await getTranslations("pricing");

  const plans: readonly Plan[] = planIds.map((id) => {
    const copy = translate.raw(`plans.${id}`) as PlanCopy;
    return {
      id,
      ...copy,
      art: {
        source: planArt[id].source,
        alt: copy.art.alt,
      },
      highlighted: id === "payg",
      badge: id === "payg" ? copy.badge : undefined,
    };
  });

  const enterprise = translate.raw("plans.enterprise") as {
    title: string;
    description: string;
    action: { primary: string };
  };

  return (
    <section id="pricing" className="scroll-mt-[5.5rem]">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x border-b">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <div className="relative border-accent-foreground border-b">
          <Plus className="bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 md:flex" />
          <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
          <div className="grid grid-cols-1 divide-y divide-accent-foreground md:grid-cols-[8fr_5fr] md:items-stretch md:divide-x md:divide-y-0">
            <div className="flex h-full flex-col justify-between gap-8 bg-primary p-6 text-white md:p-10">
              <div className="flex flex-col gap-4">
                <span className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium text-sm">
                  {translate("scan.badge")}
                </span>
                <h2 className="max-w-lg font-body font-medium text-3xl leading-tight md:text-4xl">
                  {translate("scan.title")}
                </h2>
                <p className="max-w-lg font-light text-lg text-white">
                  {translate("scan.description")}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  color="accent"
                  className="w-full sm:w-auto"
                  render={<Link href="/sign-up" />}
                >
                  {translate("scan.action.primary")}
                  <ArrowRightIcon className="size-4" />
                </Button>
                <p className="text-sm text-white">{translate("scan.proof")}</p>
              </div>
            </div>
            <div className="relative flex h-full min-h-full flex-col justify-end overflow-hidden bg-background-rich p-6 md:p-10">
              <div className="flex items-center gap-3">
                <Image
                  src={shopify}
                  alt="Shopify"
                  className="h-6 w-auto opacity-80"
                />
                <Image
                  src={woocommerce}
                  alt="WooCommerce"
                  className="h-6 w-auto opacity-80"
                />
              </div>
              <div className="relative mt-4 flex items-end gap-3">
                <span className="font-bold text-7xl text-primary leading-none tracking-tight">
                  72
                </span>
                <div className="mb-1">
                  <p className="font-medium text-foreground-dimmed uppercase tracking-tight">
                    / 100
                  </p>
                  <p className="font-light text-foreground-dimmed">
                    {translate("scan.sample.scoreLabel")}
                  </p>
                </div>
              </div>
              <div className="relative mt-3 h-1 w-full bg-accent-foreground">
                <div className="h-full w-[72%] bg-primary" />
              </div>
              <p className="relative mt-4 font-light text-foreground-dimmed text-sm">
                {translate("scan.sample.caption")}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-12">
          <span className="font-normal text-3xl text-primary">
            {translate("choosePayment.number")}
          </span>
          <h2 className="mt-2 max-w-2xl font-body font-medium text-4xl text-foreground md:text-6xl">
            {translate("choosePayment.title")}
          </h2>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            {translate("choosePayment.description")}
          </p>
        </div>

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
      </div>
    </section>
  );
};
