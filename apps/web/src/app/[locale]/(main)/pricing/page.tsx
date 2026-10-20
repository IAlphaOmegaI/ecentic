import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  createSoftwareApplicationSchema,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/coins.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../_components/content";
import { PartnershipBundle } from "../_components/partnership-bundle";
import { Compare } from "./_components/compare";
import { Faq } from "./_components/faq";
import { FeeExplainer } from "./_components/fee-explainer";
import { Plans } from "./_components/plans";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("pricing");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/pricing", locale),
    keywords: [
      "ecentic pricing",
      "AI ecommerce tool pricing",
      "product listing optimization pricing",
      "AI shopping agent software cost",
    ],
  });
};

export default async () => {
  const locale = await getLocale();

  const translate = await getTranslations("pricing");
  const messages = await getMessages();
  const description = translate("meta.description");
  const assurances = messages.pricing.hero.assurances;
  const faq = messages.pricing.faq.items;
  const plans = messages.pricing.schema.plans;

  const structuredData = [
    createSoftwareApplicationSchema({
      plans,
      description,
      url: absoluteUrl(localizePath("/pricing", locale)),
    }),
    organizationSchema,
    createBreadcrumbSchema([
      { name: translate("breadcrumb.home"), path: localizePath("/", locale) },
      {
        name: translate("breadcrumb.pricing"),
        path: localizePath("/pricing", locale),
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

      <Plans />

      <FeeExplainer />

      <Compare />

      <PartnershipBundle />

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
          href: "/demo",
          label: translate("footer.action.secondary"),
        }}
        note={translate("footer.note")}
      />
    </ContentPageLayout>
  );
};
