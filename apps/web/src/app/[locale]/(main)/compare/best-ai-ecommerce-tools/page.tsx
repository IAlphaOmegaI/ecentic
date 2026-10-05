import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
} from "@/lib/seo";
import Art from "@/public/images/ascii/scale.png";
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
    image: false,
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
      art={{ source: Art, alt: translate("hero.art.alt") }}
    >
      <JsonLd schemas={structuredData} />

      <Guide />

      <Tools />

      <Bottleneck />

      <RelatedPages />

      <ContentPageSection
        number={translate("faqSection.number")}
        title={translate("faqSection.title")}
        description={translate("faqSection.description")}
        gutter
        classList={{ body: "p-0" }}
      >
        <Faq items={faq} />
      </ContentPageSection>

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
