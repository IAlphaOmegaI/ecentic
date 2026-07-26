import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
} from "@/lib/seo";
import Art from "@/public/images/ascii/scale.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../../_components/content";
import { Faq } from "../../pricing/_components/faq";
import { Bottleneck } from "./_components/bottleneck";
import { Guide } from "./_components/guide";
import { RelatedPages } from "./_components/related";
import { Tools, tools } from "./_components/tools";

const assurances = [
  "Six tools across five categories",
  "Category-first, not feature checklists",
  "Updated for 2026",
] as const;

const intro =
  "Not every AI ecommerce tool solves the same problem. This guide compares categories before brand names, so your shortlist starts from the job you are hiring the tool to do.";

const description =
  "Best AI tools for ecommerce in 2026, organized by category so merchants can compare content, personalization, search, analytics, and agent-commerce workflows.";

const faq = [
  {
    question: "What are the best AI tools for ecommerce in 2026?",
    answer:
      "The best AI tools for ecommerce in 2026 depend on the job to be done. Merchants usually compare product content tools, personalization platforms, search and discovery products, analytics software, and newer agent-commerce optimization tools.",
  },
  {
    question: "How should merchants compare AI ecommerce software?",
    answer:
      "The cleanest way is to compare tools by category first. Decide whether the immediate problem is product content, onsite personalization, search relevance, analytics visibility, or AI shopping selection. Then compare vendors inside that category.",
  },
  {
    question: "Where does ecentic fit in a comparison like this?",
    answer:
      "ecentic fits in the agent-commerce optimization category. It is built for merchants who need to simulate AI shopping decisions, diagnose why competitors win, and improve product listings based on that competitive context.",
  },
  {
    question:
      "Why is a category-based guide better than a giant feature checklist?",
    answer:
      "A category-based guide is easier to trust because it avoids pretending every tool solves the same problem. It helps buyers understand why a personalization platform, a copy generator, and an agent-commerce workflow should not be evaluated with the same rubric.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "Best AI Tools for Ecommerce 2026",
  description,
  path: "/compare/best-ai-ecommerce-tools",
  keywords: [
    "best AI tools for ecommerce 2026",
    "AI ecommerce software comparison",
    "top ecommerce AI platforms",
    "Shopify Magic alternatives",
    "AI ecommerce tools",
  ],
});

export default () => {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Best AI Tools for Ecommerce in 2026",
      description,
      url: absoluteUrl("/compare/best-ai-ecommerce-tools"),
      author: {
        "@type": "Organization",
        name: "ecentic",
      },
      publisher: {
        "@type": "Organization",
        name: "ecentic",
        url: absoluteUrl("/"),
      },
      mainEntityOfPage: absoluteUrl("/compare/best-ai-ecommerce-tools"),
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Best AI tools for ecommerce in 2026",
      numberOfItems: tools.length,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      itemListElement: tools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "SoftwareApplication",
          name: tool.name,
          description: `${tool.category}. ${tool.summary}`,
          applicationCategory: "BusinessApplication",
        },
      })),
    },
    createBreadcrumbSchema([
      { name: "Home", path: "/" },
      {
        name: "Best AI Tools for Ecommerce in 2026",
        path: "/compare/best-ai-ecommerce-tools",
      },
    ]),
    createFaqSchema(faq),
  ];

  return (
    <ContentPageLayout
      eyebrow="Comparison"
      title="Best AI tools for ecommerce"
      accent="in 2026."
      description={intro}
      assurances={assurances}
      art={Art}
    >
      <JsonLd schemas={structuredData} />

      <Guide />

      <Tools />

      <Bottleneck />

      <RelatedPages />

      <ContentPageSection
        number="05"
        title="Frequently asked questions"
        description="Common questions from merchants comparing AI ecommerce tools and platforms."
        gutter
        classList={{ body: "p-0" }}
      >
        <Faq items={faq} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Start with ecentic" }}
        secondary={{ href: "/", label: "Back to home" }}
        note="2-minute setup · No credit card · See your free score first"
      />
    </ContentPageLayout>
  );
};
