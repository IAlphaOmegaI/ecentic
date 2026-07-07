import { CheckIcon, ShieldCheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { BookCall } from "@/components/cal";
import { Plus } from "@/components/plus";
import { PricingCTA } from "./pricing-cta";

const payg = {
  name: "Pay-as-you-go",
  tagline: "Only pay when we sell",
  features: [
    "Full features unlocked",
    "No card required to start",
    "3% only on AI-attributed orders",
    "Hard $500/mo cap — no surprises",
  ],
  cta: "Start free",
};

const compete = {
  name: "Compete",
  tagline: "Know your enemy",
  price: 149,
  features: [
    "Up to 100 products",
    "Daily simulations",
    "Competitor battlecards",
    "Manual optimization suggestions",
  ],
  cta: "Start Competing",
};

const dominate = {
  name: "Dominate",
  tagline: "Win on autopilot.",
  price: 449,
  features: [
    "Up to 1000 products",
    "Continuous simulations",
    "Auto-optimization + one-click publish",
    "Model drift alerts",
    "UCP generation",
  ],
  cta: "Start Dominating",
};

const guarantees = [
  "No minimums",
  "Month-to-month · cancel anytime",
  "No setup fees",
  "20% off with the EU Presence bundle",
] as const;

export const Pricing = () => (
  <section
    id="pricing"
    className="relative -left-[calc(50vw-50%)] w-screen scroll-mt-[5.5rem]"
  >
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x border-b">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <div className="relative border-accent-foreground p-6 md:p-12">
        <h2 className="font-body text-3xl text-foreground md:text-6xl">
          Start free. <br />
          Pay when agents start picking you.
        </h2>
        <p className="mt-4 max-w-xl font-light text-foreground-dimmed text-lg">
          Scan for free, then go pay-as-you-go — no card, you only pay when an
          AI agent buys because of us. Prefer predictable billing? Pick a flat
          monthly plan with no performance fee.
        </p>
      </div>

      <div className="relative mx-auto max-w-6xl border-accent-foreground border-t">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <div className="relative grid grid-cols-1 divide-y divide-accent-foreground border-accent-foreground border-b sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0">
          <Plus className="bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 md:flex" />
          <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
          {/* Scan */}
          <div className="flex h-auto flex-col p-6 lg:h-102">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-body font-medium text-2xl text-foreground">
                  Scan
                </h2>
                <p className="font-body font-light text-foreground-dimmed text-lg">
                  See where you stand
                </p>
              </div>
              <Image
                src="/images/shopify.svg"
                alt="Shopify"
                width={28}
                height={28}
                className="size-[28px] opacity-70"
              />
            </div>
            <div className="mt-2 flex items-end gap-3">
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
            <div className="mt-3 h-1 w-full bg-accent-foreground">
              <div className="h-full w-[72%] bg-primary" />
            </div>
            <div className="mt-4">
              {[
                "Free for top 10 products",
                "One-time AI agent simulation",
                "Basic attribute analysis",
                "No credit card. 2 minutes.",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary" />
                  <p className="font-body font-light text-foreground-dimmed">
                    {f}
                  </p>
                </div>
              ))}
            </div>
            <Button
              color="primary"
              type="button"
              className="mt-4 w-full lg:mt-auto"
              render={<Link href="/sign-up" />}
            >
              Scan your Shopify store
            </Button>
          </div>

          {/* Pay-as-you-go */}
          <div className="flex h-auto flex-col p-6 lg:h-102">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-body font-medium text-2xl text-foreground">
                {payg.name}
              </h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary text-xs uppercase tracking-tight">
                Free to start
              </span>
            </div>
            <p className="font-body font-light text-foreground-dimmed text-lg">
              {payg.tagline}
            </p>
            <h3 className="mt-2 font-body font-medium text-4xl text-primary">
              Free
              <span className="font-light text-foreground-dimmed text-xl">
                {" "}
                to start
              </span>
            </h3>
            <p className="mt-1 font-light text-foreground-dimmed text-sm">
              then 3% of AI-attributed orders · capped $500/mo
            </p>
            <div className="mt-4">
              {payg.features.map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary" />
                  <p className="font-body font-light text-foreground-dimmed">
                    {f}
                  </p>
                </div>
              ))}
            </div>
            <PricingCTA plan="payg" className="mt-4 w-full lg:mt-auto">
              {payg.cta}
            </PricingCTA>
          </div>

          {/* Compete */}
          <div className="flex h-auto flex-col p-6 lg:h-102">
            <h2 className="font-body font-medium text-2xl text-foreground">
              {compete.name}
            </h2>
            <p className="font-body font-light text-foreground-dimmed text-lg">
              {compete.tagline}
            </p>
            <h3 className="mt-2 font-body font-medium text-4xl text-primary">
              ${compete.price}
              <span className="font-light text-xl">/mo</span>
            </h3>
            <p className="mt-1 font-light text-foreground-dimmed text-sm">
              flat monthly · no performance fee
            </p>
            <div className="mt-4">
              {compete.features.map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary" />
                  <p className="font-body font-light text-foreground-dimmed">
                    {f}
                  </p>
                </div>
              ))}
            </div>
            <PricingCTA plan="compete" className="mt-4 w-full lg:mt-auto">
              {compete.cta}
            </PricingCTA>
          </div>

          <div className="relative flex h-auto flex-col bg-primary p-6 text-white lg:h-102">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-body font-medium text-2xl">
                {dominate.name}
              </h2>
              <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium text-white text-xs uppercase tracking-tight">
                Most picked
              </span>
            </div>
            <p className="font-body font-light text-lg text-white/70">
              {dominate.tagline}
            </p>
            <h3 className="mt-2 font-body font-medium text-4xl">
              ${dominate.price}
              <span className="font-light text-xl">/mo</span>
            </h3>
            <p className="mt-1 font-light text-sm text-white/60">
              flat monthly · no performance fee
            </p>
            <div className="mt-4">
              {dominate.features.map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-white/80" />
                  <p className="font-body font-light text-white/80">{f}</p>
                </div>
              ))}
            </div>
            <PricingCTA plan="dominate" className="mt-4 w-full lg:mt-auto">
              {dominate.cta}
            </PricingCTA>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-accent-foreground border-accent-foreground border-b sm:grid-cols-2 sm:divide-x md:grid-cols-4 md:divide-y-0">
          {guarantees.map((guarantee) => (
            <div key={guarantee} className="flex items-center gap-2 p-4">
              <ShieldCheckIcon className="size-4 shrink-0 text-primary" />
              <p className="font-light text-foreground-dimmed text-sm">
                {guarantee}
              </p>
            </div>
          ))}
        </div>

        <div className="grid w-full border-accent-foreground border-x bg-background-dimmed md:grid-cols-3">
          <div className="col-span-2 p-4">
            <h3 className="font-body font-medium text-2xl text-foreground">
              Enterprise
            </h3>
            <p className="font-body font-light text-foreground-dimmed text-lg">
              Custom limits, enterprise security, and dedicated support.
            </p>
          </div>
          <div className="flex items-center p-6">
            <BookCall color="accent" className="w-full">
              Book a call
            </BookCall>
          </div>
        </div>
      </div>
    </div>
  </section>
);
