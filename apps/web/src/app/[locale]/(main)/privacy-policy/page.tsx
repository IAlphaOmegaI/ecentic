import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/json-ld";
import { MarketingShell } from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { localizePath } from "@/i18n/locale";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createMetadata,
  organizationSchema,
  seo,
} from "@/lib/seo";
import { renderInline } from "../_components/rich-text";
import { PrivacyContents } from "./_components/privacy-contents";
import { PrivacyOverview } from "./_components/privacy-overview";

const renderContent = (content: string): ReactNode => {
  const blocks = content.split(/\n\n+/);

  return (
    <div className="flex max-w-[74ch] flex-col gap-6 text-foreground [overflow-wrap:anywhere]">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const start = lines.findIndex((line) => line.startsWith("- "));

        if (start === -1)
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: index is unique
            <p key={index} className="leading-7">
              {renderInline(lines.join(" "))}
            </p>
          );

        const paragraphs = lines.slice(0, start);
        const lists = lines.slice(start);

        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: index is unique
          <div key={index} className="flex flex-col gap-4">
            {paragraphs.length > 0 && (
              <p className="leading-7">{renderInline(paragraphs.join(" "))}</p>
            )}
            <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-foreground-dimmed">
              {lists.map((line, listIndex) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: listIndex is unique
                  key={listIndex}
                  className="pl-2 leading-7"
                >
                  {renderInline(line.slice(2))}
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
    image: false,
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
  const controls = messages.privacyPage;
  const contents = sectionNumbers.map((number) => ({
    number,
    title: sections[number].title,
    href: `#privacy-${number}`,
  }));

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

      <MarketingBand className="[&_.marketing-guides]:hidden">
        <header className="grid gap-8 px-8 py-12 max-sm:px-4 max-sm:py-10 lg:grid-cols-[4fr_7fr] lg:items-start lg:gap-16 lg:py-16">
          <div>
            <h1 className="text-5xl xl:text-7xl leading-none tracking-tighter">
              {translate("privacyPolicy.hero.title.primary")}{" "}
              {translate("privacyPolicy.hero.title.accent")}
            </h1>
            <time
              dateTime={lastUpdated.iso}
              className="mt-6 block text-foreground-dimmed text-sm"
            >
              {lastUpdated.display}
            </time>
          </div>
          <div>
            <p className="max-w-[62ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
              {translate("privacyPolicy.hero.description")}
            </p>
            <div className="mt-6">
              <Button color="neutral" render={<a href="#privacy-01" />}>
                {controls.action.primary}
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </header>
        <ul className="grid grid-cols-3 border-accent-foreground border-t max-md:grid-cols-1">
          {assurances.map((assurance) => (
            <li
              key={assurance}
              className="border-accent-foreground px-8 py-4 text-foreground-dimmed text-sm max-sm:px-4 max-md:border-b max-md:last:border-b-0 md:border-r md:last:border-r-0"
            >
              {assurance}
            </li>
          ))}
        </ul>
      </MarketingBand>

      <PrivacyOverview heading={summarySection} items={summary} />

      <MarketingBand className="bg-background-rich [&_.marketing-guides]:hidden">
        <div className="grid lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside
            id="privacy-contents"
            className="relative scroll-mt-28 border-accent-foreground border-b bg-linear-to-b from-primary/5 via-background-rich to-background-rich lg:border-r lg:border-b-0"
          >
            <PrivacyContents label={controls.contents} items={contents} />
          </aside>
          <div className="min-w-0 px-8 max-sm:px-4 lg:px-12">
            {sectionNumbers.map((number) => {
              const section = sections[number];
              if (!section) return null;

              return (
                <section
                  key={number}
                  id={`privacy-${number}`}
                  aria-labelledby={`privacy-heading-${number}`}
                  tabIndex={-1}
                  className="scroll-mt-28 border-accent-foreground border-b py-12 max-sm:py-8"
                >
                  <div className="mb-8 flex items-baseline gap-4">
                    <span className="shrink-0 text-primary text-xl">
                      {number}
                    </span>
                    <h2
                      id={`privacy-heading-${number}`}
                      className="text-2xl xl:text-3xl 2xl:text-4xl leading-tight"
                    >
                      {section.title}
                    </h2>
                  </div>
                  {renderContent(section.content)}
                </section>
              );
            })}
            <div className="py-8">
              <Button color="neutral" render={<a href="#privacy-contents" />}>
                <ArrowRightIcon className="size-4 -rotate-90" />
                {controls.action.secondary}
              </Button>
            </div>
          </div>
        </div>
      </MarketingBand>
    </MarketingShell>
  );
};
