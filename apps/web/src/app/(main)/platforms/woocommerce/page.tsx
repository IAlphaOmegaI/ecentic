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
  "AI for WooCommerce stores that need product listing optimization, competitor analysis, and a clearer path from insights to updates.";

const related = [
  {
    href: "/features/product-listings",
    eyebrow: "Workflow",
    title: "Start with AI product listing optimization",
    description:
      "Review the listing workflow first if your team wants the category-level explanation before jumping into WooCommerce specifics.",
    label: "View listing workflow",
    color: "primary",
    variant: "flat",
  },
  {
    href: "/platforms/shopify",
    eyebrow: "Shopify",
    title: "Compare the Shopify path with the WooCommerce path",
    description:
      "Use the Shopify page if your team is evaluating platform fit or planning a multi-platform rollout.",
    label: "Open Shopify page",
  },
  {
    href: "/compare/best-ai-ecommerce-tools",
    eyebrow: "Comparison",
    title: "See how AI ecommerce categories fit different teams",
    description:
      "The guide helps buyers separate content generation, analytics, personalization, and agent-commerce optimization tools.",
    label: "Read comparison guide",
  },
  {
    href: "/blog",
    eyebrow: "Blog",
    title: "Use the blog for the operational SEO and data layer",
    description:
      "Read the guides on structured data, AI shopping traffic, and catalog clarity to support the WooCommerce workflow.",
    label: "Visit the blog",
  },
] as const;

const faq = [
  {
    question: "What does AI for WooCommerce stores mean?",
    answer:
      "For WooCommerce merchants, it means connecting the product catalog, understanding where listings lose to competitors, and improving product pages with a workflow that stays tied to the live store.",
  },
  {
    question: "Can WooCommerce stores publish optimized product updates?",
    answer:
      "Yes. The repository notes already document WooCommerce product update behavior and the requirements around REST credentials with read and write access, which supports an approve-and-publish style workflow.",
  },
  {
    question: "How does écentic compare to other WooCommerce product plugins?",
    answer:
      "Most WooCommerce product plugins help with catalog management or basic copy. écentic focuses specifically on understanding why products lose to competitors and turning that analysis into listing improvements that can be published back into the store.",
  },
  {
    question:
      "What is the right next step after reviewing the WooCommerce page?",
    answer:
      "Most merchants move from this page into the AI product listing optimization workflow, then into the comparison guide if they are still evaluating categories. From there, the blog provides the operational depth for teams ready to act.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "AI for WooCommerce",
  description,
  path: "/platforms/woocommerce",
  keywords: [
    "AI for WooCommerce",
    "WooCommerce AI optimization",
    "WooCommerce product listing optimization",
    "AI ecommerce tools for WooCommerce",
    "product listing optimization WooCommerce",
  ],
});

export default () => {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "AI for WooCommerce",
      description,
      url: absoluteUrl("/platforms/woocommerce"),
      about: [
        "AI for WooCommerce",
        "WooCommerce product listing optimization",
        "WooCommerce competitor analysis",
      ],
    },
    createBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "AI for WooCommerce", path: "/platforms/woocommerce" },
    ]),
    createFaqSchema(faq),
  ];

  return (
    <ContentPageLayout
      eyebrow="WooCommerce"
      title="AI for WooCommerce Stores That Need Cleaner Product Workflows"
      description={description}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be rendered inline for search engines
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <ContentPageSection
        number="01"
        title="Why WooCommerce merchants need a focused AI workflow"
        description="WooCommerce operators usually need catalog-level insight, not just faster copy output."
      >
        <ContentPageRichText
          content={`AI for WooCommerce stores is not only about faster content creation. WooCommerce teams often need better product clarity across a catalog that changes quickly, is managed by lean operators, and depends on clean product data to compete well.

That creates a practical need for a dedicated optimization loop. Merchants want to know which products are easiest to improve, which competitor keeps winning, and which listing details matter most before they spend time rewriting dozens of pages.

This page is built for that platform-specific search intent:
- WooCommerce operators researching AI workflows for product pages
- Teams that want to improve product visibility without changing ecommerce platforms
- Merchants who need competitor insight tied directly to listing updates
- Buyers evaluating whether a workflow can move from diagnosis to publishing`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="02"
        title="How the WooCommerce workflow maps to the current product"
        description="The workflow connects product data to competitor analysis and then to a publishing path back inside WooCommerce."
      >
        <ContentPageRichText
          content={`The WooCommerce path starts with connecting the store and importing the catalog. From there, merchants can select products, benchmark them against competitors, and review where AI shopping systems interpret another listing as the stronger option.

That analysis is useful because it does not stop at a generic score. It turns competitor comparisons into a clearer view of the product changes that matter, including title quality, description clarity, and missing or weak product details.

Once the team approves an optimization, the workflow can move back into WooCommerce through the documented REST update path. That keeps the insight layer tied to the store instead of creating another manual content handoff.

For WooCommerce merchants, the biggest advantages usually show up when:
- Product data is spread across a large catalog with uneven consistency
- The team needs a faster path from diagnosis to publishing
- Competitors are winning through clearer specifications and offer context
- Operators want a system they can repeat every week rather than a one-time rewrite project`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="03"
        title="What WooCommerce merchants should evaluate before choosing a tool"
        description="The right optimization tool depends on where the catalog bottleneck actually sits."
      >
        <ContentPageRichText
          content={`WooCommerce merchants evaluating AI tools for product listings usually face one of three situations.

The first is a content production problem. The catalog is growing faster than the team can write or review product copy. In this case, a content generation tool can help, though it does not address the underlying question of which content changes actually improve product selection.

The second is a competitive clarity problem. The team is not sure which products are losing to competitors or why. Adding more copy does not fix this. What helps is the ability to simulate how products compare, inspect the results, and surface the specific attributes that are making the difference.

The third is a publishing friction problem. Good insights exist but they are slow to turn into live improvements because the review and publishing loop is disconnected from the store. For WooCommerce teams, a workflow that connects analysis to an approve-and-publish path inside the same store reduces the handoff cost significantly.

Most merchants find that écentic addresses the second and third situations directly, which is where generic content tools tend to stop short.`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="04"
        title="Keep exploring the platform and workflow cluster"
        description="Continue into listing optimization, platform comparison, or blog content from here."
        classList={splitGridSectionClassList}
      >
        <ContentPageCardGrid items={related} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageSection
        number="05"
        title="Frequently asked questions"
        description="Common questions from WooCommerce merchants evaluating AI optimization workflows."
        classList={splitGridSectionClassList}
      >
        <ContentPageFaqGrid items={faq} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Connect your WooCommerce store" }}
        secondary={{ href: "/features", label: "Back to features" }}
      />
    </ContentPageLayout>
  );
};
