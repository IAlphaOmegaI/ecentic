import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { DOCUMENTED_MCP_TOOLS } from "@/lib/mcp-docs";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import { Utils } from "@/server/app/mcp/utils";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageRichText,
} from "../../_components/content";
import { DocsCode, DocsTable } from "../_components/docs";
import { McpHandshake } from "./_components/mcp-handshake";
import { McpSection } from "./_components/mcp-section";
import { McpTransport } from "./_components/mcp-transport";

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
  const copy = messages.docsMcpPage;

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

      <McpSection
        featureTone="light"
        id="connect"
        number={translate("connect.number")}
        title={translate("connect.title")}
        description={translate("connect.description")}
      >
        <div className="grid gap-px bg-accent-foreground md:grid-cols-[4fr_7fr]">
          <div className="flex min-w-0 flex-col justify-between gap-8 bg-background-dimmed p-8 max-sm:p-4">
            <div>
              <p className="font-medium text-foreground">
                {copy.transport.label}
              </p>
              <div className="mx-auto mt-4 aspect-[5/4] w-full max-w-80">
                <CommerceFigure
                  kind="hub"
                  surface="field"
                  className="h-full w-full"
                />
              </div>
            </div>
            <dl className="grid gap-6">
              <div>
                <dt className="text-foreground-dimmed text-sm">
                  {copy.transport.endpoint}
                </dt>
                <dd className="wrap-anywhere mt-2 font-mono text-foreground text-sm">
                  POST https://ecentic.ai/mcp
                </dd>
              </div>
              <div>
                <dt className="text-foreground-dimmed text-sm">
                  {copy.transport.alias}
                </dt>
                <dd className="wrap-anywhere mt-2 font-mono text-foreground text-sm">
                  POST https://ecentic.ai/api/mcp
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex min-w-0 flex-col gap-6 bg-background p-8 max-sm:p-4">
            <DocsCode label="POST https://ecentic.ai/mcp">
              {`Content-Type: application/json
Accept: application/json, text/event-stream

{"jsonrpc":"2.0","id":1,"method":"tools/list"}`}
            </DocsCode>
            <McpTransport
              labels={copy.transport.details}
              details={content.connect.body
                .split(/\n\n+/)
                .map((paragraph) => (
                  <ContentPageRichText key={paragraph} content={paragraph} />
                ))}
            />
          </div>
        </div>
      </McpSection>

      <McpSection
        id="handshake"
        number={translate("handshake.number")}
        title={translate("handshake.title")}
        description={translate("handshake.description")}
        gutter
      >
        <McpHandshake
          copy={copy.handshake}
          details={content.handshake.body
            .split(/\n\n+/)
            .map((paragraph) => (
              <ContentPageRichText key={paragraph} content={paragraph} />
            ))}
          example={
            <DocsCode label={copy.handshake.example}>
              {`→ {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"${Utils.protocol.version}"}}
← 200 {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"${Utils.protocol.version}", ...}}

→ {"jsonrpc":"2.0","method":"notifications/initialized"}
← 202 (no body)`}
            </DocsCode>
          }
        />
        <div className="border-accent-foreground border-t p-8 max-sm:p-4">
          <DocsCode label={translate("handshake.supported")}>
            {Utils.protocol.supportedVersions.join(", ")}
          </DocsCode>
        </div>
      </McpSection>

      <McpSection
        id="tools"
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
              },
              { content: translate(`tools.items.${tool.summary}`) },
            ],
          }))}
        />
      </McpSection>

      <McpSection
        id="authentication"
        number={translate("authentication.number")}
        title={translate("authentication.title")}
        description={translate("authentication.description")}
        gutter
      >
        <div className="grid gap-px bg-accent-foreground md:grid-cols-2">
          {content.authentication.body
            .split(/\n\n+/)
            .map((paragraph, index) => (
              <div
                key={paragraph}
                className="flex min-w-0 flex-col gap-6 bg-background-dimmed p-8 last:bg-background max-sm:p-4"
              >
                <h3 className="text-xl">
                  {index === 0
                    ? copy.authentication.credential
                    : copy.authentication.create}
                </h3>
                {index === 0 && (
                  <DocsCode>{"Authorization: Bearer ecentic_sk_…"}</DocsCode>
                )}
                <ContentPageRichText content={paragraph} />
                {index === 1 && (
                  <div className="mt-auto">
                    <Button
                      color="neutral"
                      render={<Link href="/docs/authentication" />}
                    >
                      {translate("authentication.linkLabel")}
                      <ArrowRightIcon className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
        </div>
      </McpSection>

      <McpSection
        id="errors"
        number={translate("errors.number")}
        title={translate("errors.title")}
        description={translate("errors.description")}
      >
        <div className="grid gap-px bg-accent-foreground">
          {content.errors.body.split(/\n\n+/).map((paragraph, index) => (
            <div
              key={paragraph}
              className="grid gap-px bg-accent-foreground md:grid-cols-[4fr_7fr]"
            >
              <div className="min-w-0 bg-background-dimmed p-8 max-sm:p-4">
                <h3 className="text-xl">{copy.errors.labels[index]}</h3>
                <p className="wrap-anywhere mt-4 font-mono text-foreground-dimmed text-xs">
                  {copy.errors.formats[index]}
                </p>
              </div>
              <div className="min-w-0 bg-background p-8 max-sm:p-4">
                <ContentPageRichText content={paragraph} />
              </div>
            </div>
          ))}
        </div>
      </McpSection>

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
