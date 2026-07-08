import type { Metadata } from "next";
import { BookingEmbed } from "@/components/cal";
import { JsonLd } from "@/components/json-ld";
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

const description =
  "Book a 15-minute ecentic demo. We run your top products through GPT-4, Claude, Gemini, and Perplexity live, show you why you win or lose, and scope the highest-impact listing fixes.";

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
      title="See your AI win rate, live in 15 minutes."
      description={description}
    >
      <JsonLd schemas={structuredData} />

      <div className="border-accent-foreground border-b">
        <div className="mx-auto max-w-6xl border-accent-foreground border-x">
          <div className="h-[680px] w-full bg-background">
            <BookingEmbed />
          </div>
        </div>
      </div>

      <ContentPageSection
        number="01"
        title="What we’ll cover"
        description="A focused 15-minute working session, not a slide deck — you leave with something to act on."
      >
        <ContentPageRichText
          content={`We keep the call short and practical. Bring a store URL or a few product links and we will do the rest live:
- Run your top products through GPT-4, Claude, Gemini, and Perplexity while you watch
- Show exactly why agents pick you or a competitor, attribute by attribute
- Hand you the highest-impact listing changes to make first
- Sketch what an ongoing optimization loop would look like for your catalog

There is no procurement deck required to start, and no obligation to continue.`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="02"
        title="Who should book"
        description="The call is most useful when you have a real catalog to look at and a reason to act on the results."
      >
        <ContentPageRichText
          content={`A demo is the fastest path when you want a second set of eyes on the results rather than reading the report alone.

It tends to help teams that are:
- Managing large or competitive catalogs where missing attributes quietly cost selection
- Evaluating agent-commerce optimization against content generators or analytics tools
- Running multiple stores and weighing a custom Enterprise setup
- Short on time and want the diagnosis explained in plain language

If you would rather just see your numbers first, the free Scan plan runs the same simulation on your top 10 products in about two minutes.`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="03"
        title="Frequently asked questions"
        description="Common questions about the demo call."
        classList={splitGridSectionClassList}
      >
        <ContentPageFaqGrid items={faq} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Start free instead" }}
        secondary={{ href: "/pricing", label: "See pricing" }}
        note="Prefer self-serve? Run your first scan with no credit card."
      />
    </ContentPageLayout>
  );
};
