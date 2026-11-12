import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { API_VERSION, DEPRECATION_NOTICE_DAYS } from "@/lib/agent-api";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageRichText,
  ContentPageSection,
} from "../../_components/content";
import { DocsCode } from "../_components/docs";
import { VersioningLifecycle } from "./_components/versioning-lifecycle";
import { VersioningSection } from "./_components/versioning-section";

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
  const copy = messages.docsVersioningPage;
  const strategy = content.strategy.body.split(/\n\n+/);
  const deprecation = content.deprecation.body.split(/\n\n+/);

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

      <VersioningSection
        featureTone="light"
        number={translate("strategy.number")}
        title={translate("strategy.title")}
        description={translate("strategy.description")}
      >
        <div className="grid gap-px bg-accent-foreground md:grid-cols-[1fr_2fr]">
          <aside className="flex min-w-0 flex-col bg-background-dimmed px-8 py-8 max-sm:px-4">
            <p className="text-foreground-dimmed text-sm">{copy.current}</p>
            <p className="mt-4 text-7xl text-foreground-rich tracking-tight">
              v{API_VERSION}
            </p>
            <div className="mx-auto mt-6 aspect-[5/4] w-full max-w-64">
              <CommerceFigure
                kind="format"
                surface="field"
                className="h-full w-full"
              />
            </div>
          </aside>
          <div className="flex min-w-0 flex-col bg-background">
            <DocsCode edges="bottom" className="flex-1" label={copy.request}>
              {`GET https://ecentic.ai/api/v${API_VERSION}/discovery
API-Version: ${API_VERSION}`}
            </DocsCode>
            <div className="px-8 py-8 max-sm:px-4">
              <ContentPageRichText content={strategy[0] ?? ""} />
            </div>
          </div>
        </div>
        <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
          {[copy.additive, copy.breaking].map((title, index) => (
            <div key={title} className="bg-background px-8 py-8 max-sm:px-4">
              <h3 className="mb-4 text-2xl text-foreground-rich">{title}</h3>
              <ContentPageRichText content={strategy[index + 1] ?? ""} />
            </div>
          ))}
        </div>
      </VersioningSection>

      <VersioningSection
        number={translate("deprecation.number")}
        title={translate("deprecation.title")}
        description={translate("deprecation.description")}
        gutter
      >
        <div className="grid gap-px bg-accent-foreground md:grid-cols-[1fr_2fr]">
          <aside className="bg-background-dimmed px-8 py-8 max-sm:px-4">
            <p className="text-foreground-dimmed text-sm">{copy.notice}</p>
            <p className="mt-4 flex items-baseline gap-2 text-foreground-rich">
              <span className="text-7xl tabular-nums tracking-tight">
                {DEPRECATION_NOTICE_DAYS}
              </span>
              <span className="text-xl">{copy.days}</span>
            </p>
            <div className="mt-6">
              <ContentPageRichText content={deprecation[1] ?? ""} />
            </div>
          </aside>
          <div className="min-w-0 bg-background">
            <VersioningLifecycle copy={copy.lifecycle} />
          </div>
        </div>
        <div>
          <DocsCode label={copy.example}>
            {`Deprecation: @1780272000
Sunset: Sat, 01 Aug 2026 00:00:00 GMT
Link: <https://ecentic.ai/api/v2>; rel="successor-version"`}
          </DocsCode>
          <p className="px-8 py-6 text-foreground-dimmed text-sm leading-relaxed max-sm:px-4">
            {copy.exampleHint}
          </p>
        </div>
      </VersioningSection>

      <ContentPageSection
        number={translate("support.number")}
        title={translate("support.title")}
        description={translate("support.description")}
        classList={{ left: "bg-background-dimmed" }}
      >
        <div className="flex flex-col gap-8">
          <ContentPageRichText content={translate("support.body")} />
          <dl className="grid grid-cols-1 gap-6 border-accent-foreground border-t pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-foreground-dimmed text-sm">
                {copy.apiContract}
              </dt>
              <dd className="mt-2 font-mono text-sm">/api/v{API_VERSION}</dd>
              <dd className="mt-2 font-mono text-foreground-dimmed text-xs">
                API-Version: {API_VERSION}
              </dd>
            </div>
            <div>
              <dt className="text-foreground-dimmed text-sm">
                {copy.protocolContract}
              </dt>
              <dd className="mt-2 font-mono text-sm">.well-known</dd>
              <dd className="mt-2 text-foreground-dimmed text-sm">
                {copy.protocolVersion}
              </dd>
            </div>
          </dl>
        </div>
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
