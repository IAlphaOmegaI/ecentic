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
import { Hero } from "./_components/hero";
import { Steps } from "./_components/steps";

const description =
  "How ecentic works: simulate how GPT-4, Claude, Gemini, and Perplexity compare your products, diagnose why you lose, and optimize titles, descriptions, and structured data to win more AI-assisted carts.";

const steps = [
  {
    name: "Simulate",
    text: "ecentic runs your products through GPT-4, Claude, Gemini, and Perplexity at the same time, mapping exactly how each agent compares your listings against every competitor in your category.",
  },
  {
    name: "Diagnose",
    text: "See where you lose: which attributes are missing, which competitors win, and which models reject you. Every gap has a reason, and the diagnosis names it in plain language.",
  },
  {
    name: "Optimize",
    text: "ecentic rewrites titles, descriptions, and structured data for maximum agent selection. Approve in one click or set auto-publish, and listings stay re-optimized as models evolve.",
  },
] as const;

const faq = [
  {
    question: "How does ecentic simulate AI shopping agents?",
    answer:
      "ecentic sends your product data through the major AI models the same way a shopping assistant would, then records how each one compares your listing against competitors. The result is a repeatable read on whether agents pick you, and why.",
  },
  {
    question: "What does the diagnosis actually tell me?",
    answer:
      "It identifies the concrete reasons a product loses: a title that misses buying context, missing specifications, weak trust signals, or a competitor with clearer structured data. Each finding maps to a specific listing change.",
  },
  {
    question: "Do I have to publish changes automatically?",
    answer:
      "No. Optimizations are approval-ready. You can review and publish in one click, or enable auto-publish for products where you trust the loop. Either way, changes are tracked so you can measure the impact on win rate.",
  },
  {
    question: "How long before I see results?",
    answer:
      "The first scan runs in about two minutes and returns a Win Rate Report immediately. From there, daily or continuous simulations keep the diagnosis current as your catalog and the underlying models change.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "How It Works — Simulate, Diagnose, Optimize",
  description,
  path: "/how-it-works",
  keywords: [
    "how AI ecommerce optimization works",
    "AI shopping agent simulation",
    "product listing optimization workflow",
    "agent commerce optimization",
  ],
});

export default () => {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How ecentic optimizes products for AI shopping agents",
      description,
      url: absoluteUrl("/how-it-works"),
      step: steps.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step.name,
        text: step.text,
      })),
    },
    organizationSchema,
    createBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "How it works", path: "/how-it-works" },
    ]),
    createFaqSchema(faq),
  ];

  return (
    <ContentPageLayout
      eyebrow="How it works"
      title="From invisible to chosen in three steps."
      description={description}
      hideHero
      hideHeroSpacer={false}
    >
      <JsonLd schemas={structuredData} />

      <Hero />

      <Steps />

      <ContentPageSection
        number="04"
        title="Frequently asked questions"
        description="Common questions about the simulate, diagnose, and optimize loop."
        gutter
        classList={{ body: "p-0" }}
      >
        <Faq items={faq} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Run your free scan" }}
        secondary={{ href: "/pricing", label: "See pricing" }}
        note="First scan in about two minutes · No credit card"
      />
    </ContentPageLayout>
  );
};
