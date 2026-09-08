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
import Art from "@/public/images/ascii/scale.png";
import { POLICIES, PUBLIC_API_POLICY } from "@/server/utils/rate-limit";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageRichText,
  ContentPageSection,
} from "../../_components/content";
import { bannerAction } from "../../_components/page-banner";
import { DocsCode, DocsTable } from "../_components/docs";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("docs.rateLimitsPage");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/docs/rate-limits", locale),
    keywords: [
      "ecentic API rate limits",
      "ecentic RateLimit headers",
      "Retry-After",
      "agent self-throttling",
    ],
  });
};

/** Header names and sample values, paired with translated meanings by index. */
const HEADERS = [
  { name: "RateLimit-Policy", example: '"public";q=120;w=60' },
  { name: "RateLimit", example: '"public";r=118;t=42' },
  { name: "RateLimit-Limit", example: "120" },
  { name: "RateLimit-Remaining", example: "118" },
  { name: "RateLimit-Reset", example: "42" },
  { name: "Retry-After", example: "42" },
] as const;

export default async () => {
  const locale = await getLocale();
  const translate = await getTranslations("docs.rateLimitsPage");
  const translateDocs = await getTranslations("docs");
  const messages = await getMessages();
  const content = messages.docs.rateLimitsPage;

  // Rendered from the policies the limiter actually enforces, so an endpoint
  // metered below the shared default cannot be documented as if it were not.
  const policy = POLICIES.map(
    ({ limit, window, name, scope }) =>
      `${limit} requests / ${window}s · policy "${name}" · ${scope}`,
  ).join("\n");

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
            url: absoluteUrl(localizePath("/docs/rate-limits", locale)),
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
              name: translateDocs("breadcrumb.rateLimits"),
              path: localizePath("/docs/rate-limits", locale),
            },
          ]),
        ]}
      />

      <ContentPageSection
        number={translate("policy.number")}
        title={translate("policy.title")}
        description={translate("policy.description")}
      >
        <div className="flex flex-col gap-6">
          <DocsCode>{policy}</DocsCode>
          <ContentPageRichText content={translate("policy.body")} />
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("headers.number")}
        title={translate("headers.title")}
        description={translate("headers.description")}
        gutter
      >
        <div className="flex flex-col gap-6">
          <ContentPageRichText content={translate("headers.body")} />
          <DocsTable
            columns={[
              translate("headers.columns.header"),
              translate("headers.columns.example"),
              translate("headers.columns.meaning"),
            ]}
            rows={HEADERS.map((header, index) => ({
              key: header.name,
              cells: [
                { content: header.name, mono: true },
                { content: header.example, mono: true },
                { content: content.headers.items[index]?.meaning ?? "" },
              ],
            }))}
          />
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("exceeded.number")}
        title={translate("exceeded.title")}
        description={translate("exceeded.description")}
      >
        <div className="flex flex-col gap-6">
          <ContentPageRichText content={translate("exceeded.body")} />
          <DocsCode>
            {`HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json; charset=utf-8
RateLimit-Policy: "${PUBLIC_API_POLICY.name}";q=${PUBLIC_API_POLICY.limit};w=${PUBLIC_API_POLICY.window}
Retry-After: 42

{ "code": "rate-limited", "status": 429, "detail": "Exceeded ${PUBLIC_API_POLICY.limit} requests per ${PUBLIC_API_POLICY.window}s on the \\"${PUBLIC_API_POLICY.name}\\" policy." }`}
          </DocsCode>
        </div>
      </ContentPageSection>

      <ContentPageFooter
        primary={{
          href: "/docs/versioning",
          label: translateDocs("breadcrumb.versioning"),
        }}
        secondary={{ href: "/docs", label: translateDocs("breadcrumb.docs") }}
      />
    </ContentPageLayout>
  );
};
