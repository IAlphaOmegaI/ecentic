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
import { PROBLEMS } from "@/server/utils/problem";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageRichText,
  ContentPageSection,
} from "../../_components/content";
import { DocsCode } from "../_components/docs";
import { ErrorsExplorer } from "./_components/errors-explorer";

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
  const copy = messages.docsErrorsPage;

  return (
    <ContentPageLayout
      compact
      title={translate("hero.title")}
      accent={translate("hero.accent")}
      description={translate("hero.description")}
      assurances={content.hero.assurances}
      actions={
        <Button color="primary" render={<Link href="/docs" />}>
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
        classList={{
          grid: "md:grid-cols-1",
          left: "py-10 max-sm:py-8",
          body: "p-0 max-sm:p-0",
        }}
      >
        <div className="grid gap-px bg-accent-foreground lg:grid-cols-[4fr_8fr]">
          <div className="flex flex-col gap-6 bg-background-dimmed p-8 max-sm:p-4">
            <p className="font-mono text-primary-text text-sm">
              application/problem+json
            </p>
            <ContentPageRichText
              content={content.shape.body.split("\n\n")[0] ?? ""}
            />
          </div>
          <div className="min-w-0 bg-background p-8 max-sm:p-4">
            <DocsCode label={copy.example}>{example}</DocsCode>
          </div>
        </div>
        <div className="border-accent-foreground border-t px-8 py-4 max-sm:px-4">
          <h3 className="text-base text-foreground">{copy.fields}</h3>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-accent-foreground lg:grid-cols-4">
          {copy.fieldItems.map((field) => (
            <div
              key={field.name}
              className="flex flex-col gap-2 bg-background-dimmed px-8 py-6 max-sm:px-4"
            >
              <dt className="font-mono text-primary-text text-sm">
                {field.name}
              </dt>
              <dd className="text-foreground-dimmed text-sm leading-relaxed">
                {field.description}
              </dd>
            </div>
          ))}
        </dl>
      </ContentPageSection>

      <ContentPageSection
        number={translate("catalogue.number")}
        title={translate("catalogue.title")}
        description={translate("catalogue.description")}
        gutter
        classList={{
          grid: "md:grid-cols-1",
          left: "py-10 max-sm:py-8",
          body: "p-0 max-sm:p-0",
        }}
      >
        <ErrorsExplorer
          copy={copy.catalogue}
          problems={Object.entries(PROBLEMS).map(([code, problem]) => ({
            code,
            ...problem,
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
