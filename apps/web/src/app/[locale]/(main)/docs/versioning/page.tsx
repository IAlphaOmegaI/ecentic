import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { API_VERSION, DEPRECATION_NOTICE_DAYS } from "@/lib/agent-api";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/calendar.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageRichText,
  ContentPageSection,
} from "../../_components/content";
import { bannerAction } from "../../_components/page-banner";
import { DocsCode } from "../_components/docs";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("docs.versioningPage");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/docs/versioning", locale),
    keywords: [
      "ecentic API versioning",
      "ecentic deprecation policy",
      "Sunset header",
      "Deprecation header",
    ],
  });
};

export default async () => {
  const locale = await getLocale();
  const translate = await getTranslations("docs.versioningPage");
  const translateDocs = await getTranslations("docs");
  const messages = await getMessages();
  const content = messages.docs.versioningPage;

  return (
    <ContentPageLayout
      title={translate("hero.title")}
      accent={translate("hero.accent")}
      description={translate("hero.description")}
      assurances={content.hero.assurances}
      art={{ source: Art, alt: translate("hero.art.alt") }}
      actions={
        <Button
          color="accent"
          className={bannerAction.lead}
          render={<Link href="/docs" />}
        >
          {translate("hero.action.primary")}
          <ArrowRightIcon className="size-4" />
        </Button>
      }
    >
      <JsonLd
        schemas={[
          organizationSchema,
          {
            "@context": "https://schema.org",
            "@type": "TechArticle",
            name: translate("meta.title"),
            headline: translate("meta.title"),
            description: translate("meta.description"),
            url: absoluteUrl(localizePath("/docs/versioning", locale)),
            inLanguage: locale,
          },
          createBreadcrumbSchema([
            {
              name: translateDocs("breadcrumb.home"),
              path: localizePath("/", locale),
            },
            {
              name: translateDocs("breadcrumb.docs"),
              path: localizePath("/docs", locale),
            },
            {
              name: translateDocs("breadcrumb.versioning"),
              path: localizePath("/docs/versioning", locale),
            },
          ]),
        ]}
      />

      <ContentPageSection
        number={translate("strategy.number")}
        title={translate("strategy.title")}
        description={translate("strategy.description")}
      >
        <div className="flex flex-col gap-6">
          <DocsCode>
            {`GET https://ecentic.ai/api/v${API_VERSION}/discovery
API-Version: ${API_VERSION}`}
          </DocsCode>
          <ContentPageRichText content={translate("strategy.body")} />
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("deprecation.number")}
        title={translate("deprecation.title")}
        description={translate("deprecation.description")}
        gutter
      >
        <div className="flex flex-col gap-6">
          <ContentPageRichText content={translate("deprecation.body")} />
          <DocsCode label={`minimum notice: ${DEPRECATION_NOTICE_DAYS} days`}>
            {`Deprecation: @1780272000
Sunset: Sat, 01 Aug 2026 00:00:00 GMT
Link: <https://ecentic.ai/api/v2>; rel="successor-version"`}
          </DocsCode>
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("support.number")}
        title={translate("support.title")}
        description={translate("support.description")}
      >
        <ContentPageRichText content={translate("support.body")} />
      </ContentPageSection>

      <ContentPageFooter
        primary={{
          href: "/docs/errors",
          label: translateDocs("breadcrumb.errors"),
        }}
        secondary={{ href: "/docs", label: translateDocs("breadcrumb.docs") }}
      />
    </ContentPageLayout>
  );
};
