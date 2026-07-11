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
import { Hero } from "./_components/hero";
import { Loop } from "./_components/loop";
import { Workflows, workflows } from "./_components/workflows";

const description =
  "AI ecommerce tools for product listing optimization, competitor analysis, and AI shopping visibility. See how ecentic helps merchants win more carts.";

const faq = [
  {
    question:
      "What makes AI ecommerce tools different from standard ecommerce software?",
    answer:
      "AI ecommerce tools need to help merchants structure product data, explain why listings lose, and improve pages that AI shopping systems compare in seconds. That is different from a generic dashboard or a copy generator that only rewrites descriptions.",
  },
  {
    question: "Does ecentic replace an ecommerce platform?",
    answer:
      "No. ecentic sits on top of an existing store stack. It connects to the catalog, runs simulations against competitors, and helps merchants publish clearer listing updates back into the platform they already use.",
  },
  {
    question: "Who should start with the features page first?",
    answer:
      "Teams evaluating AI ecommerce tools, agent-commerce workflows, or product listing optimization usually start here because it explains the full simulation, diagnosis, and optimization loop before they choose a platform-specific path.",
  },
  {
    question: "Which pages should merchants read next?",
    answer:
      "Most merchants move from the features page to the AI product listing optimization page, then into a platform page such as Shopify or WooCommerce, and finally into comparison or blog content for deeper research.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "AI Ecommerce Tools for Merchants",
  description,
  path: "/features",
  keywords: [
    "AI ecommerce tools",
    "AI ecommerce platform",
    "product listing optimization",
    "AI shopping agents",
    "agent commerce software",
  ],
});

export default () => {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "AI Ecommerce Tools for Merchants",
      description,
      url: absoluteUrl("/features"),
      isPartOf: absoluteUrl("/"),
      about: [
        "AI ecommerce tools",
        "product listing optimization",
        "AI shopping agents",
      ],
      hasPart: workflows.map((workflow) => ({
        "@type": "WebPage",
        name: workflow.title,
        url: absoluteUrl(workflow.href),
      })),
      publisher: {
        "@type": "Organization",
        name: "ecentic",
        url: absoluteUrl("/"),
      },
    },
    organizationSchema,
    createBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Features", path: "/features" },
    ]),
    createFaqSchema(faq),
  ];

  return (
    <ContentPageLayout
      eyebrow="Features"
      title="Every tool you need to win the AI shopper."
      description={description}
      hideHero
      hideHeroSpacer={false}
    >
      <JsonLd schemas={structuredData} />

      <Hero />

      <Loop />

      <Capabilities />

      <Workflows />

      <ContentPageSection
        number="04"
        title="Frequently asked questions"
        description="Common questions from merchants evaluating AI ecommerce tools."
        gutter
        classList={{ body: "p-0" }}
      >
        <Faq items={faq} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Get started" }}
        secondary={{ href: "/", label: "Back to home" }}
        note="2-minute setup · No credit card · See your free score first"
      />
    </ContentPageLayout>
  );
};
