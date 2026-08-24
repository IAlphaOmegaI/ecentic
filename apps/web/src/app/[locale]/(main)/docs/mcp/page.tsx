import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { DOCUMENTED_MCP_TOOLS } from "@/lib/mcp-docs";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/robot.png";
import { Utils } from "@/server/app/mcp/utils";
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
  const translate = await getTranslations("docs.mcpPage");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/docs/mcp", locale),
    keywords: [
      "ecentic MCP server",
      "Model Context Protocol ecommerce",
      "Streamable HTTP MCP",
      "ecentic agent tools",
    ],
  });
};

export default async () => {
  const locale = await getLocale();
  const translate = await getTranslations("docs.mcpPage");
  const translateDocs = await getTranslations("docs");
  const messages = await getMessages();
  const content = messages.docs.mcpPage;

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
            url: absoluteUrl(localizePath("/docs/mcp", locale)),
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
              name: translateDocs("breadcrumb.mcp"),
              path: localizePath("/docs/mcp", locale),
            },
          ]),
        ]}
      />

      <ContentPageSection
        number={translate("connect.number")}
        title={translate("connect.title")}
        description={translate("connect.description")}
      >
        <div className="flex flex-col gap-6">
          <DocsCode label="POST https://ecentic.ai/mcp">
            {`Content-Type: application/json
Accept: application/json, text/event-stream

{"jsonrpc":"2.0","id":1,"method":"tools/list"}`}
          </DocsCode>
          <ContentPageRichText content={translate("connect.body")} />
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("handshake.number")}
        title={translate("handshake.title")}
        description={translate("handshake.description")}
        gutter
      >
        <div className="flex flex-col gap-6">
          <DocsCode label={translate("handshake.supported")}>
            {Utils.protocol.supportedVersions.join(", ")}
          </DocsCode>
          <ContentPageRichText content={translate("handshake.body")} />
          <DocsCode>
            {`→ {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"${Utils.protocol.version}"}}
← 200 {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"${Utils.protocol.version}", ...}}

→ {"jsonrpc":"2.0","method":"notifications/initialized"}
← 202 (no body)`}
          </DocsCode>
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("tools.number")}
        title={translate("tools.title")}
        description={translate("tools.description")}
      >
        <DocsTable
          columns={[
            translate("tools.columns.tool"),
            translate("tools.columns.authentication"),
            translate("tools.columns.summary"),
          ]}
          rows={DOCUMENTED_MCP_TOOLS.map((tool) => ({
            key: tool.name,
            cells: [
              { content: tool.name, mono: true },
              {
                content: tool.authenticated
                  ? translate("tools.bearer")
                  : translate("tools.none"),
                mono: true,
              },
              { content: translate(`tools.items.${tool.summary}`) },
            ],
          }))}
        />
      </ContentPageSection>

      <ContentPageSection
        number={translate("authentication.number")}
        title={translate("authentication.title")}
        description={translate("authentication.description")}
        gutter
      >
        <div className="flex flex-col gap-6">
          <DocsCode>{"Authorization: Bearer ecentic_sk_…"}</DocsCode>
          <ContentPageRichText content={translate("authentication.body")} />
          <Button
            color="accent"
            className="w-fit"
            render={<Link href="/docs/authentication" />}
          >
            {translate("authentication.linkLabel")}
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("errors.number")}
        title={translate("errors.title")}
        description={translate("errors.description")}
      >
        <ContentPageRichText content={translate("errors.body")} />
      </ContentPageSection>

      <ContentPageFooter
        note={translate("footer.note")}
        primary={{
          href: "/docs/errors",
          label: translateDocs("breadcrumb.errors"),
        }}
        secondary={{ href: "/docs", label: translateDocs("breadcrumb.docs") }}
      />
    </ContentPageLayout>
  );
};
