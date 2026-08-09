import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { BookCall } from "@/components/cal";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/tower.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../_components/content";
import { bannerAction } from "../_components/page-banner";
import { Faq } from "../pricing/_components/faq";
import { Capabilities } from "./_components/capabilities";
import { Compare } from "./_components/compare";

type EnterprisePageProps = {
  params: Promise<{ locale: string }>;
};

type FaqItem = {
  question: string;
  answer: string;
};

export const generateMetadata = async ({
  params,
}: EnterprisePageProps): Promise<Metadata> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const translate = await getTranslations({ locale, namespace: "enterprise" });

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/enterprise", locale),
    keywords: [
      "enterprise ecommerce AI",
      "AI agent commerce enterprise",
      "multi-brand product optimization",
      "agent traffic analytics enterprise",
    ],
  });
};

export default async ({ params }: EnterprisePageProps) => {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw;
  setRequestLocale(locale);

  const translate = await getTranslations({ locale, namespace: "enterprise" });
  const description = translate("meta.description");
  const assurances = translate.raw("hero.assurances") as readonly string[];
  const faq = translate.raw("faq.items") as readonly FaqItem[];

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: translate("meta.title"),
      description,
      url: absoluteUrl(localizePath("/enterprise", locale)),
    },
    organizationSchema,
    createBreadcrumbSchema([
      { name: translate("breadcrumb.home"), path: localizePath("/", locale) },
      {
        name: translate("breadcrumb.enterprise"),
        path: localizePath("/enterprise", locale),
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
      actions={
        <>
          <BookCall color="accent" className={bannerAction.lead}>
            {translate("hero.action.primary")}
            <ArrowRightIcon className="size-4" />
          </BookCall>
          <Button
            variant="outline"
            className={bannerAction.secondary}
            render={<Link href="/pricing" />}
          >
            {translate("hero.action.secondary")}
          </Button>
        </>
      }
    >
      <JsonLd schemas={structuredData} />

      <Capabilities />

      <Compare />

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
          href: "/demo",
          label: translate("footer.action.primary"),
        }}
        secondary={{
          href: "/pricing",
          label: translate("footer.action.secondary"),
        }}
        note={translate("footer.note")}
      />
    </ContentPageLayout>
  );
};
