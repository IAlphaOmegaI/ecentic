import { ArrowRightIcon, CheckIcon, ShieldCheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { BookCall } from "@/components/cal";
import { Plus } from "@/components/plus";
import { PricingCTA } from "./pricing-cta";

type Plan = {
  id: "payg" | "compete" | "dominate";
  name: string;
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
  },
  {
    id: "compete",
    name: "Compete",
    tagline: "Know where you lose",
    figure: "$149",
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
    id: "dominate",
    name: "Dominate",
    tagline: "Win on autopilot",
    badge: "Most picked",
    figure: "$449",
    suffix: "/mo",
    note: "Flat monthly · no performance fee.",
    features: [
      "Up to 1000 products",
      "Continuous simulations",
      "Auto-optimization + one-click publish",
      "Model drift alerts",
      "UCP generation",
    ],
    cta: "Start Dominating",
    highlighted: true,
  },
] as const;

const guarantees = [
  "No minimums",
  "Month-to-month · cancel anytime",
  "No setup fees",
  "20% off with the EU Presence bundle",
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
        <div className="grid grid-cols-1 divide-y divide-accent-foreground md:grid-cols-[8fr_5fr] md:divide-x md:divide-y-0">
          <div className="flex flex-col items-start justify-center gap-4 bg-background-dimmed p-6 md:p-10">
            <p className="font-medium text-primary text-sm uppercase tracking-[0.18em]">
              Step one · free for every account
            </p>
            <h2 className="font-body font-medium text-2xl text-foreground md:text-4xl">
              Scan your store. See your AI Agent Score.
            </h2>
            <p className="max-w-lg font-light text-foreground-dimmed text-lg">
              A one-time simulation of your top 10 products across GPT-4,
              Claude, Gemini, and Perplexity. No credit card, results in about
              two minutes.
            </p>
            <Button color="primary" render={<Link href="/sign-up" />}>
              Scan your store free
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
          <div className="relative flex flex-col justify-center overflow-hidden bg-background-rich p-6 md:p-10">
            <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative flex items-end gap-3">
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
        <p className="font-medium text-primary text-sm uppercase tracking-[0.18em]">
          Step two · when you're ready to optimize
        </p>
        <h2 className="mt-4 font-body font-medium text-3xl text-foreground md:text-5xl">
          Choose how you pay.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-lg">
          Every plan runs the same simulate → diagnose → optimize loop. Pay a
          share of the results, or a flat price for predictability.
        </p>
      </div>

      <div className="hidden grid-cols-3 gap-px border-accent-foreground border-t bg-accent-foreground md:grid">
        <div className="bg-background-dimmed px-6 py-3">
          <p className="font-medium text-primary text-xs uppercase tracking-[0.18em]">
            Performance · pay for results
          </p>
        </div>
        <div className="col-span-2 bg-background-dimmed px-6 py-3">
          <p className="font-medium text-foreground-dimmed text-xs uppercase tracking-[0.18em]">
            Flat monthly · no performance fee
          </p>
        </div>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-3">
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
            <div className="flex h-7 items-center justify-between gap-2">
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
                plan.highlighted ? "text-white/70" : "text-foreground-dimmed",
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
                  plan.highlighted ? "text-white/70" : "text-foreground-dimmed",
                )}
              >
                {plan.suffix}
              </span>
            </div>
            <p
              className={cn(
                "mt-2 min-h-10 font-light text-sm",
                plan.highlighted ? "text-white/60" : "text-foreground-dimmed",
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
                        ? "text-white/80"
                        : "text-foreground-dimmed",
                    )}
                  >
                    {feature}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 md:mt-auto md:pt-6">
              <PricingCTA plan={plan.id} className="w-full">
                {plan.cta}
              </PricingCTA>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 divide-y divide-accent-foreground border-accent-foreground border-t sm:grid-cols-2 sm:divide-x md:grid-cols-4 md:divide-y-0">
        {guarantees.map((guarantee) => (
          <div key={guarantee} className="flex items-center gap-2 p-4">
            <ShieldCheckIcon className="size-4 shrink-0 text-primary" />
            <p className="font-light text-foreground-dimmed text-sm">
              {guarantee}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-center gap-4 border-accent-foreground border-t bg-background-dimmed p-6 md:grid-cols-[1fr_auto] md:px-12 md:py-8">
        <div>
          <h3 className="font-body font-medium text-2xl text-foreground">
            Enterprise
          </h3>
          <p className="mt-1 max-w-xl font-body font-light text-foreground-dimmed text-lg">
            Custom limits, enterprise security, UCP signing, multi-brand
            dashboards, and dedicated support.
          </p>
        </div>
        <BookCall color="accent" className="w-full md:w-auto">
          Book a call
          <ArrowRightIcon className="size-4" />
        </BookCall>
      </div>
    </div>
  </section>
);
