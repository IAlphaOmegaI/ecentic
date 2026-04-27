import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { createMetadata } from "@/lib/seo";
import { Motion } from "@/components/motion";

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

const pipeline = [
  {
    name: "Mastercard",
    status: "In conversation via Plug and Play",
    description:
      "Exploring agent-commerce trust infrastructure for Mastercard-connected merchants.",
  },
  {
    name: "Visa",
    status: "In conversation via Plug and Play",
    description:
      "Evaluating agent traffic analytics and UCP signing for Visa's merchant network.",
  },
  {
    name: "Inditex",
    status: "In conversation via Plug and Play",
    description:
      "Piloting multi-brand agent simulation across Zara, Pull&Bear, and Massimo Dutti.",
  },
  {
    name: "Carrefour",
    status: "In conversation via Plug and Play",
    description:
      "Assessing agent-readiness scoring and write-back optimization across SKUs.",
  },
] as const;

const capabilities = [
  {
    title: "Multi-brand rollups",
    description:
      "One dashboard across every brand and region. Aggregate win-rate, agent traffic, and optimization lift in a single view.",
  },
  {
    title: "API access",
    description:
      "Read-only API for programmatic access to scan results, agent traffic, and UCP profiles. Integrate into your own data stack.",
  },
  {
    title: "SSO",
    description:
      "Okta, Google Workspace, and Azure AD supported. Provision and deprovision seats without touching écentic directly.",
  },
  {
    title: "SOC 2 Type II",
    description:
      "Audit in progress. Data residency options, GDPR-compliant processing, and a DPA available on request.",
  },
  {
    title: "UCP signing service",
    description:
      "écentic manages cryptographic signing of your UCP profile so AI agents can verify merchant identity without bespoke infra.",
  },
  {
    title: "Dedicated CSM",
    description:
      "A named customer success manager, quarterly business reviews, and direct engineering escalation for Enterprise accounts.",
  },
] as const;

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
        <Link
          href="mailto:enterprise@ecentic.ai"
          className="inline-flex items-center justify-center bg-primary px-8 py-3.5 font-medium text-white transition-opacity hover:opacity-90"
        >
          Talk to sales
        </Link>
        <Link
          href="/sign-up"
          className="inline-flex items-center justify-center border border-accent-foreground px-8 py-3.5 font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Start free trial
        </Link>
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
        {capabilities.map((cap) => (
          <div
            key={cap.title}
            className="flex flex-col gap-2 bg-background p-6 md:p-8"
          >
            <h3 className="font-medium text-foreground text-lg">{cap.title}</h3>
            <p className="font-light text-foreground-dimmed text-base">
              {cap.description}
            </p>
          </div>
        ))}
      </div>
    </Motion.Item>

    {/* Pipeline */}
    <Motion.Item className="border-accent-foreground border-b p-4 md:px-6">
      <p className="font-medium text-primary text-xs uppercase tracking-[0.24em]">
        Pipeline — introduced via Plug and Play
      </p>
      <h2 className="mt-2 font-medium text-2xl text-foreground md:text-3xl">
        Enterprise conversations underway
      </h2>
      <p className="mt-2 max-w-2xl font-light text-foreground-dimmed text-base">
        These are active pilot conversations, not signed deals. We include them
        here so you have full context on where the enterprise motion stands.
      </p>
    </Motion.Item>
    <Motion.Item>
      <div className="grid gap-4 sm:grid-cols-2 bg-accent-foreground gap-px border-b border-accent-foreground">
        {pipeline.map((entry) => (
          <div
            key={entry.name}
            className="flex flex-col gap-2 p-4 md:p-6 bg-background"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-foreground text-xl">
                {entry.name}
              </h3>
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
      <p className="max-w-md font-light text-foreground-dimmed text-base">
        We run a short discovery call, share a custom ROI estimate for your
        catalog size, and scope an onboarding timeline. No procurement deck
        required to start.
      </p>
      <Link
        href="mailto:contact@ecentic.ai"
        className="mt-2 inline-flex items-center justify-center bg-primary px-10 py-4 font-medium text-lg text-white transition-opacity hover:opacity-90"
      >
        Contact enterprise sales
      </Link>
    </Motion.Item>

    <Footer />
  </Motion.Stagger>
);
