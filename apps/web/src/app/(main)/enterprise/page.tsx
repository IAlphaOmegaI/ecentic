import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../_components/content";
import { Faq } from "../pricing/_components/faq";
import { Capabilities } from "./_components/capabilities";
import { Compare } from "./_components/compare";
import { Hero } from "./_components/hero";
import { Pipeline } from "./_components/pipeline";

const description =
  "Agent-commerce intelligence for enterprise merchants. Multi-brand dashboards, API access, SSO, SOC 2 compliance, UCP signing, and a dedicated CSM.";

const faq = [
  {
    question: "When should I choose Enterprise over Dominate?",
    answer:
      "Choose Enterprise when you run hundreds of SKUs across multiple brands or regions, need SSO or a DPA, want UCP signing managed for you, or need a dedicated CSM and custom API access. Dominate covers the full optimization loop for a single brand up to 1000 products.",
  },
  {
    question: "Are the pipeline conversations signed deals?",
    answer:
      "No. The conversations with Mastercard, Visa, Inditex, and Carrefour listed on this page are active pilot discussions introduced via Plug and Play Tirana — not signed commercial agreements. We list them for transparency on where the enterprise motion stands.",
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
      title="Agent-commerce infrastructure at scale."
      description={description}
      hideHero
      hideHeroSpacer={false}
    >
      <JsonLd schemas={structuredData} />

      <Hero />

      <Capabilities />

      <Pipeline />

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
        note="Active pilot conversations — not signed deals."
      />
    </ContentPageLayout>
  );
};
