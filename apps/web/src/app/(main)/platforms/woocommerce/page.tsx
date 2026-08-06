import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
} from "@/lib/seo";
import Art from "@/public/images/ascii/cart.png";
import {
  ContentPageBadge,
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../../_components/content";
import { Faq } from "../../pricing/_components/faq";
import { AgentCommerce } from "./_components/agent-commerce";
import { Evaluate } from "./_components/evaluate";
import { RelatedPages } from "./_components/related";
import { Why } from "./_components/why";
import { Workflow } from "./_components/workflow";

const assurances = [
  "No platform migration",
  "Free plugin on WordPress.org",
  "Approved updates publish via the REST API",
  "See your free score first",
] as const;

const description =
  "AI for WooCommerce stores that need product listing optimization, competitor analysis, and a clearer path from agent insights to published catalog updates.";

const faq = [
  {
    question: "What does AI for WooCommerce stores mean?",
    answer:
      "For WooCommerce merchants, it means connecting the product catalog, understanding where listings lose to competitors, and improving product pages with a workflow that stays tied to the live store. It increasingly also means letting AI shopping agents buy directly from the store, which is what the écentic plugin enables.",
  },
  {
    question: "Can WooCommerce stores publish optimized product updates?",
    answer:
      "Yes. Approved rewrites are published straight back into WooCommerce over the REST API, using credentials with read and write access. You review every change before it goes live — nothing is published to your storefront without your approval.",
  },
  {
    question: "Do I need the plugin, or can I connect with API keys?",
    answer:
      "Either works. The free écentic for WooCommerce plugin is the recommended path: you approve the connection inside wp-admin and it provisions the REST key for you, with no keys to copy. The plugin is also what makes the store transactable by AI agents. If you only want listing optimization, you can paste a WooCommerce REST key and secret instead.",
  },
  {
    question: "What does the plugin do to my storefront?",
    answer:
      "Nothing visible. It adds a discovery URL at /.well-known/ucp, an identity-linking endpoint, and a private REST bridge that only ecentic can call with the key you issued. Your theme, storefront, and checkout are untouched, and agent orders are created through the same WooCommerce internals as any other order.",
  },
  {
    question: "How does ecentic compare to other WooCommerce product plugins?",
    answer:
      "Most WooCommerce product plugins help with catalog management or basic copy. ecentic focuses specifically on understanding why products lose to competitors, turning that analysis into listing improvements published back into the store, and making the store discoverable and transactable by AI shopping agents.",
  },
  {
    question:
      "What is the right next step after reviewing the WooCommerce page?",
    answer:
      "Most merchants start with a free scan to see where their listings stand, then install the plugin to make the store agent-ready. If you are still comparing categories of tooling, the comparison guide is the better next stop.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "AI for WooCommerce — Catalog Optimization",
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
      title="AI for WooCommerce stores that need"
      accent="cleaner product workflows."
      description="Import your catalog, see where listings lose to competitors in AI-mediated comparisons, and publish approved improvements back into WooCommerce without changing platforms."
      assurances={assurances}
      art={{ source: Art, alt: "ASCII-art illustration of a shopping cart" }}
      badge={
        <ContentPageBadge
          logo="/images/woocommerce.svg"
          alt="WooCommerce"
          label="Built for WooCommerce"
        />
      }
    >
      <JsonLd schemas={structuredData} />

      <Why />

      <Workflow />

      <AgentCommerce />

      <Evaluate />

      <RelatedPages />

      <ContentPageSection
        number="06"
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
