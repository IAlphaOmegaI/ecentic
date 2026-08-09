import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
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

type PricingPageProps = {
  params: Promise<{ locale: string }>;
};

type SchemaPlan = {
  name: string;
  price: string;
  description: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

export const generateMetadata = async ({
  params,
}: PricingPageProps): Promise<Metadata> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const translate = await getTranslations({ locale, namespace: "pricing" });

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/pricing", locale),
    keywords: [
      "ecentic pricing",
      "AI ecommerce tool pricing",
      "product listing optimization pricing",
      "AI shopping agent software cost",
    ],
  });
};

export default async ({ params }: PricingPageProps) => {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw;
  setRequestLocale(locale);

  const translate = await getTranslations({ locale, namespace: "pricing" });
  const description = translate("meta.description");
  const assurances = translate.raw("hero.assurances") as readonly string[];
  const faq = translate.raw("faq.items") as readonly FaqItem[];
  const plans = translate.raw("schema.plans") as readonly SchemaPlan[];

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "ecentic",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description,
      url: absoluteUrl(localizePath("/pricing", locale)),
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
            url: absoluteUrl(localizePath("/pricing", locale)),
          })),
      },
    },
    organizationSchema,
    createBreadcrumbSchema([
      { name: translate("breadcrumb.home"), path: localizePath("/", locale) },
      {
        name: translate("breadcrumb.pricing"),
        path: localizePath("/pricing", locale),
      },
    ]),
    createFaqSchema(faq),
  ];

  return (
    <ContentPageLayout
      eyebrow={translate("hero.eyebrow")}
      title={translate("hero.title.primary")}
      accent={translate("hero.title.accent")}
      description={translate("hero.description")}
      assurances={assurances}
      art={{ source: Art, alt: translate("hero.art.alt") }}
    >
      <JsonLd schemas={structuredData} />

      <Plans />

      <FeeExplainer />

      <Compare />

      <PartnershipBundle />

      <ContentPageSection
        number={translate("faqSection.number")}
        title={translate("faqSection.title")}
        description={translate("faqSection.description")}
        gutter
        classList={{ body: "p-0" }}
      >
        <Faq items={faq} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{
          href: "/sign-up",
          label: translate("footer.action.primary"),
        }}
        secondary={{
          href: "/demo",
          label: translate("footer.action.secondary"),
        }}
        note={translate("footer.note")}
      />
    </ContentPageLayout>
  );
};
