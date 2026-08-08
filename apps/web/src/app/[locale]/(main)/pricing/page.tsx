import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/coins.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../_components/content";
import { PartnershipBundle } from "../_components/partnership-bundle";
import { Compare } from "./_components/compare";
import { Faq } from "./_components/faq";
import { FeeExplainer } from "./_components/fee-explainer";
import { Plans } from "./_components/plans";

const assurances = [
  "Free scan first",
  "No card to start",
  "Month-to-month · cancel anytime",
] as const;

const description =
  "ecentic pricing: scan free, then pay-as-you-go — free to start, 3% only on AI-attributed orders (capped). Or a flat Compete/Dominate plan with no fee.";

const plans = [
  {
    name: "Scan",
    price: "0",
    description:
      "Free one-time simulation for your top 10 products. No credit card, results in two minutes.",
  },
  {
    name: "Pay-as-you-go",
    price: "0",
    description:
      "Free to start with no card. Full features; pay a 3% fee only on orders AI agents drive, capped at $500/mo.",
  },
  {
    name: "Compete",
    price: "14.90",
    description:
      "Flat monthly, no performance fee. Up to 100 products, daily simulations, competitor battlecards, and manual optimization suggestions.",
  },
  {
    name: "Scale",
    price: "44.90",
    description:
      "Flat monthly, no performance fee. Up to 1000 products, continuous simulations, auto-optimization with one-click publish, and competitor battlecards.",
  },
  {
    name: "Dominate",
    price: "149",
    description:
      "Everything in Scale plus model drift alerts and UCP generation. The tier partner deals (Y Combinator, Techstars) are redeemed against.",
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
      "Yes. The Scan plan runs a one-time simulation of your top 10 products across ChatGPT, Claude, Gemini, and Perplexity and returns a Win Rate Report. It needs no credit card and takes about two minutes to set up.",
  },
  {
    question: "What is the difference between Compete, Scale, and Dominate?",
    answer:
      "Compete is for teams that want to understand where they lose: up to 100 products, daily simulations, and competitor battlecards with manual suggestions. Scale adds volume and automation: up to 1000 products, continuous simulations, and one-click or auto-published optimizations. Dominate adds the protocol layer on top of Scale — model drift alerts and UCP generation — and is the tier our partner deals with Y Combinator and Techstars are redeemed against.",
  },
  {
    question:
      "What is the difference between pay-as-you-go and a subscription?",
    answer:
      "Pay-as-you-go is free to start with no card and unlocks every feature — you only pay a 3% fee on orders we can attribute to AI-agent traffic we optimize for. A subscription (Compete, Scale, or Dominate) is a flat monthly price with no performance fee, for teams that prefer predictable billing. Both run the same optimization loop; pick whichever pricing fits how you'd rather pay.",
  },
  {
    question: "How does the pay-as-you-go performance fee work?",
    answer:
      "On pay-as-you-go you pay a 3% fee only on orders we can attribute to AI-agent traffic we optimize for — an order counts only when it carries our attribution signal or follows a recent AI-referral visit to your store. You are never charged on your other sales, never per agent visit, and the fee is capped at $500 per month. It is free to start with no card; we only ask for a payment method once a fee is actually due. Flat subscriptions and the free Scan have no performance fee.",
  },
  {
    question: "Can I change plans or cancel later?",
    answer:
      "You can start on the free Scan, activate pay-as-you-go for ongoing optimization at no upfront cost, switch to a flat Compete, Scale, or Dominate subscription when you want predictable billing, and move to Enterprise once you need custom limits or security. Nothing locks you into a long contract to try the platform.",
  },
  {
    question: "When should I talk to sales instead of self-serving?",
    answer:
      "Book a call if you run hundreds of SKUs across multiple stores, need UCP signing or SSO, or want a custom ROI estimate for your catalog size before committing. Everything else is faster to start on the free Scan plan.",
  },
  {
    question: "What is the EU Presence bundle?",
    answer:
      "We partnered with EU Presence so you can go live in Europe and stay picked by AI agents in one engagement. The Compliance + AI Visibility bundle combines their GDPR representative, GPSR responsible person, and Privacy Center Plus with ecentic Scale — billed together with a 20% bundle discount, no minimums, and no setup fees. Book a bundle call from the pricing page to set it up.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "Pricing — Start Free, Pay When Agents Pick You",
  description,
  path: "/pricing",
  keywords: [
    "ecentic pricing",
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
      name: "ecentic",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description,
      url: absoluteUrl("/pricing"),
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: "0",
        highPrice: "149",
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
      title="Start free. Pay when agents"
      accent="pick you."
      description="Scan your store for free, then choose how you pay: a small fee only on orders AI agents drive, or a flat monthly plan with no fee. Same optimization loop either way."
      assurances={assurances}
      art={{ source: Art, alt: "ASCII-art illustration of stacked coins" }}
    >
      <JsonLd schemas={structuredData} />

      <Plans />

      <FeeExplainer />

      <Compare />

      <PartnershipBundle />

      <ContentPageSection
        number="04"
        title="Pricing FAQ"
        description="Common questions about plans, limits, and when to talk to sales."
        gutter
        classList={{ body: "p-0" }}
      >
        <Faq items={faq} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Start free" }}
        secondary={{ href: "/demo", label: "Book a demo" }}
        note="No credit card required to run your first scan."
      />
    </ContentPageLayout>
  );
};
