import { CheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";

const competeTier = {
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

const dominateTier = {
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

export const Pricing = () => (
  <section className="relative -left-[calc(50vw-50%)] w-screen border border-accent-foreground">
    <div className="relative mx-auto max-w-6xl border-accent-foreground p-6 md:p-12">
      <h1 className="font-body text-3xl text-foreground md:text-6xl">
        Start free. <br />
        Pay when agents start picking you.
      </h1>
    </div>

    <div className="mx-auto max-w-6xl border-accent-foreground border-t">
      <div className="grid grid-cols-1 divide-y divide-accent-foreground border-accent-foreground border-b md:grid-cols-3 md:divide-x md:divide-y-0">

        {/* Scan */}
        <div className="flex h-auto flex-col p-6 md:h-102">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-body font-medium text-2xl text-foreground">Scan</h2>
              <p className="font-body font-light text-foreground-dimmed text-lg">See where you stand</p>
            </div>
            <Image src="/images/shopify.svg" alt="Shopify" width={28} height={28} className="opacity-70" />
          </div>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-bold text-7xl text-primary leading-none tracking-tight">72</span>
            <div className="mb-1">
              <p className="font-medium text-foreground-dimmed text-xs uppercase tracking-tight">/ 100</p>
              <p className="font-light text-foreground-dimmed text-xs">AI Agent Score</p>
            </div>
          </div>
          <div className="mt-3 h-1 w-full bg-accent-foreground">
            <div className="h-full w-[72%] bg-primary" />
          </div>
          <div className="mt-4">
            {["Free for top 10 products", "One-time AI agent simulation", "Basic attribute analysis", "No credit card. 2 minutes."].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <CheckIcon className="size-4 text-primary" />
                <p className="font-body font-light text-foreground-dimmed">{f}</p>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            color="accent"
            type="button"
            className="mt-4 w-full border-primary py-2.5 font-medium text-primary md:mt-auto"
            asChild
          >
            <Link href="/sign-up">Scan your Shopify store</Link>
          </Button>
        </div>

        {/* Compete */}
        <div className="flex h-auto flex-col p-6 md:h-102">
          <h2 className="font-body font-medium text-2xl text-foreground">{competeTier.name}</h2>
          <p className="font-body font-light text-foreground-dimmed text-lg">{competeTier.tagline}</p>
          <h3 className="mt-2 font-body font-medium text-4xl text-primary">
            ${competeTier.price}
            <span className="font-light text-xl">/mo</span>
          </h3>
          <div className="mt-4">
            {competeTier.features.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <CheckIcon className="size-4 text-primary" />
                <p className="font-body font-light text-foreground-dimmed">{f}</p>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            color="accent"
            type="button"
            className="mt-4 w-full border-primary py-2.5 font-medium text-primary md:mt-auto"
          >
            {competeTier.cta}
          </Button>
        </div>

        {/* Dominate */}
        <div className="flex h-auto flex-col bg-primary p-6 text-white md:h-102">
          <h2 className="font-body font-medium text-2xl">{dominateTier.name}</h2>
          <p className="font-body font-light text-white/70 text-lg">{dominateTier.tagline}</p>
          <h3 className="mt-2 font-body font-medium text-4xl">
            ${dominateTier.price}
            <span className="font-light text-xl">/mo</span>
          </h3>
          <div className="mt-4">
            {dominateTier.features.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <CheckIcon className="size-4 text-white/80" />
                <p className="font-body font-light text-white/80">{f}</p>
              </div>
            ))}
          </div>
          <Button
            variant="flat"
            color="primary"
            type="button"
            className="mt-4 w-full border border-white/30 bg-white py-2.5 font-medium text-primary md:mt-auto"
          >
            {dominateTier.cta}
          </Button>
        </div>
      </div>

      {/* Enterprise */}
      <div className="grid w-full border-accent-foreground border-x bg-background-dimmed md:grid-cols-3">
        <div className="col-span-2 p-4">
          <h3 className="font-body font-medium text-2xl text-foreground">Enterprise</h3>
          <p className="font-body font-light text-foreground-dimmed text-lg">
            Custom limits, enterprise security, and dedicated support.
          </p>
        </div>
        <div className="flex items-center p-6">
          <Button
            variant="outline"
            color="accent"
            type="button"
            className="w-full border-primary py-2.5 font-medium text-primary"
          >
            Contact Sales
          </Button>
        </div>
      </div>
    </div>
  </section>
);
