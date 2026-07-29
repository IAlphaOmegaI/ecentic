import type { Icon } from "@zenncore/icons";
import {
  BarChartIcon,
  BullseyeIcon,
  CheckBadgeIcon,
  CheckIcon,
  CircleBoltIcon,
  RadarIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Plus } from "@/components/plus";

type Capability = {
  icon: Icon;
  title: string;
  description: string;
  features: readonly string[];
  highlighted?: boolean;
};

const capabilities: readonly Capability[] = [
  {
    icon: BarChartIcon,
    title: "AI win-rate score",
    description:
      "See how often ChatGPT, Claude, Gemini, and Perplexity pick your products when a shopper asks what to buy.",
    features: [
      "Per-agent win rates",
      "Product-level scoring",
      "Score history over time",
    ],
    highlighted: true,
  },
  {
    icon: BullseyeIcon,
    title: "Competitor gap analysis",
    description:
      "Find out who agents recommend instead of you, and exactly what their listing has that yours doesn't.",
    features: [
      "Side-by-side comparisons",
      "Missing-attribute detection",
      "Category benchmarks",
    ],
  },
  {
    icon: CircleBoltIcon,
    title: "One-click listing rewrites",
    description:
      "Approval-ready rewrites of titles, descriptions, and structured product data, published straight back to your store.",
    features: [
      "Approval-ready drafts",
      "Shopify + WooCommerce write-back",
      "Before / after lift tracking",
    ],
  },
  {
    icon: TrendUpIcon,
    title: "Agent traffic analytics",
    description:
      "Know when an AI agent visits your store, which products it reads, and what revenue those visits turn into.",
    features: [
      "AI-agent visit detection",
      "Daily traffic rollups",
      "Referral attribution",
    ],
  },
  {
    icon: CheckBadgeIcon,
    title: "UCP profile",
    description:
      "A machine-readable merchant profile built on the Universal Commerce Protocol, so agents can trust and verify your store.",
    features: [
      "Auto-generated profile",
      "Structured product data",
      "Agent-verifiable identity",
    ],
  },
  {
    icon: RadarIcon,
    title: "Continuous rescans",
    description:
      "Scores go stale the moment a competitor updates a listing. Scheduled rescans keep every product benchmarked.",
    features: [
      "Scheduled catalog scans",
      "Win-rate change alerts",
      "Regression detection",
    ],
  },
] as const;

export const Capabilities = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">02</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Everything you need to get picked.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Not another dashboard or copy generator. ecentic is a decision layer
          that sits on top of your store and turns agent insight into published
          listing updates.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2 lg:grid-cols-3">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 lg:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 lg:flex" />
        {capabilities.map((capability) => (
          <div
            key={capability.title}
            className={cn(
              "relative flex flex-col p-6 md:min-h-96 md:p-8",
              capability.highlighted
                ? "bg-primary text-white"
                : "bg-background-rich text-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-9 items-center justify-center border",
                capability.highlighted
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-accent-foreground bg-background text-primary",
              )}
            >
              <capability.icon className="size-5" />
            </span>
            <h3 className="mt-4 font-body font-medium text-2xl">
              {capability.title}
            </h3>
            <p
              className={cn(
                "mt-2 font-body font-light text-lg",
                // Solid white is the ceiling on the primary field (4.36:1);
                // /70 measured 2.90:1. Icons below can stay tinted — they
                // answer to the 3:1 non-text bar, which /80 clears at 3.34.
                capability.highlighted
                  ? "text-white"
                  : "text-foreground-dimmed",
              )}
            >
              {capability.description}
            </p>
            <div
              className={cn(
                "mt-6 flex flex-col gap-2.5 border-t pt-6 md:mt-auto",
                capability.highlighted
                  ? "border-white/20"
                  : "border-accent-foreground",
              )}
            >
              {capability.features.map((feature) => (
                <div key={feature} className="flex items-start gap-2">
                  <CheckIcon
                    className={cn(
                      "mt-1 size-4 shrink-0",
                      capability.highlighted ? "text-white/80" : "text-primary",
                    )}
                  />
                  <p
                    className={cn(
                      "font-body font-light",
                      capability.highlighted
                        ? "text-white"
                        : "text-foreground-dimmed",
                    )}
                  >
                    {feature}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
