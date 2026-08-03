import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { BookCall } from "@/components/cal";
import { Plus } from "@/components/plus";
import shopify from "@/public/images/shopify.svg";
import woocommerce from "@/public/images/woocommerce.svg";
import { PricingCTA } from "./pricing-cta";

type Plan = {
  id: "payg" | "compete" | "scale" | "dominate";
  name: string;
  category: string;
  tagline: string;
  badge?: string;
  figure: string;
  suffix: string;
  note: string;
  features: readonly string[];
  cta: string;
  highlighted?: boolean;
};

const plans: readonly Plan[] = [
  {
    id: "payg",
    name: "Pay-as-you-go",
    category: "Pay for results",
    tagline: "Only pay when we sell",
    badge: "Free to start",
    figure: "3%",
    suffix: "on AI-attributed orders",
    note: "$0 until an agent drives a sale — no card to start, capped at $500/mo.",
    features: [
      "Everything in Dominate, from day one",
      "No credit card to start",
      "Pay only on orders AI agents drive",
      "Hard $500/mo cap — no surprises",
    ],
    cta: "Start free",
    highlighted: true,
  },
  {
    id: "compete",
    name: "Compete",
    category: "Flat monthly",
    tagline: "Know where you lose",
    figure: "$14.90",
    suffix: "/mo",
    note: "Flat monthly · no performance fee.",
    features: [
      "Up to 100 products",
      "Daily agent simulations",
      "Competitor battlecards",
      "Manual optimization suggestions",
    ],
    cta: "Start Competing",
  },
  {
    id: "scale",
    name: "Scale",
    category: "Flat monthly",
    tagline: "Optimize on autopilot",
    figure: "$44.90",
    suffix: "/mo",
    note: "Flat monthly · no performance fee.",
    features: [
      "Up to 1000 products",
      "Continuous simulations",
      "Auto-optimization + one-click publish",
      "Competitor battlecards",
    ],
    cta: "Start Scaling",
  },
  {
    id: "dominate",
    name: "Dominate",
    category: "Flat monthly",
    tagline: "Own the agent shelf",
    figure: "$149",
    suffix: "/mo",
    note: "Flat monthly · no performance fee.",
    features: [
      "Everything in Scale",
      "Model drift alerts",
      "UCP generation",
      "Partner deal tier (YC, Techstars)",
    ],
    cta: "Start Dominating",
  },
] as const;

export const Plans = () => (
  <section id="pricing" className="scroll-mt-[5.5rem]">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x border-b">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      {/* Step one — the free scan every account starts with */}
      <div className="relative border-accent-foreground border-b">
        <Plus className="bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 md:flex" />
        <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
        <div className="grid grid-cols-1 divide-y divide-accent-foreground md:grid-cols-[8fr_5fr] md:items-stretch md:divide-x md:divide-y-0">
          <div className="flex h-full flex-col justify-between gap-8 bg-primary p-6 text-white md:p-10">
            <div className="flex flex-col gap-4">
              <span className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium text-sm">
                Free · no card required
              </span>
              <h2 className="max-w-lg font-body font-medium text-3xl leading-tight md:text-4xl">
                Scan your store. See your AI Agent Score.
              </h2>
              <p className="max-w-lg font-light text-lg text-white">
                A one-time simulation of your top 10 products across ChatGPT,
                Claude, Gemini, and Perplexity.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                color="accent"
                className="w-full sm:w-auto"
                render={<Link href="/sign-up" />}
              >
                Scan your store free
                <ArrowRightIcon className="size-4" />
              </Button>
              <p className="text-sm text-white">
                Results in about two minutes · Shopify or WooCommerce
              </p>
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
                  AI Agent Score
                </p>
              </div>
            </div>
            <div className="relative mt-3 h-1 w-full bg-accent-foreground">
              <div className="h-full w-[72%] bg-primary" />
            </div>
            <p className="relative mt-4 font-light text-foreground-dimmed text-sm">
              A sample Win Rate Report — yours shows exactly where agents skip
              you, and why.
            </p>
          </div>
        </div>
      </div>

      {/* Step two — pick a payment model */}
      <div className="p-6 md:p-12">
        <h2 className="font-body font-medium text-3xl text-foreground md:text-5xl">
          Choose how you pay.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-lg">
          Every plan runs the same simulate → diagnose → optimize loop. Start
          with pay-as-you-go and pay only on agent-driven orders, or pick a flat
          monthly plan when you want predictable billing.
        </p>
        <p className="mt-3 max-w-2xl text-foreground-dimmed text-sm">
          No minimums, month-to-month billing, and no setup fees. Save 20% with
          the EU Presence bundle.
        </p>
      </div>

      {/* Four plans: two-up on tablet, one row of four once there is width for
          it. Three columns would strand a single card on its own row. */}
      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2 xl:grid-cols-4">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col p-6 md:min-h-108 md:p-8",
              plan.highlighted
                ? "bg-primary text-white"
                : "bg-background-rich text-foreground",
            )}
          >
            <p
              className={cn(
                "font-medium text-sm",
                // Text on the highlighted plan stays solid white: that is the
                // ceiling on the primary field at 4.36:1, and the tints this
                // used to carry measured 3.05 (/60) and 3.59 (/70). The check
                // icon keeps its /80 — non-text answers to 3:1, cleared at 3.34.
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
                {plan.cta}
              </PricingCTA>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 border-accent-foreground border-t md:grid-cols-3">
        <div className="col-span-2 flex flex-col justify-center bg-background-dimmed p-6 md:px-12 md:py-8">
          <h3 className="font-body font-medium text-2xl text-foreground">
            Enterprise
          </h3>
          <p className="mt-1 max-w-xl font-body font-light text-foreground-dimmed text-lg">
            Custom limits, enterprise security, UCP signing, multi-brand
            dashboards, and dedicated support.
          </p>
        </div>
        <div className="flex flex-col justify-end border-accent-foreground border-t bg-background-dimmed p-6 md:border-t-0 md:border-l md:p-8">
          <BookCall color="primary" className="w-full">
            Book a call
            <ArrowRightIcon className="size-4" />
          </BookCall>
        </div>
      </div>
    </div>
  </section>
);
