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
import { Developer } from "./_components/developer";
import { Guides } from "./_components/guides";
import { Hero } from "./_components/hero";
import { Tools } from "./_components/tools";

const description =
  "Free ecentic resources for merchants and builders: AI Agent Score Scan, UCP Validator, UCP Playground, buyer guides, blog, and public agent API surfaces.";

const faq = [
  {
    question: "Are these tools really free?",
    answer:
      "Yes. The AI Agent Score Scan is a one-time free simulation with no credit card. The UCP Validator and UCP Playground are free to use on any storefront. Ongoing optimization after the scan follows the pricing on /pricing.",
  },
  {
    question: "Do I need an account to use the UCP tools?",
    answer:
      "No. The UCP Validator works without signing in. The UCP Playground gives anonymous visitors a limited number of free messages; create an account for unlimited sessions against your own connected store.",
  },
  {
    question:
      "What is the difference between the UCP Validator and the Playground?",
    answer:
      "The Validator checks whether a store publishes a valid /.well-known/ucp profile and whether agents can reach it. The Playground goes further: it drives a live AI shopping agent through catalog search, cart, and checkout against that store so you can see real tool calls and responses.",
  },
  {
    question: "Where should I start if I am new to agent commerce?",
    answer:
      "Start with the free Scan if you have a Shopify or WooCommerce catalog. If you are evaluating protocol readiness first, run the UCP Validator on your domain, then read How it works for the full simulate → diagnose → optimize loop.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "Resources — Free Tools and Guides",
  description,
  path: "/resources",
  keywords: [
    "free AI ecommerce tools",
    "UCP validator",
    "UCP playground",
    "AI agent score scan",
    "agent commerce resources",
    "ecentic free tools",
  ],
});

export default () => {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Resources — Free Tools and Guides",
      description,
      url: absoluteUrl("/resources"),
    },
    organizationSchema,
    createBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Resources", path: "/resources" },
    ]),
    createFaqSchema(faq),
  ];

  return (
    <ContentPageLayout
      eyebrow="Resources"
      title="Free tools and guides for agent commerce."
      description={description}
      hideHero
      hideHeroSpacer={false}
    >
      <JsonLd schemas={structuredData} />

      <Hero />

      <Tools />

      <Guides />

      <Developer />

      <ContentPageSection
        number="04"
        title="Resources FAQ"
        description="Common questions about our free tools, guides, and public endpoints."
        gutter
        classList={{ body: "p-0" }}
      >
        <Faq items={faq} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Scan your store free" }}
        secondary={{ href: "/pricing", label: "View pricing" }}
        note="No credit card required · Results in about two minutes"
      />
    </ContentPageLayout>
  );
};
