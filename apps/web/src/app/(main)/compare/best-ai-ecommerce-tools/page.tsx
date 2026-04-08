import type { Metadata } from "next";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
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
} from "../../_components/content";

const description =
  "Best AI tools for ecommerce in 2026, organized by category so merchants can compare content, personalization, search, analytics, and agent-commerce workflows.";

const tools = [
  {
    name: "écentic",
    category: "Agent-commerce optimization",
    summary:
      "Best for merchants who need simulation, competitor diagnosis, and listing optimization tied to AI shopping selection.",
  },
  {
    name: "Hypotenuse AI",
    category: "Product content generation",
    summary:
      "Best for teams focused on producing product descriptions and marketplace content faster across large catalogs.",
  },
  {
    name: "Shopify Magic",
    category: "Platform-native drafting",
    summary:
      "Best for Shopify merchants who want native AI assistance inside their existing store workflow.",
  },
  {
    name: "Nosto",
    category: "Personalization",
    summary:
      "Best for brands prioritizing onsite personalization, segmentation, and merchandising experiences.",
  },
  {
    name: "Constructor",
    category: "Search and discovery",
    summary:
      "Best for teams that need stronger ecommerce search relevance and product discovery infrastructure.",
  },
  {
    name: "Bloomreach",
    category: "Enterprise intelligence",
    summary:
      "Best for enterprise teams combining search, merchandising, marketing, and customer data workflows.",
  },
] as const;

const internalLinks = [
  {
    href: "/features",
    eyebrow: "Features",
    title: "Review the core AI ecommerce tools workflow",
    description:
      "Use the features page if you want the product-led overview before diving into a specific platform or comparison path.",
    label: "Open features page",
    color: "primary",
    variant: "flat",
  },
  {
    href: "/features/product-listings",
    eyebrow: "Product listings",
    title: "Go deeper on AI product listing optimization",
    description:
      "This page is the best next step if better product content and clearer attributes are the main priority.",
    label: "View listing workflow",
  },
  {
    href: "/platforms/shopify",
    eyebrow: "Shopify",
    title: "See the Shopify-specific buying path",
    description:
      "Choose this page if your shortlist currently includes Shopify-native and Shopify-adjacent AI tools.",
    label: "Open Shopify page",
  },
  {
    href: "/platforms/woocommerce",
    eyebrow: "WooCommerce",
    title: "See the WooCommerce-specific buying path",
    description:
      "Use the WooCommerce page if you need a truthful supported-platform path instead of a generic comparison only.",
    label: "Open WooCommerce page",
  },
] as const;

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
    question: "Where does écentic fit in a comparison like this?",
    answer:
      "écentic fits in the agent-commerce optimization category. It is built for merchants who need to simulate AI shopping decisions, diagnose why competitors win, and improve product listings based on that competitive context.",
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
        name: "écentic",
      },
      publisher: {
        "@type": "Organization",
        name: "écentic",
        url: absoluteUrl("/"),
      },
      mainEntityOfPage: absoluteUrl("/compare/best-ai-ecommerce-tools"),
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Best AI tools for ecommerce in 2026",
      itemListElement: tools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.name,
        description: `${tool.category}. ${tool.summary}`,
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
      title="Best AI Tools for Ecommerce in 2026"
      description={description}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be rendered inline for search engines
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <ContentPageSection
        number="01"
        title="How to use this comparison guide"
        description="Comparing categories first makes the final vendor decision faster and less likely to end up on the wrong shortlist."
      >
        <ContentPageRichText
          content={`The best AI tools for ecommerce in 2026 do not all solve the same problem. That is why this page compares categories before it compares brand names. A merchant choosing between a content generator, a personalization platform, a search product, and an agent-commerce workflow can easily end up with the wrong shortlist if everything is forced into one generic feature table.

The better question is: what job are you hiring the tool to do right now?

If the biggest issue is producing product content faster, the right category looks different from the team that needs stronger onsite personalization. And both of those buyers are different from the merchant trying to improve product selection in AI-mediated shopping flows.

This guide is organized to make that distinction clearer:
- Content generation tools for product descriptions and catalog scale
- Platform-native AI for merchants staying close to their ecommerce stack
- Personalization and merchandising tools for onsite conversion
- Search and discovery infrastructure for product relevance
- Agent-commerce optimization tools for AI shopping visibility and selection`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="02"
        title="The categories most merchants compare"
        description="Each category solves a different problem. The best shortlist usually starts with one tool per category."
        classList={splitGridSectionClassList}
      >
        <div className="grid gap-px bg-accent-foreground md:grid-cols-2">
          {tools.map((tool) => (
            <article
              key={tool.name}
              className="flex flex-col gap-3 bg-background-dimmed p-6"
            >
              <p className="font-medium text-foreground text-sm uppercase tracking-[0.18em]">
                {tool.category}
              </p>
              <h3 className="text-2xl text-foreground leading-tight">
                {tool.name}
              </h3>
              <p className="text-foreground-dimmed leading-relaxed">
                {tool.summary}
              </p>
            </article>
          ))}
        </div>
      </ContentPageSection>

      <ContentPageSection
        number="03"
        title="Where merchants usually make the wrong comparison"
        description="The most useful evaluation narrows to the specific operational bottleneck first, not to the longest feature checklist."
      >
        <ContentPageRichText
          content={`A common mistake is to compare every AI ecommerce product as though it were a copy tool. That makes some evaluations look simpler, but it also hides the real buying decision.

If the team needs faster product descriptions, then a content generation tool may be enough. If the team needs better onsite conversion experiences, a personalization platform or search product may be the right category. But if the merchant wants to know why AI shopping systems keep preferring a competitor and how to improve the listing that loses, then the evaluation should move toward agent-commerce optimization instead.

That distinction matters because each category creates value in a different part of the commerce stack:
- Content generation improves production speed
- Personalization improves onsite relevance
- Search tools improve discovery and navigation
- Analytics tools improve reporting visibility
- Agent-commerce optimization improves the product selection workflow when AI systems compare competing listings

Buyers usually get better results when they shortlist one tool per category first, then narrow the decision based on the operational bottleneck that matters most this quarter.`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="04"
        title="Explore the pages behind the shortlist"
        description="Each page below goes deeper on a specific part of the decision — workflow, platform, or listing optimization."
        classList={splitGridSectionClassList}
      >
        <ContentPageCardGrid
          items={internalLinks}
          classList={splitGridClassList}
        />
      </ContentPageSection>

      <ContentPageSection
        number="05"
        title="Frequently asked questions"
        description="Common questions from merchants comparing AI ecommerce tools and platforms."
        classList={splitGridSectionClassList}
      >
        <ContentPageFaqGrid items={faq} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Start with écentic" }}
        secondary={{ href: "/", label: "Back to home" }}
      />
    </ContentPageLayout>
  );
};
