import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/json-ld";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import {
  MarketingEdgeCrosses,
  MarketingLightBand,
} from "@/components/marketing/light-band";
import { Plus } from "@/components/plus";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
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
import {
  AuthPathDetails,
  AuthRequestPaths,
} from "./_components/auth-request-paths";

const AuthPath = ({
  client,
  credential,
  destination,
  title,
  description,
  details,
  body,
  children,
}: {
  client: string;
  credential: string;
  destination: string;
  title: string;
  description: string;
  details: string;
  body: string;
  children: ReactNode;
}) => (
  <div className="relative grid min-w-0 gap-px bg-accent-foreground md:grid-cols-[4fr_8fr]">
    <div className="relative flex min-w-0 flex-col bg-background-dimmed">
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-md:hidden" />
      <div className="flex flex-1 flex-col items-center px-4 py-6">
        <p className="text-foreground-dimmed text-sm">{client}</p>
        <div className="my-4 aspect-[5/4] w-full max-w-80">
          <CommerceFigure
            kind="relay"
            surface="field"
            className="h-full w-full"
          />
        </div>
        <div
          aria-hidden="true"
          className="h-8 border-accent-foreground border-l"
        />
        <p className="text-center font-medium text-foreground">{credential}</p>
        <div
          aria-hidden="true"
          className="h-8 border-accent-foreground border-l"
        />
      </div>
      <div className="relative border-accent-foreground border-t">
        <MarketingEdgeCrosses />
        <p className="px-6 py-4 text-center text-foreground-rich text-lg">
          {destination}
        </p>
      </div>
    </div>
    <div className="relative flex min-w-0 flex-col bg-background">
      <MarketingEdgeCrosses className="md:hidden" />
      <div className="px-8 py-8 max-sm:px-4">
        <h3 className="text-2xl text-foreground-rich">{title}</h3>
        <p className="mt-2 text-foreground-dimmed">{description}</p>
      </div>
      {children}
      <div className="px-8 py-8 max-sm:px-4">
        <AuthPathDetails label={details}>
          <ContentPageRichText content={body} />
        </AuthPathDetails>
      </div>
    </div>
  </div>
);

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("docs.authenticationPage");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/docs/authentication", locale),
    keywords: [
      "ecentic API key",
      "ecentic authentication",
      "agent API bearer token",
      "ecentic OAuth metadata",
    ],
  });
};

export default async () => {
  const locale = await getLocale();
  const translate = await getTranslations("docs.authenticationPage");
  const translateDocs = await getTranslations("docs");
  const messages = await getMessages();
  const content = messages.docs.authenticationPage;
  const copy = messages.docsAuthenticationPage;

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
            url: absoluteUrl(localizePath("/docs/authentication", locale)),
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
              name: translateDocs("breadcrumb.authentication"),
              path: localizePath("/docs/authentication", locale),
            },
          ]),
        ]}
      />

      <MarketingLightBand aria-labelledby="request-paths">
        <div className="relative min-w-0">
          <div className="border-accent-foreground border-b px-8 py-12 max-sm:px-4 max-sm:py-10">
            <span className="mb-4 block text-3xl text-primary">
              {translate("open.number")}
            </span>
            <h2 id="request-paths" className="text-foreground-rich">
              {copy.paths.title}
            </h2>
            <p className="mt-4 max-w-2xl text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
              {copy.paths.description}
            </p>
          </div>
          <AuthRequestPaths
            copy={copy.paths}
            open={
              <AuthPath
                client={copy.paths.client}
                credential={copy.paths.noCredential}
                destination={copy.paths.publicDestination}
                title={translate("open.title")}
                description={translate("open.description")}
                details={copy.paths.details}
                body={translate("open.body")}
              >
                <DocsCode label={copy.paths.noCredential}>
                  {`GET  https://ecentic.ai/api/v1
GET  https://ecentic.ai/api/v1/plans
GET  https://ecentic.ai/api/v1/onboarding
POST https://ecentic.ai/api/v1/sandbox/simulation`}
                </DocsCode>
              </AuthPath>
            }
            authenticated={
              <AuthPath
                client={copy.paths.client}
                credential={copy.paths.bearer}
                destination={copy.paths.protectedDestination}
                title={translate("sending.title")}
                description={translate("sending.description")}
                details={copy.paths.details}
                body={translate("sending.body")}
              >
                <DocsCode>
                  {`Authorization: Bearer ecentic_sk_…
Content-Type: application/json`}
                </DocsCode>
              </AuthPath>
            }
          />
        </div>
      </MarketingLightBand>

      <ContentPageSection
        number={translate("keys.number")}
        title={translate("keys.title")}
        description={translate("keys.description")}
        gutter
        classList={{ body: "p-0 max-sm:p-0", left: "bg-background-dimmed" }}
      >
        <ol className="grid gap-px bg-accent-foreground sm:grid-cols-3">
          {copy.keySteps.map((step, index) => (
            <li
              key={step}
              className="flex items-center gap-4 bg-background-dimmed px-6 py-6 sm:flex-col sm:items-start"
            >
              <span aria-hidden="true" className="text-2xl text-primary">
                {index + 1}
              </span>
              <span className="font-medium text-foreground">{step}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col items-start gap-6 border-accent-foreground border-t px-8 py-8 max-sm:px-4">
          <ContentPageRichText content={translate("keys.body")} />
          <Button
            color="neutral"
            render={<a href="/auth.md">{translate("keys.linkLabel")}</a>}
          />
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("sending.number")}
        title={translate("failures.title")}
        description={translate("failures.description")}
        gutter
        classList={{
          grid: "md:grid-cols-1",
          left: "pb-8 max-sm:pb-6",
          body: "p-0 max-sm:p-0",
        }}
      >
        <ol
          aria-label={copy.recovery.label}
          className="grid gap-px bg-accent-foreground sm:grid-cols-3"
        >
          {[
            { code: "HTTP 401", label: copy.recovery.response },
            { code: "RFC 9728", label: copy.recovery.resource },
            { code: "RFC 8414", label: copy.recovery.authorization },
          ].map((step, index) => (
            <li
              key={step.code}
              className="relative flex min-w-0 flex-col gap-2 bg-background-dimmed px-8 py-6 max-sm:px-4"
            >
              <span className="font-mono text-base text-foreground-rich">
                {step.code}
              </span>
              <span className="text-foreground-dimmed">{step.label}</span>
              {index < 2 && (
                <span
                  aria-hidden="true"
                  className="absolute right-4 bottom-0 translate-y-1/2 text-foreground-dimmed sm:top-1/2 sm:right-0 sm:bottom-auto sm:translate-x-1/2 sm:-translate-y-1/2"
                >
                  <ArrowRightIcon className="size-4 rotate-90 sm:rotate-0" />
                </span>
              )}
            </li>
          ))}
        </ol>
        <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground lg:grid-cols-[7fr_5fr]">
          <div className="flex min-w-0 bg-background">
            <DocsCode edges="none" className="flex-1" label="401">
              {`WWW-Authenticate: Bearer resource_metadata="https://ecentic.ai/.well-known/oauth-protected-resource"
Content-Type: application/problem+json

{"type":"https://ecentic.ai/docs/errors#unauthenticated","code":"unauthenticated", ...}`}
            </DocsCode>
          </div>
          <div className="bg-background px-8 py-8 max-sm:px-4">
            <ContentPageRichText content={translate("failures.body")} />
          </div>
        </div>
      </ContentPageSection>

      <ContentPageFooter
        note={translate("footer.note")}
        primary={{ href: "/docs/mcp", label: translateDocs("breadcrumb.mcp") }}
        secondary={{ href: "/docs", label: translateDocs("breadcrumb.docs") }}
      />
    </ContentPageLayout>
  );
};
