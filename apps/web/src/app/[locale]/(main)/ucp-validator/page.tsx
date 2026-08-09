import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/shield.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../_components/content";
import { bannerAction } from "../_components/page-banner";
import { Faq } from "../pricing/_components/faq";
import { Checks } from "./_components/checks";
import { ValidatorSection } from "./_components/validator-section";

type UcpValidatorPageProps = {
  params: Promise<{ locale: string }>;
};

export const generateMetadata = async ({
  params,
}: UcpValidatorPageProps): Promise<Metadata> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const translate = await getTranslations({
    locale,
    namespace: "ucpValidator",
  });

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/ucp-validator", locale),
    keywords: [
      "UCP validator",
      "Universal Commerce Protocol",
      "well-known ucp",
      "commerce protocol checker",
      "AI shopping agent access",
      "robots.txt agent access",
      "free UCP tool",
    ],
  });
};

export default async ({ params }: UcpValidatorPageProps) => {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw;

  const translate = await getTranslations({
    locale,
    namespace: "ucpValidator",
  });
  const messages = await getMessages();
  const description = translate("meta.description");
  const assurances = messages.ucpValidator.hero.assurances;
  const faq = messages.ucpValidator.faq.items;
  const pagePath = localizePath("/ucp-validator", locale);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: translate("structuredData.name"),
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl(pagePath),
      description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    organizationSchema,
    createBreadcrumbSchema([
      {
        name: translate("breadcrumb.home"),
        path: localizePath("/", locale),
      },
      { name: translate("breadcrumb.page"), path: pagePath },
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
      actions={
        <>
          <Button
            color="accent"
            className={bannerAction.lead}
            render={<Link href="#validate" />}
          >
            {translate("hero.actions.validate")}
            <ArrowRightIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            className={bannerAction.secondary}
            render={<Link href="/ucp-playground" />}
          >
            {translate("hero.actions.playground")}
          </Button>
        </>
      }
    >
      <JsonLd schemas={structuredData} />

      <Checks />

      <ValidatorSection />

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
          href: "#validate",
          label: translate("footer.primary"),
        }}
        secondary={{
          href: "/resources",
          label: translate("footer.secondary"),
        }}
        note={translate("footer.note")}
      />
    </ContentPageLayout>
  );
};
