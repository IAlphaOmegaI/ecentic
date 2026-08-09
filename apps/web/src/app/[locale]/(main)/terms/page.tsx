import type { Icon } from "@zenncore/icons";
import {
  RobotIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  XCircleIcon,
} from "@zenncore/icons";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { Navbar } from "@/components/navbar";
import { localizePath } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
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

type TermsPageProps = {
  params: Promise<{ locale: string }>;
};

type LastUpdated = {
  display: string;
  iso: string;
};

type SummaryItem = {
  title: string;
  description: string;
};

type Section = {
  title: string;
  content: string;
};

const summaryIcons = [
  RobotIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  XCircleIcon,
] as const satisfies readonly Icon[];

export const generateMetadata = async ({
  params,
}: TermsPageProps): Promise<Metadata> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const translate = await getTranslations({ locale, namespace: "legal" });

  return createMetadata({
    title: translate("termsAndConditions.meta.title"),
    description: translate("termsAndConditions.meta.description"),
    path: localizePath("/terms", locale),
  });
};

export default async ({ params }: TermsPageProps) => {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw;
  setRequestLocale(locale);

  const translate = await getTranslations({ locale, namespace: "legal" });
  const description = translate("termsAndConditions.meta.description");
  const lastUpdated = translate.raw(
    "termsAndConditions.lastUpdated",
  ) as LastUpdated;
  const assurances = translate.raw(
    "termsAndConditions.hero.assurances",
  ) as readonly string[];
  const summary = translate.raw(
    "termsAndConditions.summary",
  ) as readonly SummaryItem[];
  const summarySection = translate.raw(
    "termsAndConditions.summarySection",
  ) as {
    number: string;
    title: string;
    description: string;
  };
  const sections = translate.raw("termsAndConditions.sections") as Record<
    string,
    Section
  >;
  const sectionNumbers = Object.keys(sections).sort();

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
