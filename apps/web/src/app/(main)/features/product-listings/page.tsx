import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
} from "@/lib/seo";
import Art from "@/public/images/ascii/listing.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../../_components/content";
import { Faq } from "../../pricing/_components/faq";
import { Layers } from "./_components/layers";
import { NextSteps } from "./_components/next-steps";
import { WhyListingsLose } from "./_components/why-listings-lose";
import { Workflow } from "./_components/workflow";

const assurances = [
  "Titles, descriptions & structured data",
  "Approval-ready rewrites",
  "Publishes back to Shopify & WooCommerce",
] as const;

const intro =
  "AI shopping systems compare your product data in seconds. ecentic turns losing product pages into clearer buying inputs, for agents and for the high-intent shoppers they send you.";

const description =
  "AI product listing optimization for titles, descriptions, and structured product data. See how ecentic helps merchants improve visibility with AI agents.";

const faq = [
  {
    question: "What is AI product listing optimization?",
    answer:
      "AI product listing optimization is the process of improving titles, descriptions, attributes, and supporting product context so AI shopping systems and high-intent shoppers can compare the listing more confidently.",
  },
  {
    question: "Does listing optimization only change copy?",
    answer:
      "No. Better copy helps, but product listing optimization also includes structured product data, clearer specifications, category context, trust details, and the supporting information that helps a system evaluate the offer.",
  },
  {
    question:
      "What is the difference between AI product descriptions and full listing optimization?",
    answer:
      "AI product descriptions focus on rewriting text faster. Full listing optimization improves titles, descriptions, structured attributes, and merchant trust signals together so the listing is easier for both buyers and AI shopping systems to evaluate.",
  },
  {
    question: "How does ecentic help with product listing optimization?",
    answer:
      "ecentic simulates how AI shopping agents compare products, shows why a competitor wins, and turns those findings into improved titles, descriptions, and listing updates merchants can approve and publish.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "AI Product Listing Optimization for Merchants",
  description,
  path: "/features/product-listings",
  keywords: [
    "AI product listing optimization",
    "product listing optimization",
    "AI product descriptions",
    "structured product data",
    "ecommerce product optimization",
  ],
});

export default () => {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "AI Product Listing Optimization",
      description,
      url: absoluteUrl("/features/product-listings"),
      about: [
        "AI product listing optimization",
        "AI product descriptions",
        "structured product data",
      ],
    },
    createBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Features", path: "/features" },
      { name: "Product Listings", path: "/features/product-listings" },
    ]),
    createFaqSchema(faq),
  ];

  return (
    <ContentPageLayout
      eyebrow="Product Listings"
      title="AI product listing optimization"
      accent="for pages that get picked."
      description={intro}
      assurances={assurances}
      art={{
        source: Art,
        alt: "ASCII-art illustration of a product listing card",
      }}
    >
      <JsonLd schemas={structuredData} />

      <WhyListingsLose />

      <Layers />

      <Workflow />

      <NextSteps />

      <ContentPageSection
        number="05"
        title="Frequently asked questions"
        description="Common questions from merchants researching AI product listing optimization."
        gutter
        classList={{ body: "p-0" }}
      >
        <Faq items={faq} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Start optimizing listings" }}
        secondary={{ href: "/features", label: "Back to features" }}
        note="2-minute setup · No credit card · See your free score first"
      />
    </ContentPageLayout>
  );
};
