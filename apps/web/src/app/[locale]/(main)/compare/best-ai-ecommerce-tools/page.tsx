import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { MarketingBand } from "@/components/marketing/primitives";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
} from "@/lib/seo";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../../_components/content";
import { Faq } from "../../pricing/_components/faq";
import { Bottleneck } from "./_components/bottleneck";
import { Guide } from "./_components/guide";
import { RelatedPages } from "./_components/related";
import { Tools } from "./_components/tools";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("compare");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/compare/best-ai-ecommerce-tools", locale),
    keywords: [
      "best AI tools for ecommerce 2026",
      "AI ecommerce software comparison",
      "top ecommerce AI platforms",
      "Shopify Magic alternatives",
      "AI ecommerce tools",
    ],
  });
};

export default async () => {
  const locale = await getLocale();

  const translate = await getTranslations("compare");
  const messages = await getMessages();
  const description = translate("meta.description");
  const assurances = messages.compare.hero.assurances;
  const faq = messages.compare.faq.items;
  const tools = messages.compare.tools.items;
  const navigation = messages.comparisonGuidePage.navigation;
  const chapters = [
    { id: "guide", label: navigation.guide },
    { id: "tool-comparison", label: navigation.tools },
    { id: "bottleneck", label: navigation.bottleneck },
    { id: "related-guides", label: navigation.related },
    { id: "guide-faq", label: navigation.faq },
  ];
  const pagePath = localizePath("/compare/best-ai-ecommerce-tools", locale);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: translate("structuredData.articleHeadline"),
      description,
      url: absoluteUrl(pagePath),
      author: {
        "@type": "Organization",
        name: "ecentic",
      },
      publisher: {
        "@type": "Organization",
        name: "ecentic",
        url: absoluteUrl(localizePath("/", locale)),
      },
      mainEntityOfPage: absoluteUrl(pagePath),
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: translate("structuredData.itemListName"),
      numberOfItems: tools.length,
      itemListOrder: "https://schema.org/ItemListUnordered",
      itemListElement: tools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "SoftwareApplication",
          name: tool.name,
          description: translate("structuredData.toolDescription", {
            category: tool.category,
            bestAt: tool.bestAt,
            wrongPick: tool.wrongPick,
          }),
          applicationCategory: "BusinessApplication",
        },
      })),
    },
    createBreadcrumbSchema([
      {
        name: translate("breadcrumb.home"),
        path: localizePath("/", locale),
      },
      {
        name: translate("breadcrumb.page"),
        path: pagePath,
      },
    ]),
    createFaqSchema(faq),
  ];

  return (
    <ContentPageLayout
      eyebrow={translate("hero.eyebrow")}
      title={translate("hero.title.primary")}
      accent={translate("hero.title.accent")}
      description={translate("hero.description")}
      assurances={assurances}
      artwork="console"
      actions={
        <Button color="neutral" render={<Link href="#tool-comparison" />}>
          {navigation.tools}
          <ArrowRightIcon className="size-4" />
        </Button>
      }
    >
      <JsonLd schemas={structuredData} />

      <MarketingBand>
        <nav
          aria-label={navigation.label}
          className="relative bg-background-dimmed"
        >
          <p className="border-accent-foreground border-b px-7 py-4 font-medium text-foreground-dimmed text-sm max-sm:px-4">
            {navigation.label}
          </p>
          <ol className="grid sm:grid-cols-5">
            {chapters.map((chapter, index) => (
              <li
                key={chapter.id}
                className="min-w-0 border-accent-foreground border-b last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
              >
                <Link
                  href={`#${chapter.id}`}
                  className="flex h-full min-h-16 items-start gap-3 px-7 py-5 font-medium text-foreground-rich text-sm outline-offset-[-4px] hover:bg-background hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary max-sm:px-4 sm:flex-col"
                >
                  <span
                    aria-hidden="true"
                    className="text-primary-text tabular-nums"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {chapter.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </MarketingBand>

      <Guide />

      <Tools />

      <Bottleneck />

      <RelatedPages />

      <div id="guide-faq" className="scroll-mt-24">
        <ContentPageSection
          number={translate("faqSection.number")}
          title={translate("faqSection.title")}
          description={translate("faqSection.description")}
          gutter
          classList={{ body: "p-0" }}
        >
          <Faq items={faq} />
        </ContentPageSection>
      </div>

      <ContentPageFooter
        primary={{
          href: "/sign-up",
          label: translate("footer.primary"),
        }}
        secondary={{
          href: "/",
          label: translate("footer.secondary"),
        }}
        note={translate("footer.note")}
      />
    </ContentPageLayout>
  );
};
