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
  "AI for Shopify stores that need stronger product listings, clearer competitor analysis, and approved updates pushed back into Shopify.";

const related = [
  {
    href: "/features/product-listings",
    eyebrow: "Workflow",
    title: "Start with AI product listing optimization",
    description:
      "See how the listing workflow improves titles, descriptions, and structured product context before you publish.",
    label: "View listing workflow",
    color: "primary",
    variant: "flat",
  },
  {
    href: "/compare/best-ai-ecommerce-tools",
    eyebrow: "Comparison",
    title: "Compare AI ecommerce tool categories before you commit",
    description:
      "Use the guide to understand when Shopify-native generation is enough and when a broader optimization loop adds value.",
    label: "Read comparison guide",
  },
  {
    href: "/blog",
    eyebrow: "Blog",
    title: "Read the supporting guides for AI traffic and structured data",
    description:
      "Use the blog for the operational details that reinforce your Shopify product page improvements over time.",
    label: "Visit the blog",
  },
  {
    href: "/features",
    eyebrow: "Features",
    title: "Review the wider AI ecommerce tools stack",
    description:
      "Step back into the main features page if your team is evaluating the whole workflow rather than one platform.",
    label: "Open features page",
  },
] as const;

const faq = [
  {
    question: "What does AI for Shopify stores mean in practice?",
    answer:
      "For Shopify merchants, it means connecting the catalog, understanding how products perform in AI-mediated comparisons, and turning those findings into approved listing updates that can be written back into Shopify.",
  },
  {
    question: "How is this different from using Shopify Magic alone?",
    answer:
      "Shopify Magic helps with native content generation. écentic adds simulation, competitor benchmarking, diagnosis, and approval-ready optimization workflows so merchants can see why products lose and what to fix next.",
  },
  {
    question: "Can Shopify merchants publish changes back to the store?",
    answer:
      "Yes. The documented workflow includes pushing approved title and description updates back through the Shopify Admin API for merchants who want the optimization loop to stay connected to the live catalog.",
  },
  {
    question: "Who should use this page?",
    answer:
      "This page is built for buyers searching for AI for Shopify stores, especially teams that want more than a basic text generator and need a full workflow around product selection, comparison, and listing improvement.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "AI for Shopify Stores",
  description,
  path: "/platforms/shopify",
  keywords: [
    "AI for Shopify stores",
    "Shopify AI optimization",
    "Shopify product listing optimization",
    "Shopify Magic alternatives",
    "AI ecommerce tools for Shopify",
  ],
});

export default () => {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "AI for Shopify Stores",
      description,
      url: absoluteUrl("/platforms/shopify"),
      about: [
        "AI for Shopify stores",
        "Shopify product listing optimization",
        "Shopify competitor analysis",
      ],
    },
    createBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "AI for Shopify Stores", path: "/platforms/shopify" },
    ]),
    createFaqSchema(faq),
  ];

  return (
    <ContentPageLayout
      eyebrow="Shopify"
      title="AI for Shopify Stores That Need More Than Automated Copy"
      meta={<p>Priority 1 platform page · Solution-aware commercial intent</p>}
      description={description}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be rendered inline for search engines
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <ContentPageSection
        number="01"
        title="Why Shopify merchants search for this category"
        description="This page is designed around the platform-specific keyword cluster from the workbook."
      >
        <ContentPageRichText
          content={`AI for Shopify stores usually starts with a simple question: how do we make our product pages easier to publish, easier to compare, and easier for modern shopping systems to choose?

Many Shopify teams already have the basics in place. They have a storefront, a product catalog, and a merchandising workflow. The real challenge is that product visibility now depends on more than theme design or ad performance. Titles, descriptions, attributes, and competitor context all shape whether a product feels easy to recommend.

That is why the most useful AI workflow for Shopify stores goes beyond generation alone. Merchants need to understand which products underperform, which competitor listing keeps winning, and which changes are worth shipping first.

This page targets that decision point directly:
- Teams evaluating AI for Shopify stores as a category
- Merchants looking for a Shopify Magic alternative or complement
- Operators who want listing improvements tied to measurable competitive outcomes
- Stores that need a tighter loop between catalog insight and publishing`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="02"
        title="What the Shopify workflow looks like in écentic"
        description="Everything here stays aligned with the repository docs and Shopify integration notes."
      >
        <ContentPageRichText
          content={`The Shopify workflow begins during connect and onboarding. Once the store is connected, products are imported so the merchant can choose which items should enter the optimization and simulation loop.

From there, the platform compares selected products against competitors and shows where AI systems prefer another option. That gives the team a clearer answer than guesswork because it ties product visibility to concrete competitive context.

When the merchant is ready to improve a listing, the optimization workflow generates a stronger version of the product content and makes it available for review. Approved changes can then be written back to Shopify so the workflow stays connected to the actual storefront instead of creating one more disconnected document.

For Shopify teams, the operational value usually comes from four things:
- A cleaner way to prioritize which products need attention first
- Better visibility into why product pages lose to specific competitors
- Faster review of listing updates before they go live
- A publishing path that fits the existing Shopify catalog workflow`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="03"
        title="Where this fits alongside Shopify-native AI"
        description="The page needs to help buyers compare approaches without making claims the product cannot support."
      >
        <ContentPageRichText
          content={`Shopify-native AI tools are helpful when the team needs faster drafting. That can save time, especially for early-stage merchandising work. But many merchants eventually need a more deliberate workflow around product selection and competitive clarity.

That is the gap écentic is designed to fill. The value is not only in rewriting text. It is in understanding whether the product page is easy for an AI shopping system to evaluate, whether another listing is communicating the buying decision more clearly, and whether the proposed changes are likely to improve the product's chance of being selected.

In other words, Shopify-native generation helps merchants produce copy. écentic helps merchants evaluate, prioritize, and improve product listings with a direct tie back to competitive outcomes.

That distinction becomes more important when:
- The catalog is large enough that manual review slows down every update
- The team needs to justify why a listing change matters
- Competitors keep winning on product clarity rather than price alone
- Merchandising leaders want a repeatable optimization loop instead of isolated edits`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="04"
        title="Keep exploring the Shopify cluster"
        description="Internal links matter for both users and the first SEO content cluster."
        classList={splitGridSectionClassList}
      >
        <ContentPageCardGrid items={related} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageSection
        number="05"
        title="Frequently asked questions"
        description="These questions reinforce the page topic while adding FAQ schema for search."
        classList={splitGridSectionClassList}
      >
        <ContentPageFaqGrid items={faq} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Connect your Shopify store" }}
        secondary={{ href: "/features", label: "Back to features" }}
        note="Built from the platform keyword cluster while staying aligned with the current Shopify integration workflow."
      />
    </ContentPageLayout>
  );
};
