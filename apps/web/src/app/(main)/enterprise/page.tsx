import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import Link from "next/link";
import { BookCall } from "@/components/cal";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/tower.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../_components/content";
import { bannerAction } from "../_components/page-banner";
import { Faq } from "../pricing/_components/faq";
import { Capabilities } from "./_components/capabilities";
import { Compare } from "./_components/compare";

const assurances = [
  "Multi-brand dashboards",
  "Custom API access",
  "Dedicated CSM",
  "SOC 2 in progress",
] as const;

const description =
  "Agent-commerce intelligence for enterprise merchants: multi-brand dashboards, API access, SSO, SOC 2 compliance, UCP signing, and a dedicated CSM team.";

const faq = [
  {
    question: "When should I choose Enterprise over Dominate?",
    answer:
      "Choose Enterprise when you run hundreds of SKUs across multiple brands or regions, need SSO or a DPA, want UCP signing managed for you, or need a dedicated CSM and custom API access. Dominate covers the full optimization loop for a single brand up to 1000 products.",
  },
  {
    question: "What does onboarding look like for Enterprise?",
    answer:
      "We start with a short discovery call, share a custom ROI estimate for your catalog size, and scope an onboarding timeline. No procurement deck is required to begin the conversation.",
  },
  {
    question: "Is SOC 2 available today?",
    answer:
      "SOC 2 Type II is in progress. Enterprise accounts can request our DPA, discuss data residency options, and review our security posture during the sales process.",
  },
  {
    question: "Can Enterprise connect to our existing data stack?",
    answer:
      "Yes. Enterprise includes read-only API access for scan results, agent traffic, and UCP profiles so you can integrate ecentic data into your own analytics and reporting tools.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "Enterprise — Agent-Commerce at Scale",
  description,
  path: "/enterprise",
  keywords: [
    "enterprise ecommerce AI",
    "AI agent commerce enterprise",
    "multi-brand product optimization",
    "agent traffic analytics enterprise",
  ],
});

export default () => {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Enterprise — Agent-Commerce at Scale",
      description,
      url: absoluteUrl("/enterprise"),
    },
    organizationSchema,
    createBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Enterprise", path: "/enterprise" },
    ]),
    createFaqSchema(faq),
  ];

  return (
    <ContentPageLayout
      eyebrow="Enterprise"
      title="Agent-commerce infrastructure"
      accent="at scale."
      description="Multi-brand dashboards, API access, UCP signing, and dedicated support for commerce teams running hundreds of SKUs across multiple platforms."
      assurances={assurances}
      art={{ source: Art, alt: "ASCII-art illustration of an office tower" }}
      actions={
        <>
          <BookCall color="accent" className={bannerAction.lead}>
            Talk to sales
            <ArrowRightIcon className="size-4" />
          </BookCall>
          <Button
            variant="outline"
            className={bannerAction.secondary}
            render={<Link href="/pricing" />}
          >
            View pricing
          </Button>
        </>
      }
    >
      <JsonLd schemas={structuredData} />

      <Capabilities />

      <Compare />

      <ContentPageSection
        number="03"
        title="Enterprise FAQ"
        description="Common questions about Enterprise plans, security, and onboarding."
        gutter
        classList={{ body: "p-0" }}
      >
        <Faq items={faq} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/demo", label: "Book a demo" }}
        secondary={{ href: "/pricing", label: "View pricing" }}
        note="SOC 2 in progress · DPA on request"
      />
    </ContentPageLayout>
  );
};
