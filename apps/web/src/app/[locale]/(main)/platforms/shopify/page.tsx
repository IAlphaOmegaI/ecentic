import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
} from "@/lib/seo";
import Art from "@/public/images/ascii/bag.png";
import shopify from "@/public/images/shopify.svg";
import {
  ContentPageBadge,
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../../_components/content";
import { bannerAction } from "../../_components/page-banner";
import { Faq } from "../../pricing/_components/faq";
import { Compare } from "./_components/compare";
import { RelatedPages } from "./_components/related";
import { Why } from "./_components/why";
import { Workflow } from "./_components/workflow";

const SHOPIFY_APP_STORE_URL = "https://apps.shopify.com/ecentic-ai";

const assurances = [
  "2-minute install, no developer needed",
  "Approved updates write back via the Admin API",
  "See your free score first",
] as const;

const description =
  "AI for Shopify stores that need stronger product listings, clearer competitor analysis, and approved updates pushed straight back into the Shopify Admin.";

const faq = [
  {
    question: "What does AI for Shopify stores mean in practice?",
    answer:
      "For Shopify merchants, it means connecting the catalog, understanding how products perform in AI-mediated comparisons, and turning those findings into approved listing updates that can be written back into Shopify.",
  },
  {
    question: "How is this different from using Shopify Magic alone?",
    answer:
      "Shopify Magic helps with native content generation. ecentic adds simulation, competitor benchmarking, diagnosis, and approval-ready optimization workflows so merchants can see why products lose and what to fix next.",
  },
  {
    question: "Can Shopify merchants publish changes back to the store?",
    answer:
      "Yes. The documented workflow includes pushing approved title and description updates back through the Shopify Admin API for merchants who want the optimization loop to stay connected to the live catalog.",
  },
  {
    question: "When should Shopify teams move beyond native AI tools?",
    answer:
      "When the team needs to understand why a specific competitor keeps winning, which listing attributes matter most, and how to prioritize catalog improvements across a large number of SKUs. That is when a dedicated optimization workflow adds more value than built-in generation alone.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "AI for Shopify — Listing and Catalog Optimization",
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
      title="AI for Shopify stores that need"
      accent="more than automated copy."
      description="Connect your catalog, see why AI shopping agents pick competitors over you, and publish approved title and description updates straight back into Shopify."
      assurances={assurances}
      art={{ source: Art, alt: "ASCII-art illustration of a shopping bag" }}
      badge={
        <ContentPageBadge
          logo="/images/shopify.svg"
          alt="Shopify"
          label="Built for Shopify"
        />
      }
      actions={
        <>
          <Button
            color="accent"
            className={bannerAction.lead}
            render={<Link href={SHOPIFY_APP_STORE_URL} />}
          >
            <Image src={shopify} alt="" className="size-5" />
            Install on Shopify
          </Button>
          <Button
            variant="outline"
            className={bannerAction.secondary}
            render={<Link href="/how-it-works" />}
          >
            See how it works
            <ArrowRightIcon className="size-4" />
          </Button>
        </>
      }
    >
      <JsonLd schemas={structuredData} />

      <Why />

      <Workflow />

      <Compare />

      <RelatedPages />

      <ContentPageSection
        number="05"
        title="Frequently asked questions"
        description="Common questions from Shopify merchants evaluating AI optimization workflows."
        gutter
        classList={{ body: "p-0" }}
      >
        <Faq items={faq} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Connect your Shopify store" }}
        secondary={{ href: "/features", label: "Back to features" }}
        note="2-minute install · No credit card · See your free score first"
      />
    </ContentPageLayout>
  );
};
