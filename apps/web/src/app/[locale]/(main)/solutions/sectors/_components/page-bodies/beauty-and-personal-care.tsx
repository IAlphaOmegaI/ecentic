import { ArrowRightIcon } from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingEyebrow,
} from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";
import { BeautyAndPersonalCareRecord } from "./beauty-and-personal-care-record";

export const BeautyAndPersonalCareBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { beautyPage, enterpriseSolutions } = await getMessages();
  const attributes =
    enterpriseSolutions.sectors["beauty-and-personal-care"].sections.find(
      (section) => section.id === "attributes",
    )?.items ?? [];

  return (
    <>
      {sections.map((section, index) => (
        <Fragment key={section.id}>
          {index > 0 && <SectionGutter />}
          {(() => {
            switch (section.id) {
              case "questions":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <div className="px-4 py-8 sm:px-8 sm:py-12">
                      {section.eyebrow && (
                        <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                      )}
                      <h2>{section.title}</h2>
                    </div>
                    <BeautyAndPersonalCareRecord
                      questions={section.items ?? []}
                      attributes={attributes}
                      copy={beautyPage.record}
                    />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "rules":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <div className="px-4 py-8 sm:px-8 sm:py-12">
                      {section.eyebrow && (
                        <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                      )}
                      <h2>{section.title}</h2>
                    </div>
                    <div className="grid border-accent-foreground border-t bg-background-dimmed md:grid-cols-[1fr_2fr]">
                      <div className="border-accent-foreground px-4 py-8 max-md:border-b sm:px-8 md:border-r">
                        <p className="max-w-[28ch] text-foreground-dimmed text-sm">
                          {beautyPage.evidence.label}
                        </p>
                        <ol className="mt-6">
                          {beautyPage.evidence.steps.map((step, position) => (
                            <li key={step} className="relative">
                              <p className="font-heading text-foreground-rich text-xl tracking-tight">
                                {step}
                              </p>
                              {position <
                                beautyPage.evidence.steps.length - 1 && (
                                <ArrowRightIcon
                                  aria-hidden
                                  className="my-4 size-4 rotate-90 text-primary-text"
                                />
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div className="min-w-0">
                        {section.paragraphs?.map((paragraph, position) => (
                          <article
                            key={paragraph}
                            className="border-accent-foreground not-first:border-t px-4 py-8 sm:px-8"
                          >
                            <h3 className="text-2xl!">
                              {position === 0
                                ? beautyPage.evidence.claims
                                : beautyPage.evidence.protection}
                            </h3>
                            <p className="mt-4 max-w-[64ch] text-foreground-dimmed">
                              {paragraph}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>
                    {sectionChildren?.[section.id]}
                    {section.note && (
                      <p className="border-accent-foreground border-t px-4 py-6 text-foreground-dimmed text-sm sm:px-8">
                        {section.note}
                      </p>
                    )}
                    {section.links?.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="group flex min-h-16 items-center justify-between gap-6 border-accent-foreground border-t px-4 py-4 text-primary-text hover:bg-background-dimmed focus-visible:-outline-offset-4 sm:px-8"
                      >
                        <span className="group-hover:underline group-hover:underline-offset-4">
                          {link.label}
                        </span>
                        <ArrowRightIcon
                          aria-hidden
                          className="size-4 shrink-0"
                        />
                      </Link>
                    ))}
                  </MarketingBand>
                );
              case "business":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <div className="px-4 py-8 sm:px-8 sm:py-12">
                      {section.eyebrow && (
                        <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                      )}
                      <h2>{section.title}</h2>
                    </div>
                    <div className="grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
                      {section.items?.map((item) => (
                        <Link
                          key={item.title}
                          href={item.href ?? "/solutions"}
                          className="group flex min-w-0 flex-col bg-background px-4 py-8 hover:bg-background-dimmed focus-visible:-outline-offset-4 sm:px-8"
                        >
                          <h3 className="max-w-[25ch] text-2xl! group-hover:text-primary-text">
                            {item.title}
                          </h3>
                          <p className="mt-4 max-w-[42ch] text-foreground-dimmed">
                            {item.body}
                          </p>
                          <span className="mt-6 flex items-center justify-between gap-4 text-primary-text text-sm">
                            {item.label}
                            <ArrowRightIcon
                              aria-hidden
                              className="size-4 shrink-0"
                            />
                          </span>
                        </Link>
                      ))}
                    </div>
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              default:
                return (
                  <MarketingSection section={section}>
                    {sectionChildren?.[section.id]}
                  </MarketingSection>
                );
            }
          })()}
        </Fragment>
      ))}
    </>
  );
};
