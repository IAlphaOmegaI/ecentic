import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
} from "@/lib/seo";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../../_components/content";
import { Faq } from "../../pricing/_components/faq";
import { Evaluate } from "./_components/evaluate";
import { Hero } from "./_components/hero";
import { RelatedPages } from "./_components/related";
import { Why } from "./_components/why";
import { Workflow } from "./_components/workflow";

const description =
  "AI for WooCommerce stores that need product listing optimization, competitor analysis, and a clearer path from insights to updates.";

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
    question: "How does ecentic compare to other WooCommerce product plugins?",
    answer:
      "Most WooCommerce product plugins help with catalog management or basic copy. ecentic focuses specifically on understanding why products lose to competitors and turning that analysis into listing improvements that can be published back into the store.",
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
      title="AI for WooCommerce stores that need cleaner product workflows."
      description={description}
      hideHero
      hideHeroSpacer={false}
    >
      <JsonLd schemas={structuredData} />

      <Hero />

      <Why />

      <Workflow />

      <Evaluate />

      <RelatedPages />

      <ContentPageSection
        number="05"
        title="Frequently asked questions"
        description="Common questions from WooCommerce merchants evaluating AI optimization workflows."
        gutter
        classList={{ body: "p-0" }}
      >
        <Faq items={faq} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Connect your WooCommerce store" }}
        secondary={{ href: "/features", label: "Back to features" }}
        note="No platform migration · No credit card · See your free score first"
      />
    </ContentPageLayout>
  );
};
