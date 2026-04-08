import type { Metadata } from "next";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import {
  ContentPageCardGrid,
  ContentPageFaqGrid,
  ContentPageFooter,
  ContentPageLayout,
  ContentPageRichText,
  ContentPageSection,
  splitGridClassList,
  splitGridSectionClassList,
} from "../_components/content";

const description =
  "AI ecommerce tools for product listing optimization, competitor analysis, and AI shopping visibility. See how écentic helps merchants win more carts.";

const workflows = [
  {
    href: "/features/product-listings",
    eyebrow: "Product listings",
    title: "Improve titles, descriptions, and structured product data",
    description:
      "Turn losing product pages into clearer buying inputs for AI shopping agents and high-intent shoppers.",
    label: "View listing workflow",
    color: "primary",
    variant: "flat",
  },
  {
    href: "/platforms/shopify",
    eyebrow: "Shopify",
    title: "Connect a Shopify catalog and publish approved updates",
    description:
      "Benchmark products, review why agents prefer competitors, and send approved listing changes back to Shopify.",
    label: "See Shopify page",
  },
  {
    href: "/platforms/woocommerce",
    eyebrow: "WooCommerce",
    title: "Run the same optimization loop for WooCommerce stores",
    description:
      "Import product data, compare against competitors, and manage listing improvements without rebuilding your stack.",
    label: "See WooCommerce page",
  },
  {
    href: "/compare/best-ai-ecommerce-tools",
    eyebrow: "Comparison",
    title: "Understand where agent-commerce optimization fits",
    description:
      "Use the buyer’s guide to compare content generators, personalization tools, analytics platforms, and agent-focused workflows.",
    label: "Read the guide",
  },
] as const;

const faq = [
  {
    question:
      "What makes AI ecommerce tools different from standard ecommerce software?",
    answer:
      "AI ecommerce tools need to help merchants structure product data, explain why listings lose, and improve pages that AI shopping systems compare in seconds. That is different from a generic dashboard or a copy generator that only rewrites descriptions.",
  },
  {
    question: "Does écentic replace an ecommerce platform?",
    answer:
      "No. écentic sits on top of an existing store stack. It connects to the catalog, runs simulations against competitors, and helps merchants publish clearer listing updates back into the platform they already use.",
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
        name: "écentic",
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
      title="AI Ecommerce Tools for Merchants Who Need Better Product Visibility"
      description={description}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be rendered inline for search engines
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <ContentPageSection
        number="01"
        title="Why AI ecommerce tools matter now"
        description="Understanding this shift is the starting point for merchants who want to compete on product clarity, not just price."
      >
        <ContentPageRichText
          content={`AI ecommerce tools are no longer only about writing faster copy or building one more dashboard. Merchants now need software that helps them understand how AI shopping systems compare products, why competitors are selected instead, and which listing changes are most likely to improve selection and conversion.

écentic focuses on that operational layer. Instead of treating visibility as a vague brand metric, the platform helps teams simulate AI purchase decisions, inspect the reasons behind wins and losses, and turn those findings into product listing updates the team can actually approve and publish.

That makes this category especially useful for teams managing:
- Large catalogs with uneven product data quality
- Competitive categories where missing attributes quietly hurt selection
- AI-assisted buying journeys across search, chat, and product comparison surfaces
- Merchandising teams that need clear prioritization instead of more noise`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="02"
        title="What merchants should expect from the category"
        description="A stronger AI ecommerce stack improves how listings are compared, why products win, and which changes are worth making first."
      >
        <ContentPageRichText
          content={`A strong AI ecommerce tools stack should help a merchant move through three steps with very little friction.

First, it should reveal where products are losing. That means identifying which competing products win, which attributes matter most, and how specific AI models or shopping contexts interpret the page.

Second, it should help the team diagnose the cause. Some products lose because they are missing specifications, some because the title does not carry the buying context, and others because the description does not make comparison easy.

Third, it should make the next action obvious. Merchants need an approval-ready workflow that turns insight into a better title, a stronger description, cleaner structured data, or a smarter publishing sequence.

The features below are the first content cluster we are building around that workflow:
- Product listing optimization for titles, descriptions, and supporting data
- Platform-specific workflows for Shopify and WooCommerce teams
- Competitive research pages that help buyers compare categories of tools
- Educational content that connects AI visibility to real commerce outcomes`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="03"
        title="Choose the workflow that matches your buying stage"
        description="Each path below targets a specific part of the optimization loop — listing quality, platform fit, or competitive research."
        classList={splitGridSectionClassList}
      >
        <ContentPageCardGrid items={workflows} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageSection
        number="04"
        title="How écentic fits inside the stack"
        description="If your team already has core ecommerce infrastructure, the fastest next step is usually the product listing page for your platform."
      >
        <ContentPageRichText
          content={`écentic is best understood as a decision layer for agent commerce. It does not replace Shopify, WooCommerce, or the catalog system already running the business. It connects to the store, imports products, benchmarks them against competitors, and surfaces the updates that matter most.

That positioning matters because many teams arrive on searches like "AI ecommerce tools" looking at several categories at once. They may compare copy generators, personalization products, search engines, analytics dashboards, and merchandising software in the same session. The job of this page is to show that écentic serves a narrower but increasingly important problem: helping merchants win product selection in AI-mediated buying flows.

If your team already has core ecommerce infrastructure in place, the fastest next step is usually to review the product listing optimization page and then move into the platform page that matches your store. From there, the comparison guide and blog provide the deeper research content buyers expect before they commit.`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="05"
        title="Frequently asked questions"
        description="Common questions from merchants evaluating AI ecommerce tools."
        classList={splitGridSectionClassList}
      >
        <ContentPageFaqGrid items={faq} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Get started" }}
        secondary={{ href: "/", label: "Back to home" }}
      />
    </ContentPageLayout>
  );
};
