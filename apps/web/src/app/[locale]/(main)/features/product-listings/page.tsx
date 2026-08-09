import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
} from "@/lib/seo";
import Art from "@/public/images/ascii/listing.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../../_components/content";
import { Faq } from "../../pricing/_components/faq";
import { Layers } from "./_components/layers";
import { NextSteps } from "./_components/next-steps";
import { WhyListingsLose } from "./_components/why-listings-lose";
import { Workflow } from "./_components/workflow";

type ProductListingsPageProps = {
  params: Promise<{ locale: string }>;
};

export const generateMetadata = async ({
  params,
}: ProductListingsPageProps): Promise<Metadata> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const translate = await getTranslations({ locale, namespace: "productListings" });

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/features/product-listings", locale),
    keywords: [
      "AI product listing optimization",
      "product listing optimization",
      "AI product descriptions",
      "structured product data",
      "ecommerce product optimization",
    ],
  });
};

export default async ({ params }: ProductListingsPageProps) => {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw;
  setRequestLocale(locale);

  const translate = await getTranslations({ locale, namespace: "productListings" });
  const messages = await getMessages();
  const description = translate("meta.description");
  const assurances = messages.productListings.hero.assurances;
  const faq = messages.productListings.faq.items;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "AI Product Listing Optimization",
      description,
      url: absoluteUrl(localizePath("/features/product-listings", locale)),
      about: [
        "AI product listing optimization",
        "AI product descriptions",
        "structured product data",
      ],
    },
    createBreadcrumbSchema([
      { name: translate("breadcrumb.home"), path: localizePath("/", locale) },
      {
        name: translate("breadcrumb.features"),
        path: localizePath("/features", locale),
      },
      {
        name: translate("breadcrumb.productListings"),
        path: localizePath("/features/product-listings", locale),
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
      art={{
        source: Art,
        alt: translate("hero.art.alt"),
      }}
    >
      <JsonLd schemas={structuredData} />

      <WhyListingsLose />

      <Layers />

      <Workflow />

      <NextSteps />

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
          href: "/features",
          label: translate("footer.action.secondary"),
        }}
        note={translate("footer.note")}
      />
    </ContentPageLayout>
  );
};
