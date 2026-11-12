import {
  ArrowRightIcon,
  CommerceBookOpenIcon,
  CommerceCode_3Icon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";
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
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageRichText,
  ContentPageSection,
} from "../_components/content";
import { DocsCode, DocsTable } from "./_components/docs";
import { IndexQuickstart } from "./_components/index-quickstart";
import {
  IndexQuickstartSkeleton,
  IndexSection,
} from "./_components/index-section";

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

const Quickstart = async () => {
  const { docs, docsIndexPage } = await getMessages();

  return (
    <IndexQuickstart
      content={docs.quickstart}
      copy={docsIndexPage.quickstart}
      examples={QUICKSTART.map((snippet, index) => (
        <DocsCode
          key={snippet}
          label={docs.quickstart.steps[index]?.title}
          className="bg-transparent"
        >
          {snippet}
        </DocsCode>
      ))}
    />
  );
};

export default async () => {
  const locale = await getLocale();
  const translate = await getTranslations("docs");
  const messages = await getMessages();
  const content = messages.docs;
  const copy = messages.docsIndexPage;
  const discovery = discoveryIndex();

  return (
    <ContentPageLayout
      compact
      title={translate("hero.title")}
      accent={translate("hero.accent")}
      description={translate("hero.description")}
      assurances={content.hero.assurances}
      actions={
        <>
          <Button color="primary" render={<a href="/openapi.json" />}>
            {translate("hero.action.primary")}
            <ArrowRightIcon className="size-4" />
          </Button>
          <Button color="neutral" render={<a href="/auth.md" />}>
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

      <nav
        aria-label={copy.navigation}
        className="border-accent-foreground border-b"
      >
        <div className="mx-auto grid w-[min(1186px,calc(100%-56px))] grid-cols-2 gap-px border-accent-foreground border-x bg-accent-foreground max-sm:w-[calc(100%-32px)] md:grid-cols-4">
          {[
            {
              href: "#quickstart",
              label: content.quickstart.title,
              Icon: CommerceBookOpenIcon,
            },
            {
              href: "#endpoints",
              label: content.endpoints.title,
              Icon: CommerceCode_3Icon,
            },
            {
              href: "#protocols",
              label: content.protocols.title,
              Icon: CommercePlug_3SparkleIcon,
            },
            {
              href: "#reliability",
              label: content.reliability.title,
              Icon: CommerceFileShieldIcon,
            },
          ].map(({ href, label, Icon }) => (
            <a
              key={href}
              href={href}
              className="group grid min-w-0 grid-cols-[1fr_auto] grid-rows-[2.5rem_1fr] items-end gap-x-4 gap-y-6 bg-background-rich bg-linear-to-br from-primary/12 via-primary/4 to-transparent px-6 py-8 text-foreground hover:from-primary/20 hover:text-primary-text focus-visible:text-primary-text focus-visible:-outline-offset-4 max-sm:px-4"
            >
              <Icon
                aria-hidden
                className="col-span-2 size-10 text-primary-text"
              />
              <span className="font-heading text-xl leading-snug">{label}</span>
              <ArrowRightIcon
                aria-hidden="true"
                className="size-4 shrink-0 rotate-90 text-primary"
              />
            </a>
          ))}
        </div>
      </nav>

      <IndexSection
        featureTone="dark"
        gutter
        id="quickstart"
        number={translate("quickstart.number")}
        title={translate("quickstart.title")}
        description={translate("quickstart.description")}
      >
        <Suspense fallback={<IndexQuickstartSkeleton />}>
          <Quickstart />
        </Suspense>
      </IndexSection>

      <ContentPageSection
        number={translate("authentication.number")}
        title={translate("authentication.title")}
        description={translate("authentication.description")}
        gutter
        classList={{ body: "p-0 max-sm:p-0" }}
      >
        <div className="flex min-w-0 flex-col">
          <div className="px-7 py-8 max-sm:px-4">
            <ContentPageRichText content={translate("authentication.body")} />
          </div>
          <DocsCode label="POST https://ecentic.ai/api/mcp">
            {`curl -s https://ecentic.ai/api/mcp \\
  -H "Authorization: Bearer ecentic_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`}
          </DocsCode>
          <div className="flex flex-wrap gap-4 px-7 py-8 max-sm:px-4">
            <Link
              href="/docs/authentication"
              className="text-primary-text underline-offset-4 hover:underline"
            >
              {translate("breadcrumb.authentication")}
            </Link>
            <a
              href="/auth.md"
              className="text-primary-text underline-offset-4 hover:underline"
            >
              {translate("authentication.linkLabel")}
            </a>
          </div>
        </div>
      </ContentPageSection>

      <IndexSection
        id="endpoints"
        number={translate("endpoints.number")}
        title={translate("endpoints.title")}
        description={translate("endpoints.description")}
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
      </IndexSection>

      <IndexSection
        id="protocols"
        number={translate("protocols.number")}
        title={translate("protocols.title")}
        description={translate("protocols.description")}
        gutter
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
                      className="text-primary-text underline-offset-4 hover:underline"
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
      </IndexSection>

      <IndexSection
        id="reliability"
        number={translate("reliability.number")}
        title={translate("reliability.title")}
        description={translate("reliability.description")}
      >
        <div className="flex flex-col">
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
              <Link
                key={card.title}
                href={href}
                className="group grid min-w-0 grid-cols-[1fr_auto] items-center gap-x-8 gap-y-4 border-accent-foreground border-b bg-background-dimmed px-8 py-8 last:border-b-0 hover:bg-background focus-visible:bg-background max-sm:px-4 md:grid-cols-[3fr_5fr_auto]"
              >
                <div className="min-w-0">
                  <h3 className="text-foreground group-hover:text-primary-text group-focus-visible:text-primary-text">
                    {card.title}
                  </h3>
                  <p className="mt-4 break-all font-mono text-foreground-dimmed text-xs">
                    {copy.contracts[index]}
                  </p>
                </div>
                <p className="col-start-1 text-foreground-dimmed leading-relaxed md:col-start-auto">
                  {card.description}
                </p>
                <ArrowRightIcon
                  aria-hidden="true"
                  className="col-start-2 row-start-1 size-4 text-primary md:col-start-auto md:row-start-auto"
                />
              </Link>
            );
          })}
        </div>
      </IndexSection>

      <ContentPageSection
        number={translate("mcp.number")}
        title={translate("mcp.title")}
        description={translate("mcp.description")}
        gutter
        classList={{ body: "p-0 max-sm:p-0" }}
      >
        <div className="flex flex-col">
          <div className="px-7 py-8 max-sm:px-4">
            <ContentPageRichText content={translate("mcp.body")} />
          </div>
          <DocsCode label="https://ecentic.ai/.well-known/mcp.json">
            {"curl -s https://ecentic.ai/.well-known/mcp.json | jq .transport"}
          </DocsCode>
          <Link
            href="/docs/mcp"
            className="px-7 py-8 text-primary-text underline-offset-4 hover:underline max-sm:px-4"
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
        <div id="webhooks" className="scroll-mt-28">
          <ContentPageRichText content={translate("webhooks.body")} />
        </div>
      </ContentPageSection>

      <ContentPageSection
        number={translate("cli.number")}
        title={translate("cli.title")}
        description={translate("cli.description")}
        gutter
        classList={{ body: "p-0 max-sm:p-0" }}
      >
        <div id="cli" className="flex h-full min-w-0 scroll-mt-28 flex-col">
          <div className="px-7 py-8 max-sm:px-4">
            <ContentPageRichText content={translate("cli.body")} />
          </div>
          <DocsCode edges="top" className="flex-1">
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
