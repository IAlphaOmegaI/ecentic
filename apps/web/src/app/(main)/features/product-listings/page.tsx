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
  "AI product listing optimization for titles, descriptions, and structured product data. Learn how écentic helps merchants improve product visibility.";

const nextSteps = [
  {
    href: "/platforms/shopify",
    eyebrow: "Shopify",
    title: "See the workflow for Shopify catalogs",
    description:
      "Connect products, benchmark competitors, and publish approved listing updates back into Shopify.",
    label: "Open Shopify page",
    color: "primary",
    variant: "flat",
  },
  {
    href: "/platforms/woocommerce",
    eyebrow: "WooCommerce",
    title: "Run the same loop for WooCommerce products",
    description:
      "Use the WooCommerce path if your team needs product improvements without changing platforms.",
    label: "Open WooCommerce page",
  },
  {
    href: "/compare/best-ai-ecommerce-tools",
    eyebrow: "Comparison",
    title: "Compare AI ecommerce categories before you buy",
    description:
      "Use the guide to separate content generators from agent-commerce optimization tools.",
    label: "Read comparison guide",
  },
  {
    href: "/blog",
    eyebrow: "Blog",
    title: "Go deeper on structured data, AI traffic, and catalog visibility",
    description:
      "The blog turns product listing optimization into repeatable operational checklists for merchants and teams.",
    label: "Visit the blog",
  },
] as const;

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
    question: "What is the difference between AI product descriptions and full listing optimization?",
    answer:
      "AI product descriptions focus on rewriting text faster. Full listing optimization improves titles, descriptions, structured attributes, and merchant trust signals together so the listing is easier for both buyers and AI shopping systems to evaluate.",
  },
  {
    question: "How does écentic help with product listing optimization?",
    answer:
      "écentic simulates how AI shopping agents compare products, shows why a competitor wins, and turns those findings into improved titles, descriptions, and listing updates merchants can approve and publish.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "AI Product Listing Optimization",
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
      title="AI Product Listing Optimization for Stronger Product Pages"
      description={description}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be rendered inline for search engines
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <ContentPageSection
        number="01"
        title="Why product listings struggle in AI-mediated buying"
        description="Most catalog problems stem from the same gap: product data that was built for humans to browse, not for AI systems to compare."
      >
        <ContentPageRichText
          content={`AI product listing optimization matters because AI shopping systems do not browse a page the same way a human does. They compare product titles, product descriptions, structured attributes, price context, compatibility details, and merchant trust signals in a compressed decision window. If one listing is clearer, more complete, and easier to compare, it often wins before the shopper ever sees why.

That creates a familiar problem for commerce teams. A catalog may look good enough in the storefront, yet still underperform when an AI system tries to compare two similar options. Titles may be generic, descriptions may hide the important details, and product data may be incomplete or inconsistent.

The solution is not to stuff a page with keywords. It is to make product information easier to retrieve, evaluate, and trust:
- Clarify what the product is and who it is for
- Surface the category-specific attributes buyers compare most often
- Keep descriptions focused on decision-making rather than filler
- Align structured data, offer data, and on-page copy so the listing stays coherent`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="02"
        title="What better listing optimization actually changes"
        description="Better optimization improves how a listing reads, how it competes, and how easy it is for a buyer to trust."
      >
        <ContentPageRichText
          content={`When merchants think about AI product descriptions, they often start with text generation. That can help, but it is only one slice of the work. High-performing product listing optimization usually improves four layers at the same time.

The first layer is product identity. The title should carry useful buying context without becoming cluttered. The shopper and the model both need to understand the product type, the differentiator, and the variant or compatibility context quickly.

The second layer is product explanation. The description should make comparison easier by explaining what matters most, how the product fits the use case, and what would otherwise create uncertainty.

The third layer is attribute completeness. Missing dimensions, materials, compatibility fields, warranty details, pack counts, or technical specifications can quietly weaken a product in competitive categories.

The fourth layer is merchant trust. Policy links, review coverage, availability accuracy, and clear support context reinforce the offer around the product itself.

This is why a dedicated AI product listing optimization workflow needs to connect copy, data quality, and competitive analysis rather than treating them as unrelated tasks.`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="03"
        title="How écentic helps merchants improve listings"
        description="The workflow runs from simulation to diagnosis to an approval-ready listing update — without rebuilding your catalog from scratch."
      >
        <ContentPageRichText
          content={`écentic approaches AI product listing optimization through a closed loop instead of a one-off content rewrite.

The process starts with simulation. The platform runs AI shopping evaluations across your product and competitor listings so the team can see who wins and why.

Next comes diagnosis. Merchants can inspect the attribute gaps, review the reasons behind the selection, and understand whether the issue is missing data, weak positioning, or incomplete product context.

Then the optimization layer turns that analysis into concrete listing improvements. Titles, descriptions, and supporting product data become easier to review and easier to publish. For supported platforms, teams can push approved changes back into the store instead of copying them manually.

That workflow is especially useful for:
- Merchants trying to improve product discovery without rewriting the whole catalog at once
- Teams managing hundreds or thousands of SKUs with uneven product data quality
- Stores competing on specifications, compatibility, or merchant trust rather than impulse branding alone
- Operators who need a repeatable process for product content at scale`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="04"
        title="Where to go after this page"
        description="Move from the listing workflow into the platform or research content that fits your next step."
        classList={splitGridSectionClassList}
      >
        <ContentPageCardGrid items={nextSteps} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageSection
        number="05"
        title="Frequently asked questions"
        description="Common questions from merchants researching AI product listing optimization."
        classList={splitGridSectionClassList}
      >
        <ContentPageFaqGrid items={faq} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Start optimizing listings" }}
        secondary={{ href: "/features", label: "Back to features" }}
      />
    </ContentPageLayout>
  );
};
