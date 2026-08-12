import type { Icon } from "@zenncore/icons";
import {
  RobotIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  XCircleIcon,
} from "@zenncore/icons";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { Navbar } from "@/components/navbar";
import { localizePath } from "@/i18n/locale";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createMetadata,
  organizationSchema,
  seo,
} from "@/lib/seo";
import Art from "@/public/images/ascii/quill.png";
import {
  ContentPageRichText,
  ContentPageSection,
} from "../_components/content";
import { PageBanner } from "../_components/page-banner";

const summaryIcons = [
  RobotIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  XCircleIcon,
] as const satisfies readonly Icon[];

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("legal");

  return createMetadata({
    title: translate("termsAndConditions.meta.title"),
    description: translate("termsAndConditions.meta.description"),
    path: localizePath("/terms", locale),
  });
};

export default async () => {
  const locale = await getLocale();

  const translate = await getTranslations("legal");
  const messages = await getMessages();
  const description = translate("termsAndConditions.meta.description");
  const lastUpdated = messages.legal.termsAndConditions.lastUpdated;
  const assurances = messages.legal.termsAndConditions.hero.assurances;
  const summary = messages.legal.termsAndConditions.summary;
  const summarySection = messages.legal.termsAndConditions.summarySection;
  const sections = messages.legal.termsAndConditions.sections;
  const sectionNumbers = Object.keys(sections).sort() as Array<
    keyof typeof sections
  >;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: translate("termsAndConditions.breadcrumb.terms"),
      description,
      url: absoluteUrl(localizePath("/terms", locale)),
      inLanguage: locale,
      isPartOf: {
        "@type": "WebSite",
        name: seo.name,
        url: seo.host,
      },
      datePublished: lastUpdated.iso,
      dateModified: lastUpdated.iso,
    },
    organizationSchema,
    createBreadcrumbSchema([
      {
        name: translate("termsAndConditions.breadcrumb.home"),
        path: localizePath("/", locale),
      },
      {
        name: translate("termsAndConditions.breadcrumb.terms"),
        path: localizePath("/terms", locale),
      },
    ]),
  ];

  return (
    <main className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-6xl border-accent-foreground border-x">
        <Navbar />
      </div>

      <JsonLd schemas={structuredData} />

      <PageBanner
        eyebrow={translate("termsAndConditions.hero.eyebrow")}
        title={translate("termsAndConditions.hero.title.primary")}
        accent={translate("termsAndConditions.hero.title.accent")}
        meta={`Last updated: ${lastUpdated.display}`}
        description={translate("termsAndConditions.hero.description")}
        assurances={assurances}
        art={{
          source: Art,
          alt: translate("termsAndConditions.hero.art.alt"),
        }}
      />

      <ContentPageSection
        number={summarySection.number}
        title={summarySection.title}
        description={summarySection.description}
        classList={{ body: "p-0" }}
      >
        <div className="flex flex-col gap-px bg-accent-foreground">
          {summary.map((item, index) => {
            const IconComponent = summaryIcons[index] ?? RobotIcon;

            return (
              <div
                key={item.title}
                className="grid grid-cols-1 gap-2 bg-background px-6 py-5 md:grid-cols-[13rem_1fr] md:gap-8 md:px-8"
              >
                <div className="flex items-center gap-3">
                  <IconComponent className="size-5 shrink-0 text-primary" />
                  <h3 className="font-body font-medium text-foreground text-lg">
                    {item.title}
                  </h3>
                </div>
                <p className="font-light text-foreground-dimmed leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </ContentPageSection>

      {sectionNumbers.map((number) => {
        const section = sections[number];
        if (!section) return null;

        return (
          <ContentPageSection
            key={number}
            number={number}
            title={section.title}
          >
            <ContentPageRichText content={section.content} />
          </ContentPageSection>
        );
      })}

      <Footer stacked />
    </main>
  );
};
