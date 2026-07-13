import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../_components/content";
import { Faq } from "../pricing/_components/faq";
import { Checks } from "./_components/checks";
import { Hero } from "./_components/hero";
import { ValidatorSection } from "./_components/validator-section";

const description =
  "Free UCP Validator: check whether any storefront publishes a valid Universal Commerce Profile at /.well-known/ucp, validate its schema against the spec, and confirm AI shopping agents are allowed in robots.txt.";

const faq = [
  {
    question: "What does the UCP Validator check?",
    answer:
      "It requests the public HTTPS domain, confirms /.well-known/ucp responds, parses the body as JSON, and reports UCP spec errors and warnings so you know the profile is well formed.",
  },
  {
    question: "Where should a Universal Commerce Profile be published?",
    answer:
      "At /.well-known/ucp on your storefront's public HTTPS domain. The validator fetches that exact path and shows whether it is reachable.",
  },
  {
    question: "Does it check whether AI shopping agents can read my store?",
    answer:
      "Yes. The validator reviews robots.txt so you can see whether major shopping and indexing bots are allowed to reach your Universal Commerce Profile without friction.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "UCP Validator — Free Universal Commerce Protocol Checker",
  description,
  path: "/ucp-validator",
  keywords: [
    "UCP validator",
    "Universal Commerce Protocol",
    "well-known ucp",
    "commerce protocol checker",
    "AI shopping agent access",
    "robots.txt agent access",
    "free UCP tool",
  ],
});

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "UCP Validator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/ucp-validator"),
    description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
  organizationSchema,
  createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "UCP Validator", path: "/ucp-validator" },
  ]),
  createFaqSchema(faq),
];

export default () => (
  <ContentPageLayout
    eyebrow="Protocol check"
    title="UCP Validator"
    description={description}
    hideHero
    hideHeroSpacer={false}
  >
    <JsonLd schemas={structuredData} />

    <Hero />

    <Checks />

    <ValidatorSection />

    <ContentPageSection
      number="03"
      title="Questions before you validate."
      description="What the checker covers, where profiles live, and how agent access is surfaced."
      gutter
      classList={{ body: "p-0" }}
    >
      <Faq items={faq} />
    </ContentPageSection>

    <ContentPageFooter
      primary={{ href: "#validate", label: "Validate a domain" }}
      secondary={{ href: "/resources", label: "All free tools" }}
      note="Free · No account required · Live fetch"
    />
  </ContentPageLayout>
);
