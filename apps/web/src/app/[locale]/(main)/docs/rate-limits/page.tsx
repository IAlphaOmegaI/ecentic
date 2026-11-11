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
import { POLICIES, PUBLIC_API_POLICY } from "@/server/utils/rate-limit";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageRichText,
  ContentPageSection,
} from "../../_components/content";
import { DocsCode } from "../_components/docs";
import { LimitsHeaders } from "./_components/limits-headers";
import { LimitsSection } from "./_components/limits-section";

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
  const translateLimits = await getTranslations("docsLimitsPage");
  const messages = await getMessages();
  const content = messages.docs.rateLimitsPage;
  const copy = messages.docsLimitsPage;

  // Rendered from the policies the limiter actually enforces, so an endpoint
  // metered below the shared default cannot be documented as if it were not.
  const policy = POLICIES.map(
    ({ limit, window, name, scope }) =>
      `${limit} requests / ${window}s · policy "${name}" · ${scope}`,
  ).join("\n");

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

      <LimitsSection
        number={translate("policy.number")}
        title={translate("policy.title")}
        description={translate("policy.description")}
      >
        <div className="grid gap-px bg-accent-foreground md:grid-cols-[3fr_2fr]">
          <dl className="flex min-w-0 flex-col gap-px bg-accent-foreground">
            {POLICIES.map((item) => (
              <div
                key={item.name}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 bg-background-dimmed px-8 py-8 max-sm:px-4"
              >
                <dt className="min-w-0">
                  <code className="font-mono text-primary-text text-sm">
                    {item.name}
                  </code>
                  <p className="wrap-anywhere mt-2 text-foreground-dimmed text-sm">
                    {item.name === PUBLIC_API_POLICY.name
                      ? copy.publicScope
                      : item.scope}
                  </p>
                </dt>
                <dd className="shrink-0">
                  <p className="flex items-baseline gap-2">
                    <span className="font-medium text-4xl text-foreground-rich tabular-nums tracking-tight">
                      {item.limit}
                    </span>
                    <span className="text-foreground-dimmed text-sm">
                      {copy.requests}
                    </span>
                  </p>
                  <p className="mt-2 text-foreground-dimmed text-sm">
                    {translateLimits("window", {
                      seconds: String(item.window),
                    })}
                  </p>
                </dd>
              </div>
            ))}
          </dl>
          <div className="min-w-0 bg-background px-8 py-8 max-sm:px-4">
            <ContentPageRichText content={translate("policy.body")} />
          </div>
        </div>
        <div className="border-accent-foreground border-t bg-background px-8 py-8 max-sm:px-4">
          <DocsCode label={copy.policySource}>{policy}</DocsCode>
        </div>
      </LimitsSection>

      <ContentPageSection
        number={translate("headers.number")}
        title={translate("headers.title")}
        description={translate("headers.description")}
        gutter
        classList={{ body: "p-0 max-sm:p-0" }}
      >
        <div className="border-accent-foreground border-b px-6 py-8 max-sm:px-4">
          <ContentPageRichText content={translate("headers.body")} />
          <p className="mt-6 text-foreground-dimmed text-sm leading-relaxed">
            {copy.headerHint}
          </p>
        </div>
        <LimitsHeaders
          columns={content.headers.columns}
          items={HEADERS.map((header, index) => ({
            ...header,
            meaning: content.headers.items[index]?.meaning ?? "",
          }))}
        />
        <div className="border-accent-foreground border-t bg-background px-6 py-8 max-sm:px-4">
          <h3 className="text-xl">{copy.windowTitle}</h3>
          <p className="mt-2 text-foreground-dimmed text-sm leading-relaxed">
            {copy.windowHint}
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <dt className="text-foreground-dimmed text-sm">
                {copy.remaining}
              </dt>
              <dd className="mt-2 font-medium text-3xl text-foreground-rich tabular-nums">
                118
              </dd>
              <dd className="wrap-anywhere mt-2 font-mono text-foreground-dimmed text-xs">
                r=118 · RateLimit-Remaining
              </dd>
            </div>
            <div>
              <dt className="text-foreground-dimmed text-sm">{copy.reset}</dt>
              <dd className="mt-2 font-medium text-3xl text-foreground-rich tabular-nums">
                42
              </dd>
              <dd className="wrap-anywhere mt-2 font-mono text-foreground-dimmed text-xs">
                t=42 · RateLimit-Reset
              </dd>
            </div>
          </dl>
        </div>
      </ContentPageSection>

      <LimitsSection
        number={translate("exceeded.number")}
        title={translate("exceeded.title")}
        description={translate("exceeded.description")}
      >
        <div className="px-8 py-8 max-sm:px-4">
          <ContentPageRichText content={translate("exceeded.body")} />
        </div>
        <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[2fr_1fr]">
          <div className="min-w-0 bg-background px-8 py-8 max-sm:px-4">
            <DocsCode label={copy.responseExample}>
              {`HTTP/1.1 429 Too Many Requests
Content-Type: application/problem+json; charset=utf-8
RateLimit-Policy: "${PUBLIC_API_POLICY.name}";q=${PUBLIC_API_POLICY.limit};w=${PUBLIC_API_POLICY.window}
Retry-After: 42

{ "code": "rate-limited", "status": 429, "detail": "Exceeded ${PUBLIC_API_POLICY.limit} requests per ${PUBLIC_API_POLICY.window}s on the \\"${PUBLIC_API_POLICY.name}\\" policy." }`}
            </DocsCode>
          </div>
          <aside className="bg-background-dimmed px-8 py-8 max-sm:px-4">
            <h3 className="text-2xl text-foreground-rich">{copy.retryTitle}</h3>
            <p className="mt-6 font-medium text-5xl text-foreground-rich tabular-nums tracking-tight">
              42<span className="ml-2 text-2xl text-foreground-dimmed">s</span>
            </p>
            <p className="mt-2 text-foreground-dimmed text-sm">
              {copy.retryLabel}
            </p>
            <p className="mt-6 text-foreground-dimmed text-sm leading-relaxed">
              {copy.retryHint}
            </p>
          </aside>
        </div>
      </LimitsSection>

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
