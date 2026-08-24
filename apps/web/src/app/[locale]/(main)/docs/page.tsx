import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { discoveryIndex, V1_ENDPOINTS } from "@/lib/agent-api";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createMetadata,
  organizationSchema,
  seo,
} from "@/lib/seo";
import Art from "@/public/images/ascii/console.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageRichText,
  ContentPageSection,
} from "../_components/content";
import { bannerAction } from "../_components/page-banner";
import { DocsCode, DocsTable } from "./_components/docs";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("docs");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/docs", locale),
    keywords: [
      "ecentic API",
      "ecentic API documentation",
      "ecentic developer docs",
      "ecentic MCP server",
      "ecentic OpenAPI",
      "ecentic CLI",
    ],
  });
};

/** One snippet per translated quickstart step, paired by position. */
const QUICKSTART = [
  "curl -s https://ecentic.ai/api/v1",
  "curl -s https://ecentic.ai/api/v1/discovery",
  "curl -s https://ecentic.ai/api/v1/plans",
] as const;

export default async () => {
  const locale = await getLocale();
  const translate = await getTranslations("docs");
  const messages = await getMessages();
  const content = messages.docs;
  const discovery = discoveryIndex();

  return (
    <ContentPageLayout
      title={translate("hero.title")}
      accent={translate("hero.accent")}
      description={translate("hero.description")}
      assurances={content.hero.assurances}
      art={{ source: Art, alt: translate("hero.art.alt") }}
      actions={
        <>
          <Button
            color="accent"
            className={bannerAction.lead}
            render={<a href="/openapi.json" />}
          >
            {translate("hero.action.primary")}
            <ArrowRightIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            className={bannerAction.secondary}
            render={<a href="/auth.md" />}
          >
            {translate("hero.action.secondary")}
          </Button>
        </>
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
            url: absoluteUrl(localizePath("/docs", locale)),
            inLanguage: locale,
            about: ["ecentic API", "Model Context Protocol", "OpenAPI"],
          },
          createBreadcrumbSchema([
            {
              name: translate("breadcrumb.home"),
              path: localizePath("/", locale),
            },
            {
              name: translate("breadcrumb.docs"),
              path: localizePath("/docs", locale),
            },
          ]),
        ]}
      />

      <ContentPageSection
        number={translate("quickstart.number")}
        title={translate("quickstart.title")}
        description={translate("quickstart.description")}
      >
        <div className="flex flex-col gap-6">
          <p className="text-foreground-dimmed leading-relaxed">
            {translate("quickstart.intro")}
          </p>
          {content.quickstart.steps.map((step, index) => (
            <div key={step.title} className="flex flex-col gap-3">
              <h3 className="font-medium text-foreground text-xl">
                {step.title}
              </h3>
              <p className="text-foreground-dimmed leading-relaxed">
                {step.description}
              </p>
              <DocsCode>{QUICKSTART[index] ?? QUICKSTART[0]}</DocsCode>
            </div>
          ))}
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("authentication.number")}
        title={translate("authentication.title")}
        description={translate("authentication.description")}
        gutter
      >
        <div className="flex flex-col gap-6">
          <ContentPageRichText content={translate("authentication.body")} />
          <DocsCode label="POST https://ecentic.ai/api/mcp">
            {`curl -s https://ecentic.ai/api/mcp \\
  -H "Authorization: Bearer ecentic_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`}
          </DocsCode>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/docs/authentication"
              className="text-primary underline-offset-4 hover:underline"
            >
              {translate("breadcrumb.authentication")}
            </Link>
            <a
              href="/auth.md"
              className="text-primary underline-offset-4 hover:underline"
            >
              {translate("authentication.linkLabel")}
            </a>
          </div>
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("endpoints.number")}
        title={translate("endpoints.title")}
        description={translate("endpoints.description")}
        classList={{ body: "p-0" }}
      >
        <DocsTable
          columns={[
            translate("endpoints.columns.method"),
            translate("endpoints.columns.path"),
            translate("endpoints.columns.authentication"),
            translate("endpoints.columns.summary"),
          ]}
          rows={V1_ENDPOINTS.map((endpoint) => ({
            key: `${endpoint.method} ${endpoint.path}`,
            cells: [
              { content: endpoint.method, mono: true },
              { content: endpoint.path, mono: true },
              {
                content: translate(
                  `endpoints.authentication.${endpoint.authentication}`,
                ),
              },
              { content: endpoint.summary },
            ],
          }))}
        />
      </ContentPageSection>

      <ContentPageSection
        number={translate("protocols.number")}
        title={translate("protocols.title")}
        description={translate("protocols.description")}
        gutter
        classList={{ body: "p-0" }}
      >
        <DocsTable
          columns={[
            translate("protocols.columns.protocol"),
            translate("protocols.columns.version"),
            translate("protocols.columns.endpoint"),
            translate("protocols.columns.manifest"),
          ]}
          rows={discovery.protocols.map((protocol) => {
            const manifest = (
              protocol.manifests[0] ?? protocol.endpoint
            ).replace(seo.host, "");

            return {
              key: protocol.key,
              cells: [
                { content: protocol.name },
                { content: protocol.version, mono: true },
                {
                  content: protocol.endpoint.replace(seo.host, ""),
                  mono: true,
                },
                {
                  content: (
                    <a
                      href={manifest}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {manifest}
                    </a>
                  ),
                  mono: true,
                },
              ],
            };
          })}
        />
      </ContentPageSection>

      <ContentPageSection
        number={translate("reliability.number")}
        title={translate("reliability.title")}
        description={translate("reliability.description")}
      >
        <div className="grid gap-6 md:grid-cols-3">
          {content.reliability.cards.map((card, index) => {
            const href = [
              "/docs/errors",
              "/docs/rate-limits",
              "/docs/versioning",
            ][index] as
              | "/docs/errors"
              | "/docs/rate-limits"
              | "/docs/versioning";

            return (
              <div key={card.title} className="flex flex-col gap-3">
                <h3 className="font-medium text-foreground text-xl">
                  <Link
                    href={href}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {card.title}
                  </Link>
                </h3>
                <p className="text-foreground-dimmed leading-relaxed">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("mcp.number")}
        title={translate("mcp.title")}
        description={translate("mcp.description")}
        gutter
      >
        <div className="flex flex-col gap-6">
          <ContentPageRichText content={translate("mcp.body")} />
          <DocsCode label="https://ecentic.ai/.well-known/mcp.json">
            {"curl -s https://ecentic.ai/.well-known/mcp.json | jq .transport"}
          </DocsCode>
          <Link
            href="/docs/mcp"
            className="text-primary underline-offset-4 hover:underline"
          >
            {translate("breadcrumb.mcp")}
          </Link>
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("webhooks.number")}
        title={translate("webhooks.title")}
        description={translate("webhooks.description")}
      >
        <ContentPageRichText content={translate("webhooks.body")} />
      </ContentPageSection>

      <ContentPageSection
        number={translate("cli.number")}
        title={translate("cli.title")}
        description={translate("cli.description")}
        gutter
      >
        <div className="flex flex-col gap-6">
          <ContentPageRichText content={translate("cli.body")} />
          <DocsCode>
            {`npx @ecentic/cli discovery
npx @ecentic/cli plans
ECENTIC_API_KEY=ecentic_sk_... npx @ecentic/cli mcp tools/list`}
          </DocsCode>
        </div>
      </ContentPageSection>

      <ContentPageFooter note={translate("footer.note")} />
    </ContentPageLayout>
  );
};
