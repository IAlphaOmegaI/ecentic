import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/gears.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../_components/content";
import { Faq } from "../pricing/_components/faq";
import { Steps } from "./_components/steps";

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("howItWorks");

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/how-it-works", locale),
    keywords: [
      "how AI ecommerce optimization works",
      "AI shopping agent simulation",
      "product listing optimization workflow",
      "agent commerce optimization",
    ],
  });
};

export default async () => {
  const locale = await getLocale();

  const translate = await getTranslations("howItWorks");
  const messages = await getMessages();
  const description = translate("meta.description");
  const assurances = messages.howItWorks.hero.assurances;
  const faq = messages.howItWorks.faq.items;
  const steps = messages.howItWorks.schema.steps;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: translate("schema.name"),
      description,
      url: absoluteUrl(localizePath("/how-it-works", locale)),
      step: steps.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step.name,
        text: step.text,
      })),
    },
    organizationSchema,
    createBreadcrumbSchema([
      { name: translate("breadcrumb.home"), path: localizePath("/", locale) },
      {
        name: translate("breadcrumb.howItWorks"),
        path: localizePath("/how-it-works", locale),
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

      <Steps />

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
          href: "/pricing",
          label: translate("footer.action.secondary"),
        }}
        note={translate("footer.note")}
      />
    </ContentPageLayout>
  );
};
