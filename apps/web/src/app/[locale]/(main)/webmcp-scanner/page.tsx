import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { absoluteUrl, createMetadata } from "@/lib/seo";
import Art from "@/public/images/ascii/console.png";
import { ContentPageLayout, ContentPageSection } from "../_components/content";
import { Faq } from "../pricing/_components/faq";
import { Scanner } from "./_components/scanner";

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
    <ContentPageLayout
      title={`${translate("hero.title")} `}
      accent={translate("hero.accent")}
      description={translate("hero.description")}
      assurances={messages.webmcpScanner.hero.assurances}
      art={{ source: Art, alt: translate("hero.art") }}
      actions={
        <Button color="accent" render={<Link href="#scan" />}>
          {translate("hero.action.primary")}
          <ArrowRightIcon className="size-4" />
        </Button>
      }
    >
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
      <section
        id="scan"
        className="scroll-mt-8 border-accent-foreground border-b"
      >
        <div className="mx-auto max-w-6xl border-accent-foreground border-x">
          <Scanner />
        </div>
      </section>
      <ContentPageSection
        number="01"
        title={translate("faq.title")}
        description={translate("faq.description")}
        gutter
        classList={{ body: "p-0" }}
      >
        <Faq items={messages.webmcpScanner.faq.items} />
      </ContentPageSection>
    </ContentPageLayout>
  );
};
