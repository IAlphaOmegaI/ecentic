import type { Metadata } from "next";
import { BookingEmbed } from "@/components/cal";
import { JsonLd } from "@/components/json-ld";
import { Plus } from "@/components/plus";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/calendar.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../_components/content";
import { Faq } from "../pricing/_components/faq";
import { WhatWeCover } from "./_components/what-we-cover";
import { WhoShouldBook } from "./_components/who-should-book";

const assurances = [
  "15 minutes, not a slide deck",
  "No account or catalog connection needed",
  "No procurement deck required",
] as const;

const intro =
  "We run your top products through ChatGPT, Claude, Gemini, and Perplexity while you watch, show you why you win or lose, and scope the highest-impact listing fixes. Pick a slot below.";

const description =
  "Book a 15-minute ecentic demo. We run your top products through ChatGPT, Claude, Gemini, and Perplexity live, show you why you win or lose, and scope the highest-impact listing fixes.";

const faq = [
  {
    question: "What happens on the call?",
    answer:
      "We run your top products through the major AI shopping models while you watch, walk through why agents pick you or a competitor, and leave you with the highest-impact listing changes to make first.",
  },
  {
    question: "How long does the demo take?",
    answer:
      "Fifteen minutes. It is a focused working session, not a slide deck. If your team needs a deeper enterprise scoping call afterward, we will book that separately.",
  },
  {
    question: "Do I need to prepare anything?",
    answer:
      "Just the store URL or a few product links you care about. You do not need to connect your catalog or create an account before the call.",
  },
  {
    question: "Can I skip the call and just start?",
    answer:
      "Yes. The free Scan plan runs the same simulation on your top 10 products in about two minutes with no credit card. Book a call if you would rather have us walk through the results with you.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "Book a Demo — See Your AI Win Rate Live",
  description,
  path: "/demo",
  keywords: [
    "ecentic demo",
    "book AI ecommerce demo",
    "AI shopping agent demo",
    "product listing optimization demo",
  ],
});

export default () => {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Book a Demo — See Your AI Win Rate Live",
      description,
      url: absoluteUrl("/demo"),
      isPartOf: absoluteUrl("/"),
    },
    organizationSchema,
    createBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Book a demo", path: "/demo" },
    ]),
    createFaqSchema(faq),
  ];

  return (
    <ContentPageLayout
      eyebrow="Book a demo"
      title="See your AI win rate,"
      accent="live in 15 minutes."
      description={intro}
      assurances={assurances}
      art={Art}
    >
      <JsonLd schemas={structuredData} />

      <div className="border-accent-foreground border-b">
        <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
          <Plus className="bottom-0 left-0 hidden -translate-x-1/2 translate-y-1/2 md:flex" />
          <Plus className="right-0 bottom-0 hidden translate-x-1/2 translate-y-1/2 md:flex" />
          <div className="h-[680px] w-full bg-background">
            <BookingEmbed />
          </div>
        </div>
      </div>

      <WhatWeCover />

      <WhoShouldBook />

      <ContentPageSection
        number="03"
        title="Frequently asked questions"
        description="Common questions about the demo call."
        gutter
        classList={{ body: "p-0" }}
      >
        <Faq items={faq} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Start free instead" }}
        secondary={{ href: "/pricing", label: "See pricing" }}
        note="Prefer self-serve? Run your first scan with no credit card."
      />
    </ContentPageLayout>
  );
};
