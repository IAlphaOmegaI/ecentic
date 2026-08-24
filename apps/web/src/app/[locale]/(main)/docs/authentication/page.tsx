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

      <ContentPageSection
        number={translate("open.number")}
        title={translate("open.title")}
        description={translate("open.description")}
      >
        <div className="flex flex-col gap-6">
          <DocsCode label="no credential required">
            {`GET  https://ecentic.ai/api/v1
GET  https://ecentic.ai/api/v1/plans
GET  https://ecentic.ai/api/v1/onboarding
POST https://ecentic.ai/api/v1/sandbox/simulation`}
          </DocsCode>
          <ContentPageRichText content={translate("open.body")} />
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("keys.number")}
        title={translate("keys.title")}
        description={translate("keys.description")}
        gutter
      >
        <div className="flex flex-col gap-6">
          <ContentPageRichText content={translate("keys.body")} />
          <Button
            color="accent"
            className="w-fit"
            render={<a href="/auth.md">{translate("keys.linkLabel")}</a>}
          />
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("sending.number")}
        title={translate("sending.title")}
        description={translate("sending.description")}
      >
        <div className="flex flex-col gap-6">
          <DocsCode>
            {`Authorization: Bearer ecentic_sk_…
Content-Type: application/json`}
          </DocsCode>
          <ContentPageRichText content={translate("sending.body")} />
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("failures.number")}
        title={translate("failures.title")}
        description={translate("failures.description")}
        gutter
      >
        <div className="flex flex-col gap-6">
          <DocsCode label="401">
            {`WWW-Authenticate: Bearer resource_metadata="https://ecentic.ai/.well-known/oauth-protected-resource"
Content-Type: application/problem+json

{"type":"https://ecentic.ai/docs/errors#unauthenticated","code":"unauthenticated", ...}`}
          </DocsCode>
          <ContentPageRichText content={translate("failures.body")} />
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
