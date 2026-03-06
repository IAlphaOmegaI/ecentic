import { CheckIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";

const tiers = [
  {
    name: "Scan",
    tagline: "See where you stand",
    price: "Free",
    label: null,
    features: [
      "Free for top 10 products",
      "One-time simulation across 3 models",
      "Basic attribute analysis",
    ],
    cta: "Start Free Scan",
    highlighted: false,
  },
  {
    name: "Compete",
    tagline: "Know your enemy",
    price: 149,
    label: "/mo",
    features: [
      "Up to 100 products",
      "Daily simulations",
      "Competitor battlecards",
      "Manual optimization suggestions",
    ],
    cta: "Start Competing",
    highlighted: false,
  },
  {
    name: "Dominate",
    tagline: "Win on autopilot.",
    price: 449,
    label: "/mo",
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

export const Pricing = () => (
  <section className="relative -left-[calc(50vw-50%)] w-screen border border-accent-foreground">
    <div className="broder relative mx-auto max-w-6xl border-accent-foreground p-6 md:p-12">
      <h1 className="font-body font-medium text-3xl md:text-5xl">
        Start free. <br />
        Pay when agents start picking you.
      </h1>
    </div>
    <div className="mx-auto max-w-6xl border-accent-foreground border-t">
      <div className="z-100 grid grid-cols-1 divide-y divide-accent-foreground border-accent-foreground border-b md:grid-cols-3 md:divide-x md:divide-y-0">
        {tiers.map((tier, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: no better key to use
          <div className="flex h-auto flex-col p-4 md:h-102" key={index}>
            <h2 className="font-body font-medium text-2xl text-foreground">
              {tier.name}
            </h2>
            <p className="-mt-1 font-body font-light text-foreground-dimmed text-lg">
              {tier.tagline}
            </p>
            <h2 className="mt-2 font-body font-medium text-4xl text-primary">
              {tier.price}
              {tier.label && "$"}
              {tier.label && (
                <span className="font-light text-xl">{tier.label}</span>
              )}
            </h2>

            <div className="mt-4">
              {tier.features.map((feature, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: no better key to use
                <div key={index} className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-primary" />
                  <p className="font-body font-light text-foreground-dimmed text-lg">
                    {feature}
                  </p>
                </div>
              ))}
            </div>
            <Button
              variant={tier.highlighted ? "flat" : "outline"}
              color={tier.highlighted ? "primary" : "neutral"}
              type="button"
              className="mt-auto w-full py-2 font-medium text-lg"
            >
              {tier.cta}
            </Button>
          </div>
        ))}
      </div>
      <div className="flex w-full flex-col gap-4 bg-background-dimmed/20 p-4 md:flex-row md:items-center md:justify-between md:gap-0">
        <div>
          <h3 className="font-body font-medium text-2xl text-foreground">
            Enterprise
          </h3>
          <p className="font-body font-light text-foreground-dimmed text-lg">
            For teams that need custom limits, enterprise security, and
            dedicated support.
          </p>
        </div>
        <div className="w-full md:w-1/3 md:pl-[20px]">
          <Button
            variant="flat"
            color="neutral"
            type="button"
            className="w-full py-2 font-medium text-lg"
          >
            Contact Sales
          </Button>
        </div>
      </div>
    </div>
  </section>
);
