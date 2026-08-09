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
import Art from "@/public/images/ascii/cart.png";
import {
  ContentPageBadge,
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../../_components/content";
import { Faq } from "../../pricing/_components/faq";
import { AgentCommerce } from "./_components/agent-commerce";
import { Evaluate } from "./_components/evaluate";
import { RelatedPages } from "./_components/related";
import { Why } from "./_components/why";
import { Workflow } from "./_components/workflow";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("woocommerce");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/platforms/woocommerce", locale),
    keywords: [
      "AI for WooCommerce",
      "WooCommerce AI optimization",
      "WooCommerce product listing optimization",
      "AI ecommerce tools for WooCommerce",
      "product listing optimization WooCommerce",
    ],
  });
};

export default async () => {
  const locale = await getLocale();

  const translate = await getTranslations("woocommerce");
  const messages = await getMessages();
  const description = translate("meta.description");
  const assurances = messages.woocommerce.hero.assurances;
  const faq = messages.woocommerce.faq.items;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: translate("breadcrumb.woocommerce"),
      description,
      url: absoluteUrl(localizePath("/platforms/woocommerce", locale)),
      about: [
        "AI for WooCommerce",
        "WooCommerce product listing optimization",
        "WooCommerce competitor analysis",
      ],
    },
    createBreadcrumbSchema([
      { name: translate("breadcrumb.home"), path: localizePath("/", locale) },
      {
        name: translate("breadcrumb.woocommerce"),
        path: localizePath("/platforms/woocommerce", locale),
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
      badge={
        <ContentPageBadge
          logo="/images/woocommerce.svg"
          alt={translate("hero.badge.alt")}
          label={translate("hero.badge.label")}
        />
      }
    >
      <JsonLd schemas={structuredData} />

      <Why />

      <Workflow />

      <AgentCommerce />

      <Evaluate />

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
          label: translate("footer.action.primary"),
        }}
        secondary={{
          href: "/features",
          label: translate("footer.action.secondary"),
        }}
        note={translate("footer.note")}
      />
    </ContentPageLayout>
  );
};
