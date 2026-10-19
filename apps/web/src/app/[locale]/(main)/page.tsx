import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { Navbar } from "@/components/navbar";
import { ClientMessages } from "@/i18n/client-messages";
import { localizePath } from "@/i18n/locale";
import {
  absoluteUrl,
  createFaqSchema,
  createMetadata,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from "@/lib/seo";
import { Booking } from "./_components/booking";
import { CaseStudy } from "./_components/case-study";
import { Features } from "./_components/features";
import { Hero } from "./_components/hero";
import { HomeFaq } from "./_components/home-faq";
import { PartnersStrip } from "./_components/partners-strip";
import { PartnershipBanner } from "./_components/partnership-banner";
import { Proof } from "./_components/proof";
import { SmoothScroll } from "./_components/smooth-scroll";
import { Steps } from "./_components/steps";

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
  const messages = await getMessages();
  const description = translate("meta.description");

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
              softwareApplicationSchema,
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
              createFaqSchema(messages.home.faq.items),
              {
                "@context": "https://schema.org",
                "@type": "VideoObject",
                name: translate("heroVideo.title"),
                description: translate("heroVideo.description"),
                thumbnailUrl: absoluteUrl(
                  "/videos/ecentic-launch-poster-20261008.webp",
                ),
                contentUrl: absoluteUrl("/videos/ecentic-launch-20261008.mp4"),
                uploadDate: "2026-10-08",
                duration: "PT58S",
                inLanguage: locale,
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
          <Booking />
          <HomeFaq />
          <Footer />
        </main>
      </SmoothScroll>
    </ClientMessages>
  );
};
