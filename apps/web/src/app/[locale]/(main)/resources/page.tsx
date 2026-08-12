import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/toolbox.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../_components/content";
import { bannerAction } from "../_components/page-banner";
import { Faq } from "../pricing/_components/faq";
import { Developer } from "./_components/developer";
import { Guides } from "./_components/guides";
import { Tools } from "./_components/tools";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("resources");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/resources", locale),
    keywords: [
      "free AI ecommerce tools",
      "UCP validator",
      "UCP playground",
      "AI agent score scan",
      "agent commerce resources",
      "ecentic free tools",
    ],
  });
};

export default async () => {
  const locale = await getLocale();

  const translate = await getTranslations("resources");
  const messages = await getMessages();
  const description = translate("meta.description");
  const assurances = messages.resources.hero.assurances;
  const faq = messages.resources.faq.items;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: translate("collectionName"),
      description,
      url: absoluteUrl(localizePath("/resources", locale)),
    },
    organizationSchema,
    createBreadcrumbSchema([
      { name: translate("breadcrumb.home"), path: localizePath("/", locale) },
      {
        name: translate("breadcrumb.resources"),
        path: localizePath("/resources", locale),
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
          <Button
            color="accent"
            className={bannerAction.lead}
            render={<Link href="/sign-up" />}
          >
            {translate("hero.action.primary")}
            <ArrowRightIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            className={bannerAction.secondary}
            render={<Link href="/ucp-validator" />}
          >
            {translate("hero.action.secondary")}
          </Button>
        </>
      }
    >
      <JsonLd schemas={structuredData} />

      <Tools />

      <Guides />

      <Developer />

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
          href: "/pricing",
          label: translate("footer.action.secondary"),
        }}
        note={translate("footer.note")}
      />
    </ContentPageLayout>
  );
};
