import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/console.png";
import {
  ContentPageFooter,
  ContentPageLayout,
  ContentPageSection,
} from "../_components/content";
import { Faq } from "../pricing/_components/faq";
import { Capabilities } from "./_components/capabilities";
import { Loop } from "./_components/loop";
import { Workflows } from "./_components/workflows";

type FeaturesPageProps = {
  params: Promise<{ locale: string }>;
};

export const generateMetadata = async ({
  params,
}: FeaturesPageProps): Promise<Metadata> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const translate = await getTranslations({ locale, namespace: "features" });

  return createMetadata({
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/features", locale),
    keywords: [
      "AI ecommerce tools",
      "AI ecommerce platform",
      "product listing optimization",
      "AI shopping agents",
      "agent commerce software",
    ],
  });
};

export default async ({ params }: FeaturesPageProps) => {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw;

  const translate = await getTranslations({ locale, namespace: "features" });
  const messages = await getMessages();
  const description = translate("meta.description");
  const assurances = messages.features.hero.assurances;
  const faq = messages.features.faq.items;
  const workflows = messages.features.workflows.items;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: translate("meta.title"),
      description,
      url: absoluteUrl(localizePath("/features", locale)),
      isPartOf: absoluteUrl(localizePath("/", locale)),
      about: [
        "AI ecommerce tools",
        "product listing optimization",
        "AI shopping agents",
      ],
      hasPart: workflows.map((workflow) => ({
        "@type": "WebPage",
        name: workflow.title,
        url: absoluteUrl(localizePath(workflow.href, locale)),
      })),
      publisher: {
        "@type": "Organization",
        name: "ecentic",
        url: absoluteUrl(localizePath("/", locale)),
      },
    },
    organizationSchema,
    createBreadcrumbSchema([
      { name: translate("breadcrumb.home"), path: localizePath("/", locale) },
      {
        name: translate("breadcrumb.features"),
        path: localizePath("/features", locale),
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

      <Loop />

      <Capabilities />

      <Workflows />

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
          href: "/",
          label: translate("footer.action.secondary"),
        }}
        note={translate("footer.note")}
      />
    </ContentPageLayout>
  );
};
