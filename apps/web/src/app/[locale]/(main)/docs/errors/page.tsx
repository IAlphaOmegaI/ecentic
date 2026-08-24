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
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/shield.png";
import { PROBLEMS } from "@/server/utils/problem";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageRichText,
  ContentPageSection,
} from "../../_components/content";
import { bannerAction } from "../../_components/page-banner";
import { DocsAnchor, DocsCode, DocsTable } from "../_components/docs";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("docs.errorsPage");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/docs/errors", locale),
    keywords: [
      "ecentic API errors",
      "ecentic error codes",
      "RFC 9457 problem details",
      "ecentic problem+json",
    ],
  });
};

const example = `HTTP/1.1 404 Not Found
Content-Type: application/problem+json; charset=utf-8

{
  "type": "https://ecentic.ai/docs/errors#not-found",
  "title": "Resource not found",
  "status": 404,
  "code": "not-found",
  "detail": "No ecentic API endpoint at GET /api/v1/widgets.",
  "resolution": "Check the path against the OpenAPI document at /openapi.json or the API catalog at /.well-known/api-catalog.",
  "documentation": "https://ecentic.ai/docs/errors",
  "instance": "/api/v1/widgets"
}`;

export default async () => {
  const locale = await getLocale();
  const translate = await getTranslations("docs.errorsPage");
  const translateDocs = await getTranslations("docs");
  const messages = await getMessages();
  const content = messages.docs.errorsPage;

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
            url: absoluteUrl(localizePath("/docs/errors", locale)),
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
              name: translateDocs("breadcrumb.errors"),
              path: localizePath("/docs/errors", locale),
            },
          ]),
        ]}
      />

      <ContentPageSection
        number={translate("shape.number")}
        title={translate("shape.title")}
        description={translate("shape.description")}
      >
        <div className="flex flex-col gap-6">
          <ContentPageRichText content={translate("shape.body")} />
          <DocsCode>{example}</DocsCode>
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("catalogue.number")}
        title={translate("catalogue.title")}
        description={translate("catalogue.description")}
        gutter
        classList={{ body: "p-0" }}
      >
        <DocsTable
          columns={[
            translate("catalogue.columns.code"),
            translate("catalogue.columns.status"),
            translate("catalogue.columns.title"),
            translate("catalogue.columns.resolution"),
          ]}
          rows={Object.entries(PROBLEMS).map(([code, problem]) => ({
            key: code,
            cells: [
              {
                content: <DocsAnchor id={code}>{code}</DocsAnchor>,
                mono: true,
              },
              { content: String(problem.status), mono: true },
              { content: problem.title },
              { content: problem.resolution },
            ],
          }))}
        />
      </ContentPageSection>

      <ContentPageFooter
        primary={{
          href: "/docs/rate-limits",
          label: translateDocs("breadcrumb.rateLimits"),
        }}
        secondary={{ href: "/docs", label: translateDocs("breadcrumb.docs") }}
      />
    </ContentPageLayout>
  );
};
