import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
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
import { TechstarsRedemptionForm } from "./_components/techstars-redemption-form";

type TechstarsPageProps = {
  params: Promise<{ locale: string }>;
};

export const generateMetadata = async ({
  params,
}: TechstarsPageProps): Promise<Metadata> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const translate = await getTranslations({ locale, namespace: "techstars" });

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/techstars", locale),
    keywords: [
      "Techstars deal",
      "Techstars startup deal",
      "ecentic Techstars",
      "AI ecommerce tool for startups",
      "Techstars founder perks",
    ],
  });
};

export default async ({ params }: TechstarsPageProps) => {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw;

  const translate = await getTranslations({ locale, namespace: "techstars" });
  const messages = await getMessages();
  const description = translate("meta.description");
  const faq = messages.techstars.faq.items;
  const pagePath = localizePath("/techstars", locale);

  const structuredData = [
    organizationSchema,
    createBreadcrumbSchema([
      {
        name: translate("breadcrumb.home"),
        path: localizePath("/", locale),
      },
      { name: translate("breadcrumb.page"), path: pagePath },
    ]),
    createFaqSchema(faq),
    {
      "@context": "https://schema.org",
      "@type": "Offer",
      name: translate("structuredData.offerName"),
      category: "Software deal",
      url: absoluteUrl(pagePath),
      description,
      eligibleCustomerType: translate("structuredData.eligibleCustomerType"),
    },
  ];

  return (
    <ContentPageLayout
      eyebrow={translate("hero.eyebrow")}
      title={translate("hero.title.primary")}
      accent={translate("hero.title.accent")}
      art={{ source: Art, alt: translate("hero.art.alt") }}
      badge={
        <ContentPageBadge
          logo="/partners/techstars.svg"
          alt={translate("hero.badge.alt")}
          label={translate("hero.badge.label")}
        />
      }
      description={description}
    >
      <JsonLd schemas={structuredData} />

      <ContentPageSection
        number={translate("deal.number")}
        title={translate("deal.title")}
        description={translate("deal.description")}
      >
        <ContentPageRichText content={translate("deal.content")} />
      </ContentPageSection>

      <ContentPageSection
        number={translate("redeem.number")}
        title={translate("redeem.title")}
        description={translate("redeem.description")}
      >
        <TechstarsRedemptionForm />
      </ContentPageSection>

      <ContentPageSection
        number={translate("howItWorks.number")}
        title={translate("howItWorks.title")}
        description={translate("howItWorks.description")}
      >
        <ContentPageRichText content={translate("howItWorks.content")} />
      </ContentPageSection>

      <ContentPageSection
        number={translate("faqSection.number")}
        title={translate("faqSection.title")}
        description={translate("faqSection.description")}
        classList={splitGridSectionClassList}
      >
        <ContentPageFaqGrid items={faq} classList={splitGridClassList} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{
          href: "/sign-up",
          label: translate("footer.primary"),
        }}
        secondary={{
          href: "/demo",
          label: translate("footer.secondary"),
        }}
        note={translate("footer.note")}
      />
    </ContentPageLayout>
  );
};
