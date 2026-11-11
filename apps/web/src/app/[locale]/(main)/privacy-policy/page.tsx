import type { Icon } from "@zenncore/icons";
import {
  CheckCircleIcon,
  ShareIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@zenncore/icons";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/json-ld";
import { MarketingShell } from "@/components/marketing/page";
import { localizePath } from "@/i18n/locale";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createMetadata,
  organizationSchema,
  seo,
} from "@/lib/seo";
import { ContentPageSection } from "../_components/content";
import { PageBanner } from "../_components/page-banner";
import { renderInline } from "../_components/rich-text";

const summaryIcons = [
  CheckCircleIcon,
  XCircleIcon,
  ShareIcon,
  ShieldCheckIcon,
] as const satisfies readonly Icon[];

const renderContent = (content: string): ReactNode => {
  const blocks = content.split(/\n\n+/);

  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const start = lines.findIndex((line) => line.startsWith("- "));

        if (start === -1)
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: index is unique
            <p key={index} className="text-foreground-dimmed leading-relaxed">
              {renderInline(lines.join(" "))}
            </p>
          );

        const paragraphs = lines.slice(0, start);
        const lists = lines.slice(start);

        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: index is unique
          <div key={index} className="flex flex-col gap-2">
            {paragraphs.length > 0 && (
              <p className="text-foreground-dimmed leading-relaxed">
                {renderInline(paragraphs.join(" "))}
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {lists.map((line, listIndex) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: listIndex is unique
                  key={listIndex}
                  className="flex gap-3 text-foreground-dimmed leading-relaxed"
                >
                  <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{renderInline(line.slice(2))}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("legal");

  return createMetadata({
    title: translate("privacyPolicy.meta.title"),
    description: translate("privacyPolicy.meta.description"),
    path: localizePath("/privacy-policy", locale),
  });
};

export default async () => {
  const locale = await getLocale();

  const translate = await getTranslations("legal");
  const messages = await getMessages();
  const description = translate("privacyPolicy.meta.description");
  const lastUpdated = messages.legal.privacyPolicy.lastUpdated;
  const assurances = messages.legal.privacyPolicy.hero.assurances;
  const summary = messages.legal.privacyPolicy.summary;
  const summarySection = messages.legal.privacyPolicy.summarySection;
  const sections = messages.legal.privacyPolicy.sections;
  const sectionNumbers = Object.keys(sections).sort() as Array<
    keyof typeof sections
  >;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: translate("privacyPolicy.breadcrumb.privacyPolicy"),
      description,
      url: absoluteUrl(localizePath("/privacy-policy", locale)),
      inLanguage: locale,
      isPartOf: {
        "@type": "WebSite",
        name: seo.name,
        url: seo.host,
      },
      datePublished: lastUpdated.iso,
      dateModified: lastUpdated.iso,
    },
    {
      ...organizationSchema,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "privacy",
        email: "privacy@ecentic.ai",
      },
    },
    createBreadcrumbSchema([
      {
        name: translate("privacyPolicy.breadcrumb.home"),
        path: localizePath("/", locale),
      },
      {
        name: translate("privacyPolicy.breadcrumb.privacyPolicy"),
        path: localizePath("/privacy-policy", locale),
      },
    ]),
  ];

  return (
    <MarketingShell>
      <JsonLd schemas={structuredData} />

      <PageBanner
        compact
        eyebrow={translate("privacyPolicy.hero.eyebrow")}
        title={translate("privacyPolicy.hero.title.primary")}
        accent={translate("privacyPolicy.hero.title.accent")}
        meta={lastUpdated.display}
        description={translate("privacyPolicy.hero.description")}
        assurances={assurances}
      />

      <ContentPageSection
        number={summarySection.number}
        title={summarySection.title}
        description={summarySection.description}
        classList={{ body: "p-0" }}
      >
        <div className="flex flex-col gap-px bg-accent-foreground">
          {summary.map((item, index) => {
            const IconComponent = summaryIcons[index] ?? CheckCircleIcon;

            return (
              <div
                key={item.title}
                className="grid grid-cols-1 gap-2 bg-background px-7 py-6 max-sm:px-4 md:grid-cols-[13rem_1fr] md:gap-8"
              >
                <div className="flex items-center gap-3">
                  <IconComponent className="size-5 shrink-0 text-primary" />
                  <h3 className="font-heading font-medium text-foreground text-lg">
                    {item.title}
                  </h3>
                </div>
                <p className="text-foreground-dimmed leading-relaxed">
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
            {renderContent(section.content)}
          </ContentPageSection>
        );
      })}
    </MarketingShell>
  );
};
