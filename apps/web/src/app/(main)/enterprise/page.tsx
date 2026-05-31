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
import { Motion } from "@/components/motion";
import { Navbar } from "@/components/navbar";
import { createMetadata } from "@/lib/seo";

export const metadata: Metadata = createMetadata({
  title: "Enterprise — écentic",
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
    status: "In conversation via Plug and Play",
    description:
      "Exploring agent-commerce trust infrastructure for Mastercard-connected merchants.",
  },
  {
    name: "Visa",
    monogram: "V",
    status: "In conversation via Plug and Play",
    description:
      "Evaluating agent traffic analytics and UCP signing for Visa's merchant network.",
  },
  {
    name: "Inditex",
    monogram: "ID",
    status: "In conversation via Plug and Play",
    description:
      "Piloting multi-brand agent simulation across Zara, Pull&Bear, and Massimo Dutti.",
  },
  {
    name: "Carrefour",
    monogram: "C",
    status: "In conversation via Plug and Play",
    description:
      "Assessing agent-readiness scoring and write-back optimization across SKUs.",
  },
];

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
      "Okta, Google Workspace, and Azure AD supported. Provision and deprovision seats without touching écentic directly.",
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
      "écentic manages cryptographic signing of your UCP profile so AI agents can verify merchant identity without bespoke infra.",
  },
  {
    icon: BellIcon,
    title: "Dedicated CSM",
    description:
      "A named customer success manager, quarterly business reviews, and direct engineering escalation for Enterprise accounts.",
  },
];

export default () => (
  <Motion.Stagger
    stagger={0.08}
    delay={0.1}
    className="mx-auto flex min-h-screen max-w-6xl flex-col border-accent-foreground border-x"
  >
    <Navbar />

    {/* Hero */}
    <Motion.Item className="border-accent-foreground border-b px-6 py-14 md:px-12 md:py-20">
      <p className="font-medium text-primary text-xs uppercase tracking-[0.24em]">
        Enterprise
      </p>
      <h1 className="mt-4 max-w-3xl font-medium text-4xl text-foreground leading-tight sm:text-5xl md:text-6xl">
        Agent-commerce infrastructure for merchants at scale.
      </h1>
      <p className="mt-5 max-w-2xl font-light text-foreground-dimmed text-lg md:text-2xl">
        Multi-brand dashboards, API access, UCP signing, and dedicated support —
        built for the commerce teams running hundreds of SKUs across multiple
        platforms.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <BookCall
          variant="flat"
          color="primary"
          className="px-8 py-3.5 font-medium"
        >
          Talk to sales
        </BookCall>
        <Button
          variant="outline"
          color="accent"
          className="px-8 py-3.5 font-medium hover:border-primary hover:text-primary"
          render={<Link href="/sign-up" />}
        >
          Start free trial
        </Button>
      </div>
    </Motion.Item>

    {/* Capabilities grid */}
    <Motion.Item className="border-accent-foreground border-b">
      <div className="px-6 py-10 md:px-12">
        <h2 className="font-medium text-2xl text-foreground md:text-3xl">
          What Enterprise includes
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2 lg:grid-cols-3">
        {capabilities.map((capability) => (
          <div
            key={capability.title}
            className="flex flex-col gap-3 bg-background p-6 md:p-8"
          >
            <span className="flex size-10 items-center justify-center border border-accent-foreground bg-background text-primary">
              <capability.icon className="size-5" />
            </span>
            <h3 className="font-medium text-foreground text-lg">
              {capability.title}
            </h3>
            <p className="font-light text-base text-foreground-dimmed">
              {capability.description}
            </p>
          </div>
        ))}
      </div>
    </Motion.Item>

    {/* Pipeline */}
    <Motion.Item className="border-accent-foreground border-b px-6 py-10 md:px-12">
      <p className="font-medium text-primary text-xs uppercase tracking-[0.24em]">
        Pipeline — introduced via Plug and Play
      </p>
      <h2 className="mt-2 font-medium text-2xl text-foreground md:text-3xl">
        Enterprise conversations underway
      </h2>
      <p className="mt-2 max-w-2xl font-light text-base text-foreground-dimmed">
        These are active pilot conversations, not signed deals. We include them
        here so you have full context on where the enterprise motion stands.
      </p>
    </Motion.Item>
    <Motion.Item>
      <div className="grid gap-px border-accent-foreground border-b bg-accent-foreground sm:grid-cols-2">
        {pipeline.map((entry) => (
          <div
            key={entry.name}
            className="flex flex-col gap-3 bg-background p-6 md:p-8"
          >
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
    </Motion.Item>

    {/* CTA */}
    <Motion.Item className="flex flex-col items-center gap-5 px-6 py-16 text-center md:px-12 md:py-20">
      <h2 className="max-w-xl font-medium text-3xl text-foreground md:text-4xl">
        Ready to talk?
      </h2>
      <p className="max-w-md font-light text-base text-foreground-dimmed">
        We run a short discovery call, share a custom ROI estimate for your
        catalog size, and scope an onboarding timeline. No procurement deck
        required to start.
      </p>
      <BookCall
        variant="flat"
        color="primary"
        className="mt-2 px-10 py-4 font-medium text-lg"
      >
        Contact enterprise sales
      </BookCall>
    </Motion.Item>

    <Footer />
  </Motion.Stagger>
);
