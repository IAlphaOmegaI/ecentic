import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
} from "@/lib/seo";
import Art from "@/public/images/ascii/bag.png";
import shopify from "@/public/images/shopify.svg";
import {
  ContentPageBadge,
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../../_components/content";
import { bannerAction } from "../../_components/page-banner";
import { Faq } from "../../pricing/_components/faq";
import { Compare } from "./_components/compare";
import { RelatedPages } from "./_components/related";
import { Why } from "./_components/why";
import { Workflow } from "./_components/workflow";

const SHOPIFY_APP_STORE_URL = "https://apps.shopify.com/ecentic-ai";

type ShopifyPageProps = {
  params: Promise<{ locale: string }>;
};

export const generateMetadata = async ({
  params,
}: ShopifyPageProps): Promise<Metadata> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const translate = await getTranslations({ locale, namespace: "shopify" });

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/platforms/shopify", locale),
    keywords: [
      "AI for Shopify stores",
      "Shopify AI optimization",
      "Shopify product listing optimization",
      "Shopify Magic alternatives",
      "AI ecommerce tools for Shopify",
    ],
  });
};

export default async ({ params }: ShopifyPageProps) => {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw;
  setRequestLocale(locale);

  const translate = await getTranslations({ locale, namespace: "shopify" });
  const messages = await getMessages();
  const description = translate("meta.description");
  const assurances = messages.shopify.hero.assurances;
  const faq = messages.shopify.faq.items;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: translate("breadcrumb.shopify"),
      description,
      url: absoluteUrl(localizePath("/platforms/shopify", locale)),
      about: [
        "AI for Shopify stores",
        "Shopify product listing optimization",
        "Shopify competitor analysis",
      ],
    },
    createBreadcrumbSchema([
      { name: translate("breadcrumb.home"), path: localizePath("/", locale) },
      {
        name: translate("breadcrumb.shopify"),
        path: localizePath("/platforms/shopify", locale),
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
      badge={
        <ContentPageBadge
          logo="/images/shopify.svg"
          alt={translate("hero.badge.alt")}
          label={translate("hero.badge.label")}
        />
      }
      actions={
        <>
          <Button
            color="accent"
            className={bannerAction.lead}
            render={<Link href={SHOPIFY_APP_STORE_URL} />}
          >
            <Image src={shopify} alt="" className="size-5" />
            {translate("hero.action.primary")}
          </Button>
          <Button
            variant="outline"
            className={bannerAction.secondary}
            render={<Link href="/how-it-works" />}
          >
            {translate("hero.action.secondary")}
            <ArrowRightIcon className="size-4" />
          </Button>
        </>
      }
    >
      <JsonLd schemas={structuredData} />

      <Why />

      <Workflow />

      <Compare />

      <RelatedPages />

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
