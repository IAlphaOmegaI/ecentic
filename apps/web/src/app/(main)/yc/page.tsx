import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/handshake.png";
import {
  ContentPageBadge,
  ContentPageFaqGrid,
  ContentPageFooter,
  ContentPageLayout,
  ContentPageRichText,
  ContentPageSection,
  splitGridClassList,
  splitGridSectionClassList,
} from "../_components/content";
import { YcRedemptionForm } from "./_components/yc-redemption-form";

const description =
  "An exclusive ecentic deal for Y Combinator students: extended Dominate access, white-glove onboarding, and student pricing. Redeem in under two minutes.";

const faq = [
  {
    question: "Who qualifies for this deal?",
    answer:
      "Any company in a current or past Y Combinator batch. We verify your batch against the YC directory after you submit, so use the email and company name YC has on file to speed things up.",
  },
  {
    question: "What do I actually get?",
    answer:
      "Extended access to ecentic Dominate — continuous AI agent simulations across ChatGPT, Claude, Gemini, and Perplexity, auto-optimization with one-click publish, drift alerts, and UCP generation — plus white-glove onboarding for your catalog and student pricing when the deal period ends.",
  },
  {
    question: "Do I need an account first?",
    answer:
      "No. Redeem the deal here and we'll email activation details within one business day. You can create your account now or wait for the activation link — both lead to the same place.",
  },
  {
    question: "How long does redemption take?",
    answer:
      "The form takes about two minutes. Verification is usually same-day, and never more than one business day. You'll get an email the moment your deal is live.",
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "ecentic for Y Combinator — Redeem Your Student Deal",
  description,
  path: "/yc",
  keywords: [
    "Y Combinator deal",
    "YC startup deal",
    "ecentic YC",
    "AI ecommerce tool for startups",
    "YC student perks",
  ],
});

export default () => {
  const structuredData = [
    organizationSchema,
    createBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Y Combinator", path: "/yc" },
    ]),
    createFaqSchema(faq),
    {
      "@context": "https://schema.org",
      "@type": "Offer",
      name: "ecentic Y Combinator student deal",
      category: "Software deal",
      url: absoluteUrl("/yc"),
      description,
      eligibleCustomerType: "Y Combinator students",
    },
  ];

  return (
    <ContentPageLayout
      eyebrow="Y Combinator"
      title="Your ecentic deal,"
      accent="ready to redeem."
      art={Art}
      badge={
        <ContentPageBadge
          logo="/partners/y-combinator.svg"
          alt="Y Combinator"
          label="Exclusive partner deal"
        />
      }
      description={description}
    >
      <JsonLd schemas={structuredData} />

      <ContentPageSection
        number="01"
        title="What's in the deal"
        description="Built for YC students who would rather win AI agent recommendations than babysit a listings spreadsheet."
      >
        <ContentPageRichText
          content={`ecentic shows you how AI shopping agents compare your products against competitors, diagnoses why you win or lose, and rewrites your listings to close the gap. The YC deal opens the full platform:

- Extended ecentic Dominate — continuous simulations across ChatGPT, Claude, Gemini, and Perplexity
- Auto-optimization with one-click publish and model drift alerts
- UCP generation so agents can verify your catalog directly
- White-glove onboarding for your catalog and student pricing after the deal period

Redeem below and we'll verify your batch, then email your activation link within one business day.`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="02"
        title="Redeem your deal"
        description="Tell us who you are and what you want to win. We verify your YC batch and turn on your deal — no credit card required."
      >
        <YcRedemptionForm />
      </ContentPageSection>

      <ContentPageSection
        number="03"
        title="How redemption works"
        description="Three steps from form to live deal. Most students are running their first simulation the same day."
      >
        <ContentPageRichText
          content={`There is no procurement maze here — the whole point is to get you simulating fast.

- Submit the form — company, batch, and what you want ecentic to help you win
- We verify your batch against the YC directory, usually the same day
- You get an activation link and white-glove help importing your catalog

Once your catalog is in, ecentic runs it through the major AI shopping models, shows you why competitors get picked, and turns the findings into listing changes you can approve in one click.`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="04"
        title="Redemption FAQ"
        description="Eligibility, what's included, and how fast you'll be live."
        classList={splitGridSectionClassList}
      >
        <ContentPageFaqGrid items={faq} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{ href: "/sign-up", label: "Create your account" }}
        secondary={{ href: "/demo", label: "Book a demo" }}
        note="YC students only. We verify your batch before activating the deal."
      />
    </ContentPageLayout>
  );
};
