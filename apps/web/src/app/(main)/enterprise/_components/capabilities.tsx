import type { Icon } from "@zenncore/icons";
import {
  ArrowRightIcon,
  AwardIcon,
  BellIcon,
  CheckIcon,
  CircleBoltIcon,
  CodeIcon,
  ShieldCheckIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { BookCall } from "@/components/cal";
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
    icon: SquareChartIcon,
    title: "Multi-brand rollups",
    description:
      "One dashboard across every brand and region. Aggregate win-rate, agent traffic, and optimization lift in a single view.",
    features: [
      "Cross-brand win-rate rollups",
      "Regional traffic breakdowns",
      "Shared optimization workflows",
    ],
    highlighted: true,
  },
  {
    icon: CodeIcon,
    title: "API access",
    description:
      "Read-only API for programmatic access to scan results, agent traffic, and UCP profiles.",
    features: [
      "Scan + simulation exports",
      "Agent traffic endpoints",
      "UCP profile retrieval",
    ],
  },
  {
    icon: ShieldCheckIcon,
    title: "SSO",
    description:
      "Okta, Google Workspace, and Azure AD supported. Provision seats without touching ecentic directly.",
    features: ["SAML + OIDC", "Role-based access", "Automated deprovisioning"],
  },
  {
    icon: AwardIcon,
    title: "SOC 2 Type II",
    description:
      "Audit in progress. Data residency options, GDPR-compliant processing, and a DPA on request.",
    features: [
      "DPA available",
      "EU data residency options",
      "Security review support",
    ],
  },
  {
    icon: CircleBoltIcon,
    title: "UCP signing service",
    description:
      "ecentic manages cryptographic signing of your UCP profile so agents can verify merchant identity.",
    features: [
      "Managed key rotation",
      "Profile verification",
      "No bespoke infra required",
    ],
  },
  {
    icon: BellIcon,
    title: "Dedicated CSM",
    description:
      "A named customer success manager, quarterly business reviews, and direct engineering escalation.",
    features: [
      "Named CSM",
      "Quarterly business reviews",
      "Engineering escalation path",
    ],
  },
] as const;

const scoping = [
  {
    step: "01",
    title: "Short discovery call",
    description: "Catalog size, platforms, and compliance needs.",
  },
  {
    step: "02",
    title: "Custom ROI estimate",
    description: "Scoped to your SKU count and current win rates.",
  },
  {
    step: "03",
    title: "Onboarding timeline",
    description: "No procurement deck required to begin.",
  },
] as const;

export const Capabilities = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">01</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Everything in Dominate, plus the enterprise layer.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          The security, scale, and support layer enterprise teams need to run
          agent-commerce optimization across brands.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2 lg:grid-cols-3">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 lg:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 lg:flex" />
        {capabilities.map((capability) => (
          <div
            key={capability.title}
            className={cn(
              "flex flex-col p-6 md:min-h-96 md:p-8",
              capability.highlighted
                ? "bg-primary text-white"
                : "bg-background-rich text-foreground",
            )}
          >
            <capability.icon
              className={cn(
                "size-8",
                capability.highlighted ? "text-white" : "text-primary",
              )}
            />
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

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[8fr_5fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <div className="flex flex-col justify-between gap-8 bg-primary p-6 text-white md:p-10">
          <div className="flex flex-col gap-4">
            <span className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium text-sm">
              Custom · talk to sales
            </span>
            <h3 className="max-w-lg font-body font-medium text-3xl leading-tight md:text-4xl">
              Built for enterprise merchants running at scale.
            </h3>
            <p className="max-w-lg font-light text-lg text-white">
              Custom limits, enterprise security, UCP signing, multi-brand
              dashboards, and dedicated support, scoped to your catalog and
              compliance needs.
            </p>
          </div>
          <BookCall color="accent" className="w-full sm:w-fit">
            Talk to sales
            <ArrowRightIcon className="size-4" />
          </BookCall>
        </div>
        <div className="flex flex-col gap-px bg-accent-foreground">
          <p className="bg-background-dimmed px-6 pt-6 pb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em] md:px-8">
            How scoping works
          </p>
          {scoping.map((stage) => (
            <div
              key={stage.step}
              className="flex flex-1 items-start gap-4 bg-background-dimmed px-6 py-5 md:px-8"
            >
              <span className="font-normal text-primary text-xl">
                {stage.step}
              </span>
              <div className="flex flex-col gap-1">
                <h4 className="font-body font-medium text-foreground text-xl">
                  {stage.title}
                </h4>
                <p className="font-light text-foreground-dimmed">
                  {stage.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
