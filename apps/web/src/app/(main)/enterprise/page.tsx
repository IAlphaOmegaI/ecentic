import type { Icon } from "@zenncore/icons";
import {
  AwardIcon,
  BellIcon,
  CircleBoltIcon,
  CodeIcon,
  ShieldCheckIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import Link from "next/link";
import { BookCall } from "@/components/cal";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Plus } from "@/components/plus";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Enterprise — ecentic",
  description:
    "Agent-commerce intelligence for enterprise merchants. Multi-brand dashboards, API access, SSO, SOC 2 compliance, and a dedicated CSM. In conversation with Mastercard, Visa, Inditex, and Carrefour via Plug and Play.",
  path: "/enterprise",
  keywords: [
    "enterprise ecommerce AI",
    "AI agent commerce enterprise",
    "multi-brand product optimization",
    "agent traffic analytics enterprise",
  ],
});

type PipelineEntry = {
  name: string;
  monogram: string;
  status: string;
  description: string;
};

const pipeline: readonly PipelineEntry[] = [
  {
    name: "Mastercard",
    monogram: "MC",
    status: "In conversation",
    description:
      "Exploring agent-commerce trust infrastructure for Mastercard-connected merchants.",
  },
  {
    name: "Visa",
    monogram: "V",
    status: "In conversation",
    description:
      "Evaluating agent traffic analytics and UCP signing for Visa's merchant network.",
  },
  {
    name: "Inditex",
    monogram: "ID",
    status: "In conversation",
    description:
      "Piloting multi-brand agent simulation across Zara, Pull&Bear, and Massimo Dutti.",
  },
  {
    name: "Carrefour",
    monogram: "C",
    status: "In conversation",
    description:
      "Assessing agent-readiness scoring and write-back optimization across SKUs.",
  },
] as const;

type Capability = {
  icon: Icon;
  title: string;
  description: string;
};

const capabilities: readonly Capability[] = [
  {
    icon: SquareChartIcon,
    title: "Multi-brand rollups",
    description:
      "One dashboard across every brand and region. Aggregate win-rate, agent traffic, and optimization lift in a single view.",
  },
  {
    icon: CodeIcon,
    title: "API access",
    description:
      "Read-only API for programmatic access to scan results, agent traffic, and UCP profiles. Integrate into your own data stack.",
  },
  {
    icon: ShieldCheckIcon,
    title: "SSO",
    description:
      "Okta, Google Workspace, and Azure AD supported. Provision and deprovision seats without touching ecentic directly.",
  },
  {
    icon: AwardIcon,
    title: "SOC 2 Type II",
    description:
      "Audit in progress. Data residency options, GDPR-compliant processing, and a DPA available on request.",
  },
  {
    icon: CircleBoltIcon,
    title: "UCP signing service",
    description:
      "ecentic manages cryptographic signing of your UCP profile so AI agents can verify merchant identity without bespoke infra.",
  },
  {
    icon: BellIcon,
    title: "Dedicated CSM",
    description:
      "A named customer success manager, quarterly business reviews, and direct engineering escalation for Enterprise accounts.",
  },
] as const;

export default () => (
  <main className="relative flex min-h-screen flex-col">
    <div className="relative -left-[calc(50vw-50%)] w-screen">
      <div className="mx-auto max-w-6xl border-accent-foreground border-x">
        <Navbar />
      </div>
    </div>

    {/* Hero */}
    <section className="relative -left-[calc(50vw-50%)] w-screen border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x px-8 py-16 md:py-24">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <p className="font-medium text-primary text-sm uppercase tracking-[0.2em]">
          Enterprise
        </p>
        <h1 className="mt-4 max-w-3xl font-body text-5xl text-foreground leading-tight md:text-7xl">
          Agent-commerce infrastructure for merchants at scale.
        </h1>
        <p className="mt-5 max-w-2xl font-light text-foreground-dimmed text-xl leading-relaxed">
          Multi-brand dashboards, API access, UCP signing, and dedicated support
          — built for the commerce teams running hundreds of SKUs across
          multiple platforms.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <BookCall color="primary" className="px-8 py-3.5 font-medium">
            Talk to sales
          </BookCall>
          <Button
            color="accent"
            className="px-8 py-3.5 font-medium"
            render={<Link href="/sign-up" />}
          >
            Start free trial
          </Button>
        </div>
      </div>
    </section>

    {/* Capabilities */}
    <section className="relative -left-[calc(50vw-50%)] w-screen border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="px-8 py-10 md:py-12">
          <p className="font-medium text-primary text-sm uppercase tracking-[0.2em]">
            What's included
          </p>
          <h2 className="mt-3 font-body text-3xl text-foreground md:text-5xl">
            Built for enterprise scale.
          </h2>
        </div>
        <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2 lg:grid-cols-3">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 lg:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 lg:flex" />
          <Plus className="bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 lg:flex" />
          <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 lg:flex" />
          {capabilities.map((capability, index) => (
            <div
              key={capability.title}
              className="relative flex flex-col gap-4 bg-background p-6 md:p-8"
            >
              {(index === 0 || index === 1) && (
                <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 lg:flex" />
              )}
              {(index === 3 || index === 4) && (
                <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 lg:flex" />
              )}
              <span className="flex size-9 items-center justify-center border border-accent-foreground bg-background text-primary">
                <capability.icon className="size-5" />
              </span>
              <h3 className="font-medium text-foreground text-lg">
                {capability.title}
              </h3>
              <p className="font-light text-foreground-dimmed">
                {capability.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Pipeline */}
    <section className="relative -left-[calc(50vw-50%)] w-screen border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <div className="px-8 py-10 md:py-12">
          <p className="font-medium text-primary text-sm uppercase tracking-[0.2em]">
            Pipeline · Introduced via Plug and Play
          </p>
          <h2 className="mt-3 font-body text-3xl text-foreground md:text-5xl">
            Enterprise conversations underway.
          </h2>
          <p className="mt-3 max-w-2xl font-light text-foreground-dimmed">
            Active pilot conversations, not signed deals. Full transparency on
            where the enterprise motion stands.
          </p>
        </div>
        <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 sm:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 sm:flex" />
          <Plus className="bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 sm:flex" />
          <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 sm:flex" />
          {pipeline.map((entry, index) => (
            <div
              key={entry.name}
              className="relative flex flex-col gap-3 bg-background p-6 md:p-8"
            >
              {index === 0 && (
                <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 sm:flex" />
              )}
              {index === 2 && (
                <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 sm:flex" />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center border border-accent-foreground bg-background-dimmed font-medium text-foreground text-sm tracking-tight">
                    {entry.monogram}
                  </span>
                  <h3 className="font-medium text-foreground text-xl">
                    {entry.name}
                  </h3>
                </div>
                <span className="shrink-0 border border-primary/30 px-2.5 py-0.5 text-primary text-sm">
                  {entry.status}
                </span>
              </div>
              <p className="font-light text-foreground-dimmed text-sm">
                {entry.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="relative -left-[calc(50vw-50%)] w-screen border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x px-8 py-16 text-center md:py-24">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <h2 className="mx-auto max-w-xl font-body text-4xl text-foreground md:text-5xl">
          Ready to talk?
        </h2>
        <p className="mx-auto mt-4 max-w-md font-light text-foreground-dimmed text-lg">
          We run a short discovery call, share a custom ROI estimate for your
          catalog size, and scope an onboarding timeline. No procurement deck
          required to start.
        </p>
        <BookCall
          color="primary"
          className="mx-auto mt-8 px-10 py-4 font-medium text-lg"
        >
          Contact enterprise sales
        </BookCall>
      </div>
    </section>

    <Footer stacked />
  </main>
);
