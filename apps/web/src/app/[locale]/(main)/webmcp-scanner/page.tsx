import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingShell } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
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
      <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
        <div className="grid grid-cols-[7fr_5fr] max-lg:grid-cols-1">
          <div className="min-w-0 px-7 py-12 max-sm:px-4 max-sm:py-8">
            <h1 className="text-[clamp(2.5rem,4.2vw,3.75rem)] leading-[1.06] tracking-[-0.035em] max-sm:text-[2.5rem]">
              {translate("hero.title")} {translate("hero.accent")}
            </h1>
            <p className="mt-6 max-w-[58ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
              {translate("hero.description")}
            </p>
            <div className="mt-6">
              <Button color="primary" render={<Link href="#scan" />}>
                {translate("hero.action.primary")}
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
            <p className="mt-6 text-foreground-dimmed text-sm">
              {messages.webmcpScanner.hero.assurances.join(" · ")}
            </p>
          </div>
          <div className="relative flex min-w-0 flex-col border-accent-foreground border-l bg-background-dimmed max-lg:border-t max-lg:border-l-0">
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
            <div className="relative min-h-56 flex-1 text-primary max-lg:h-52 max-lg:flex-none">
              <div className="absolute inset-4">
                <EvolvingAscii artwork="console" />
              </div>
            </div>
            <div className="px-7 pb-6 max-sm:px-4">
              <p className="font-medium text-foreground-rich">
                {messages.webmcpPage.scope.title}
              </p>
              <p className="mt-2 text-foreground-dimmed text-sm leading-relaxed">
                {messages.webmcpPage.scope.description}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-px border-accent-foreground border-t bg-accent-foreground">
              <div className="flex flex-col bg-background-dimmed px-7 py-4 max-sm:px-4">
                <dt className="order-2 mt-2 text-foreground-dimmed text-sm">
                  {messages.webmcpPage.scope.pages}
                </dt>
                <dd className="text-3xl text-primary-text">3</dd>
              </div>
              <div className="flex flex-col bg-background-dimmed px-7 py-4 max-sm:px-4">
                <dt className="order-2 mt-2 text-foreground-dimmed text-sm">
                  {messages.webmcpPage.scope.scripts}
                </dt>
                <dd className="text-3xl text-primary-text">12</dd>
              </div>
            </dl>
          </div>
        </div>
      </MarketingBand>
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
      <MarketingBand
        id="scan"
        className="scroll-mt-24 border-t-0 [&>.marketing-rail>.marketing-guides]:hidden"
      >
        <Scanner />
        <p className="border-accent-foreground border-t bg-background-dimmed px-7 py-4 text-foreground-dimmed text-sm max-sm:px-4">
          {messages.webmcpPage.scope.runtime}
        </p>
      </MarketingBand>
      <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden">
        <SectionGutter />
        <div className="grid grid-cols-[5fr_8fr] border-accent-foreground border-t max-md:grid-cols-1">
          <div className="relative min-w-0 border-accent-foreground border-r max-md:border-r-0 max-md:border-b">
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
            <div className="px-7 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
              <span className="mb-4 block text-3xl text-primary">01</span>
              <h2>{messages.webmcpPage.checks.title}</h2>
              <p className="mt-4 text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                {messages.webmcpPage.checks.description}
              </p>
            </div>
            <div className="border-accent-foreground border-t bg-background-dimmed px-7 py-8 max-sm:px-4">
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
