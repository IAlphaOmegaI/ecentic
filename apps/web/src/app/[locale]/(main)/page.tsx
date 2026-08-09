import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { Navbar } from "@/components/navbar";
import { localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
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
import {
  Testimonials,
  getTestimonialData,
} from "./_components/testimonials";

const Comparison = dynamic(() =>
  import("./_components/comparison").then((module) => module.Comparison),
);

type HomeProps = {
  params: Promise<{ locale: string }>;
};

export const generateMetadata = async ({
  params,
}: HomeProps): Promise<Metadata> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const translate = await getTranslations({ locale, namespace: "home" });

  return createMetadata({
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

export default async ({ params }: HomeProps) => {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw;
  setRequestLocale(locale);

  // Do not wrap this tree in `"use cache"`: Navbar/Footer use next-intl
  // Link / getTranslations without an explicit locale, which reads headers()
  // via getRequestConfig and fails Cache Components prerender.
  const translate = await getTranslations({ locale, namespace: "home" });
  const description = translate("meta.description");
  const { aggregateRating, reviewSchemas } = await getTestimonialData(locale);

  return (
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
        <Hero locale={locale} />
        <Proof locale={locale} />
        <PartnersStrip locale={locale} />
        <PartnershipBanner locale={locale} />
        <Steps locale={locale} />
        <Features locale={locale} />
        <Suspense>
          <Comparison />
        </Suspense>
        <CaseStudy locale={locale} />
        <Testimonials locale={locale} />
        <Booking locale={locale} />
        <section aria-label="About ecentic" className="sr-only">
          <h2>{translate("meta.title")}</h2>
          <p>{description}</p>
        </section>
        <Footer />
      </main>
    </SmoothScroll>
  );
};
