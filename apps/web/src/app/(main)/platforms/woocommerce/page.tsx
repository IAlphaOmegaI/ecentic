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
    question: "Why include WooCommerce in the first SEO implementation wave?",
    answer:
      "WooCommerce is a supported platform in the current product docs, so publishing a truthful platform page here is stronger than shipping an aspirational page for an unsupported integration.",
  },
  {
    question: "Who should read this page next?",
    answer:
      "WooCommerce teams deciding between content generators and a broader optimization workflow should read this page, then move into the listing optimization feature page and the comparison guide.",
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
      meta={<p>Supported platform page · Commercial solution-aware intent</p>}
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
        description="This page gives the supported WooCommerce path a dedicated search target instead of burying it inside generic copy."
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
        description="The copy is grounded in the documented integration behavior already captured in the repo."
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
        title="Why this page uses WooCommerce instead of an unsupported platform"
        description="The SEO strategy workbook includes other platform ideas, but this implementation stays honest about current support."
      >
        <ContentPageRichText
          content={`A strategy workbook can be broader than the product surface you should publish today. In this codebase, WooCommerce is already part of the documented connect flow and operational notes, which makes it a credible platform page to launch early.

That matters for SEO because a useful landing page needs to answer the query truthfully. Publishing a page for an unsupported integration may create impressions, but it also creates confusion when the buyer reaches the product. A stronger approach is to build authority around supported workflows first, then expand the platform cluster as the product surface expands.

For merchants, that means this page should do three things well:
- Explain the WooCommerce workflow clearly
- Link into the product listing optimization page and supporting content
- Turn platform-specific research into a clean sign-up or demo path`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="04"
        title="Keep exploring the platform and workflow cluster"
        description="These internal links help reinforce the first set of SEO landing pages."
        classList={splitGridSectionClassList}
      >
        <ContentPageCardGrid items={related} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageSection
        number="05"
        title="Frequently asked questions"
        description="FAQ content reinforces the page topic and supports structured data coverage."
        classList={splitGridSectionClassList}
      >
        <ContentPageFaqGrid items={faq} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Connect your WooCommerce store" }}
        secondary={{ href: "/features", label: "Back to features" }}
        note="Published as part of the supported-platform SEO cluster."
      />
    </ContentPageLayout>
  );
};
