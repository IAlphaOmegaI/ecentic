import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import { MarketingShell } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingFeatureBand,
  MarketingHero,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { absoluteUrl, createMetadata } from "@/lib/seo";
import { ContentPageSection } from "../_components/content";
import { SectionGutter } from "../dashboard/_components/grid";
import { Faq } from "../pricing/_components/faq";
import { Scanner } from "./_components/scanner";
import { ScannerChecks } from "./_components/scanner-checks";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("webmcpScanner");
  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/webmcp-scanner", locale),
    keywords: [
      "WebMCP scanner",
      "WebMCP tools",
      "storefront WebMCP",
      "modelContext",
    ],
  });
};

export default async () => {
  const locale = await getLocale();
  const translate = await getTranslations("webmcpScanner");
  const messages = await getMessages();

  return (
    <MarketingShell>
      <MarketingHero
        dark
        figure="document"
        title={`${translate("hero.title")} ${translate("hero.accent")}`}
        description={translate("hero.description")}
        actionsSlot={
          <Button color="primary" render={<Link href="#scan" />}>
            {translate("hero.action.primary")}
            <ArrowRightIcon className="size-4" />
          </Button>
        }
      >
        <p className="mt-6 text-background-rich/75 text-sm">
          {messages.webmcpScanner.hero.assurances.join(" · ")}
        </p>
        <div className="mt-8 border-background-rich/20 border-t pt-6">
          <p className="font-medium text-background-rich">
            {messages.webmcpPage.scope.title}
          </p>
          <p className="mt-2 max-w-[50ch] text-background-rich/70 text-sm leading-relaxed">
            {messages.webmcpPage.scope.description}
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-6">
            <div className="flex items-baseline gap-3">
              <dt className="order-2 text-background-rich/75 text-sm">
                {messages.webmcpPage.scope.pages}
              </dt>
              <dd className="font-heading text-3xl text-background-rich">3</dd>
            </div>
            <div className="flex items-baseline gap-3">
              <dt className="order-2 text-background-rich/75 text-sm">
                {messages.webmcpPage.scope.scripts}
              </dt>
              <dd className="font-heading text-3xl text-background-rich">12</dd>
            </div>
          </dl>
        </div>
      </MarketingHero>
      <JsonLd
        schemas={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: translate("meta.name"),
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: absoluteUrl(localizePath("/webmcp-scanner", locale)),
            description: translate("meta.description"),
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          },
        ]}
      />
      <MarketingFeatureBand id="scan" tone="dark">
        <div className="relative border-background-rich/15 border-y">
          <MarketingEdgeCrosses />
          <MarketingEdgeCrosses edge="bottom" />
          <Scanner appearance="workbench" />
          <p className="border-background-rich/15 border-t px-7 py-4 text-background-rich/65 text-sm max-sm:px-4">
            {messages.webmcpPage.scope.runtime}
          </p>
        </div>
      </MarketingFeatureBand>
      <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
        <SectionGutter />
        <div className="grid grid-cols-[5fr_8fr] border-accent-foreground border-t max-md:grid-cols-1">
          <div
            data-scanner-explanation=""
            className="relative min-w-0 border-accent-foreground border-r bg-linear-to-br from-primary/16 via-primary/5 to-background-rich max-md:border-r-0 max-md:border-b"
          >
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
            <div className="px-7 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
              <span className="mb-4 block text-3xl text-primary">01</span>
              <h2>{messages.webmcpPage.checks.title}</h2>
              <p className="mt-4 text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                {messages.webmcpPage.checks.description}
              </p>
            </div>
            <div className="border-accent-foreground border-t px-7 py-8 max-sm:px-4">
              <h3 className="font-medium text-foreground-rich text-lg">
                {messages.webmcpPage.checks.workflowsTitle}
              </h3>
              <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 text-foreground text-sm">
                {Object.values(
                  messages.webmcpScanner.report.commerce.workflows,
                ).map((workflow) => (
                  <li key={workflow.title}>{workflow.title}</li>
                ))}
              </ul>
              <p className="mt-6 text-foreground-dimmed text-sm leading-relaxed">
                {messages.webmcpPage.checks.workflowsNote}
              </p>
            </div>
          </div>
          <ScannerChecks
            copy={messages.webmcpPage.checks}
            labels={messages.webmcpScanner.report.audit.checks}
          />
        </div>
      </MarketingBand>
      <ContentPageSection
        number="02"
        title={translate("faq.title")}
        description={translate("faq.description")}
        gutter
        classList={{ body: "p-0" }}
      >
        <Faq items={messages.webmcpScanner.faq.items} />
      </ContentPageSection>
    </MarketingShell>
  );
};
