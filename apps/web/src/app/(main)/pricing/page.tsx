import type { Metadata } from "next";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import {
  ContentPageFaqGrid,
  ContentPageFooter,
  ContentPageLayout,
  ContentPageRichText,
  ContentPageSection,
  splitGridClassList,
  splitGridSectionClassList,
} from "../_components/content";
import { Pricing } from "../_components/pricing";

const description =
  "écentic pricing: start free with a one-time AI agent scan, then move to Compete ($149/mo) or Dominate ($449/mo) when agents start picking you. Custom Enterprise plans available.";

const plans = [
  {
    name: "Scan",
    price: "0",
    description:
      "Free one-time simulation for your top 10 products. No credit card, results in two minutes.",
  },
  {
    name: "Compete",
    price: "149",
    description:
      "Up to 100 products, daily simulations, competitor battlecards, and manual optimization suggestions.",
  },
  {
    name: "Dominate",
    price: "449",
    description:
      "Up to 1000 products, continuous simulations, auto-optimization with one-click publish, drift alerts, and UCP generation.",
  },
  {
    name: "Enterprise",
    price: "Custom",
    description:
      "Custom limits, enterprise security, UCP signing, multi-brand dashboards, and dedicated support.",
  },
] as const;

const faq = [
  {
    question: "Is there really a free plan?",
    answer:
      "Yes. The Scan plan runs a one-time simulation of your top 10 products across GPT-4, Claude, Gemini, and Perplexity and returns a Win Rate Report. It needs no credit card and takes about two minutes to set up.",
  },
  {
    question: "What is the difference between Compete and Dominate?",
    answer:
      "Compete is for teams that want to understand where they lose: up to 100 products, daily simulations, and competitor battlecards with manual suggestions. Dominate adds scale and automation: up to 1000 products, continuous simulations, one-click or auto-published optimizations, model drift alerts, and UCP generation.",
  },
  {
    question: "Can I change plans or cancel later?",
    answer:
      "You can start on Scan, upgrade to Compete or Dominate when you are ready to act on the results, and move to Enterprise once you need custom limits or security. Plans are monthly, so you are never locked into a long contract to try the platform.",
  },
  {
    question: "When should I talk to sales instead of self-serving?",
    answer:
      "Book a call if you run hundreds of SKUs across multiple stores, need UCP signing or SSO, or want a custom ROI estimate for your catalog size before committing. Everything else is faster to start on the free Scan plan.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "Pricing — Start Free, Pay When Agents Pick You",
  description,
  path: "/pricing",
  keywords: [
    "écentic pricing",
    "AI ecommerce tool pricing",
    "product listing optimization pricing",
    "AI shopping agent software cost",
  ],
});

export default () => {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "écentic",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description,
      url: absoluteUrl("/pricing"),
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: "0",
        highPrice: "449",
        offerCount: plans.length,
        offers: plans
          .filter((plan) => plan.price !== "Custom")
          .map((plan) => ({
            "@type": "Offer",
            name: plan.name,
            price: plan.price,
            priceCurrency: "USD",
            description: plan.description,
            url: absoluteUrl("/pricing"),
          })),
      },
    },
    organizationSchema,
    createBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Pricing", path: "/pricing" },
    ]),
    createFaqSchema(faq),
  ];

  return (
    <ContentPageLayout
      eyebrow="Pricing"
      title="Start free. Pay when agents start picking you."
      description={description}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be rendered inline for search engines
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Pricing />

      <ContentPageSection
        number="01"
        title="How billing works"
        description="Pricing scales with how many products you optimize and how much you automate — not with seats or hidden add-ons."
      >
        <ContentPageRichText
          content={`Every account starts on the free Scan plan, which runs a one-time simulation of your top 10 products so you can see your Win Rate Report before paying anything.

When you are ready to act on the results, two paid plans cover most teams:
- Compete at $149/mo for up to 100 products, daily simulations, and competitor battlecards
- Dominate at $449/mo for up to 1000 products, continuous simulations, auto-optimization, drift alerts, and UCP generation

Plans are billed monthly, so you can upgrade as your catalog and automation needs grow. Teams running hundreds of SKUs across multiple stores, or with security and signing requirements, move to a custom Enterprise plan.`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="02"
        title="What every plan includes"
        description="The core simulation, diagnosis, and optimization loop is the same on every tier. Paid plans add scale, automation, and protocol features."
      >
        <ContentPageRichText
          content={`No matter where you start, écentic runs your products through the major AI shopping models, shows you why competitors get selected, and turns the findings into listing changes you can approve.

The paid tiers expand that core loop in three directions:
- Scale — more products, more frequent simulations, and more competitor coverage
- Automation — one-click and auto-published optimizations instead of manual edits
- Protocol — UCP generation and signing so agents can verify your catalog directly

If you are comparing plans, the simplest path is to scan for free, read the diagnosis, and let the size of your catalog decide between Compete and Dominate.`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="03"
        title="Pricing FAQ"
        description="Common questions about plans, limits, and when to talk to sales."
        classList={splitGridSectionClassList}
      >
        <ContentPageFaqGrid items={faq} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Start free" }}
        secondary={{ href: "/demo", label: "Book a demo" }}
        note="No credit card required to run your first scan."
      />
    </ContentPageLayout>
  );
};
