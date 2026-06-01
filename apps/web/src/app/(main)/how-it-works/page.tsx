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
import { Steps } from "../_components/steps";

const description =
  "How écentic works: simulate how GPT-4, Claude, Gemini, and Perplexity compare your products, diagnose why you lose, and optimize titles, descriptions, and structured data to win more AI-assisted carts.";

const steps = [
  {
    name: "Simulate",
    text: "écentic runs your products through GPT-4, Claude, Gemini, and Perplexity at the same time, mapping exactly how each agent compares your listings against every competitor in your category.",
  },
  {
    name: "Diagnose",
    text: "See where you lose: which attributes are missing, which competitors win, and which models reject you. Every gap has a reason, and the diagnosis names it in plain language.",
  },
  {
    name: "Optimize",
    text: "écentic rewrites titles, descriptions, and structured data for maximum agent selection. Approve in one click or set auto-publish, and listings stay re-optimized as models evolve.",
  },
] as const;

const faq = [
  {
    question: "How does écentic simulate AI shopping agents?",
    answer:
      "écentic sends your product data through the major AI models the same way a shopping assistant would, then records how each one compares your listing against competitors. The result is a repeatable read on whether agents pick you, and why.",
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
      name: "How écentic optimizes products for AI shopping agents",
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
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be rendered inline for search engines
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Steps />

      <ContentPageSection
        number="01"
        title="Simulate"
        description="See how every major AI shopping model compares your products against the competition, in real time."
      >
        <ContentPageRichText
          content={`AI shopping agents do not read your store the way a human shopper does. They compare structured signals — titles, attributes, pricing, and trust markers — across every product in a category in seconds.

écentic recreates that comparison. It runs your products through GPT-4, Claude, Gemini, and Perplexity at once and records the outcome for each model:
- Which competitor each agent prefers and why
- Which attributes carried the most weight in the decision
- How the same product performs across different models and shopping contexts`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="02"
        title="Diagnose"
        description="Turn a win-or-lose result into a specific, fixable reason for every product."
      >
        <ContentPageRichText
          content={`A score on its own does not help a merchandising team act. The diagnosis step explains the cause behind each loss in language your team can use.

Most losses fall into a few patterns:
- A title that does not carry the buying context an agent needs
- Missing or inconsistent specifications and structured data
- Weak trust signals compared to a competing product
- A description that makes comparison harder instead of easier

Each finding is tied to a concrete change, so the work moves from "why did we lose" to "here is exactly what to fix first".`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="03"
        title="Optimize"
        description="Approve the highest-impact changes and keep listings tuned as the models evolve."
      >
        <ContentPageRichText
          content={`The final step converts the diagnosis into approval-ready listing updates. écentic rewrites titles, descriptions, and structured data for maximum agent selection and queues them for review.

You stay in control of how much is automated:
- Review and publish each change in one click
- Enable auto-publish for products where the loop has earned trust
- Re-run simulations continuously so listings stay optimized as models drift

Because every change is tracked, you can measure the lift in win rate and the agent traffic that follows.`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="04"
        title="Frequently asked questions"
        description="Common questions about the simulate, diagnose, and optimize loop."
        classList={splitGridSectionClassList}
      >
        <ContentPageFaqGrid items={faq} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Run your free scan" }}
        secondary={{ href: "/pricing", label: "See pricing" }}
      />
    </ContentPageLayout>
  );
};
