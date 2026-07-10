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
import Image from "next/image";
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

const logos = [
  { name: "Mastercard", src: "/partners/enterprise/mastercard.png" },
  { name: "Visa", src: "/partners/enterprise/visa.png" },
  { name: "Inditex", src: "/partners/enterprise/inditex.svg" },
  { name: "Carrefour", src: "/partners/enterprise/carrefour.svg" },
] as const;

export const Capabilities = () => (
  <section>
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
                Custom · talk to sales
              </span>
              <h2 className="max-w-lg font-body font-medium text-3xl leading-tight md:text-4xl">
                Built for enterprise merchants running at scale.
              </h2>
              <p className="max-w-lg font-light text-lg text-white/75">
                Custom limits, enterprise security, UCP signing, multi-brand
                dashboards, and dedicated support — scoped to your catalog and
                compliance needs.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <BookCall color="accent" className="w-full sm:w-auto">
                Talk to sales
                <ArrowRightIcon className="size-4" />
              </BookCall>
              <p className="text-sm text-white/60">
                Short discovery call · custom ROI estimate · no procurement deck
                required
              </p>
            </div>
          </div>
          <div className="relative flex h-full min-h-full flex-col justify-between overflow-hidden bg-background-rich p-6 md:p-10">
            <div>
              <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em]">
                Pipeline · Plug and Play
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Image
                  src="/partners/enterprise/plug-and-play.svg"
                  alt="Plug and Play"
                  width={120}
                  height={28}
                  className="h-7 w-auto"
                />
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {logos.map((logo) => (
                <div
                  key={logo.name}
                  className="flex h-16 items-center justify-center rounded-lg border border-accent-foreground bg-background px-4"
                >
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    width={120}
                    height={40}
                    className="max-h-8 w-auto object-contain"
                  />
                </div>
              ))}
            </div>
            <p className="mt-6 font-light text-foreground-dimmed text-sm">
              Active pilot conversations via Plug and Play Tirana — not signed
              deals. Full transparency on where the enterprise motion stands.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-12">
        <h2 className="font-body font-medium text-3xl text-foreground md:text-5xl">
          What's included.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-lg">
          Everything in Dominate, plus the security, scale, and support layer
          enterprise teams need to run agent-commerce optimization across
          brands.
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
                capability.highlighted
                  ? "text-white/70"
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
                        ? "text-white/80"
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
