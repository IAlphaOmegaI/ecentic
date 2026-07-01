import type { Metadata } from "next";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
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
import { TechstarsRedemptionForm } from "./_components/techstars-redemption-form";

const description =
  "An exclusive ecentic deal for Techstars founders: extended Dominate access, white-glove onboarding, and founder pricing. Redeem in under two minutes.";

const faq = [
  {
    question: "Who qualifies for this deal?",
    answer:
      "Any company that has been through a current or past Techstars program. We verify your cohort against the Techstars portfolio after you submit, so use the email and company name Techstars has on file to speed things up.",
  },
  {
    question: "What do I actually get?",
    answer:
      "Extended access to ecentic Dominate — continuous AI agent simulations across GPT-4, Claude, Gemini, and Perplexity, auto-optimization with one-click publish, drift alerts, and UCP generation — plus white-glove onboarding for your catalog and founder pricing when the deal period ends.",
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
  title: "ecentic for Techstars — Redeem Your Founder Deal",
  description,
  path: "/techstars",
  keywords: [
    "Techstars deal",
    "Techstars startup deal",
    "ecentic Techstars",
    "AI ecommerce tool for startups",
    "Techstars founder perks",
  ],
});

export default () => {
  const structuredData = [
    organizationSchema,
    createBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Techstars", path: "/techstars" },
    ]),
    createFaqSchema(faq),
    {
      "@context": "https://schema.org",
      "@type": "Offer",
      name: "ecentic Techstars founder deal",
      category: "Software deal",
      url: absoluteUrl("/techstars"),
      description,
      eligibleCustomerType: "Techstars portfolio companies",
    },
  ];

  return (
    <ContentPageLayout
      eyebrow="Techstars"
      title="Your ecentic deal, ready to redeem."
      badge={
        <ContentPageBadge
          logo="/partners/techstars.svg"
          alt="Techstars"
          label="Exclusive partner deal"
        />
      }
      description={description}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be rendered inline for search engines
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <ContentPageSection
        number="01"
        title="What's in the deal"
        description="Built for Techstars founders who would rather win AI agent recommendations than babysit a listings spreadsheet."
      >
        <ContentPageRichText
          content={`Ecentic shows you how AI shopping agents compare your products against competitors, diagnoses why you win or lose, and rewrites your listings to close the gap. The Techstars deal opens the full platform:

- Extended ecentic Dominate — continuous simulations across GPT-4, Claude, Gemini, and Perplexity
- Auto-optimization with one-click publish and model drift alerts
- UCP generation so agents can verify your catalog directly
- White-glove onboarding for your catalog and founder pricing after the deal period

Redeem below and we'll verify your cohort, then email your activation link within one business day.`}
        />
      </ContentPageSection>

      <ContentPageSection
        number="02"
        title="Redeem your deal"
        description="Tell us who you are and what you want to win. We verify your Techstars cohort and turn on your deal — no credit card required."
      >
        <TechstarsRedemptionForm />
      </ContentPageSection>

      <ContentPageSection
        number="03"
        title="How redemption works"
        description="Three steps from form to live deal. Most founders are running their first simulation the same day."
      >
        <ContentPageRichText
          content={`There is no procurement maze here — the whole point is to get you simulating fast.

- Submit the form — company, cohort, and what you want ecentic to help you win
- We verify your cohort against the Techstars portfolio, usually the same day
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
        note="Techstars founders only. We verify your cohort before activating the deal."
      />
    </ContentPageLayout>
  );
};
