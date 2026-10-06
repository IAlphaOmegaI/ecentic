import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { Navbar } from "@/components/navbar";
import { ClientMessages } from "@/i18n/client-messages";
import { localizePath } from "@/i18n/locale";
import {
  absoluteUrl,
  createMetadata,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from "@/lib/seo";
import { Booking } from "./_components/booking";
import { CaseStudy } from "./_components/case-study";
import { Features } from "./_components/features";
import { Hero } from "./_components/hero";
import { PartnersStrip } from "./_components/partners-strip";
import { PartnershipBanner } from "./_components/partnership-banner";
import { Proof } from "./_components/proof";
import { SmoothScroll } from "./_components/smooth-scroll";
import { Steps } from "./_components/steps";
import { getTestimonialData, Testimonials } from "./_components/testimonials";

const Comparison = dynamic(() =>
  import("./_components/comparison").then((module) => module.Comparison),
);

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("home");

  return createMetadata({
    image: false,
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/", locale),
    keywords: [
      "AI ecommerce tools",
      "AI ecommerce platform",
      "AI product listing optimization",
      "AI for Shopify stores",
      "AI shopping agents",
    ],
  });
};

export default async () => {
  const locale = await getLocale();

  // Locale comes from `next/root-params` via `i18n/request.ts`, so children
  // read it themselves instead of taking it as a prop. Keep this tree outside
  // a page-level `"use cache"` if children still need request-bound APIs.
  const translate = await getTranslations("home");
  const description = translate("meta.description");
  const { aggregateRating, reviewSchemas } = await getTestimonialData();

  return (
    // The homepage reads four namespaces; the marketing baseline above it does
    // not carry `home`. Declaring the scope here keeps the payload at ~15KB
    // instead of the 247KB catalog that used to ship with every page.
    <ClientMessages scope="home">
      <SmoothScroll>
        <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 border-accent-foreground border-x md:gap-12">
          <JsonLd
            schemas={[
              organizationSchema,
              websiteSchema,
              {
                ...softwareApplicationSchema,
                aggregateRating: {
                  "@type": "AggregateRating",
                  ...aggregateRating,
                },
                review: reviewSchemas,
              },
              {
                "@context": "https://schema.org",
                "@type": "WebPage",
                name: translate("meta.title"),
                description,
                url: absoluteUrl(localizePath("/", locale)),
                inLanguage: locale,
                about: [
                  "AI ecommerce platform",
                  "product listing optimization",
                  "AI shopping agents",
                ],
              },
            ]}
          />
          <Navbar />
          <Hero />
          <Proof />
          <PartnersStrip />
          <PartnershipBanner />
          <Steps />
          <Features />
          <Suspense>
            <Comparison />
          </Suspense>
          <CaseStudy />
          <Testimonials />
          <Booking />
          {/* The page's own summary, in the reading order a screen reader and
              a crawler get. Every string is already on the page in a designed
              component; this repeats them as a plain, nested outline so a
              client that runs no JavaScript still reads a complete h1 → h2 → h3
              document instead of a hero and a wall of sections. Nothing here is
              new copy — it is the same catalog entries the visible sections
              render. */}
          <section aria-label={translate("summary.label")} className="sr-only">
            <h2>{translate("meta.title")}</h2>
            <p>{description}</p>
            <p>{translate("proof.title")}</p>

            <h3>{translate("steps.title")}</h3>
            <p>{translate("steps.description")}</p>
            <ul>
              {(["connect", "diagnose", "optimize"] as const).map((step) => (
                <li key={step}>
                  <strong>{translate(`steps.${step}.title`)}</strong>{" "}
                  {translate(`steps.${step}.description`)}
                </li>
              ))}
            </ul>

            <h3>{translate("features.title")}</h3>
            <ul>
              {(["aiScore", "competitors", "fixes", "track"] as const).map(
                (feature) => (
                  <li key={feature}>
                    <strong>
                      {translate(`features.items.${feature}.title`)}
                    </strong>{" "}
                    {translate(`features.items.${feature}.description`)}
                  </li>
                ),
              )}
            </ul>

            <h3>{translate("caseStudy.title")}</h3>
            <p>{translate("caseStudy.description")}</p>
          </section>
          <Footer />
        </main>
      </SmoothScroll>
    </ClientMessages>
  );
};
