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
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { HealthWellnessAndPetReader } from "./health-wellness-and-pet-reader";

export const HealthWellnessAndPetBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { enterpriseSolutions, healthPage } = await getMessages();
  const attributes =
    enterpriseSolutions.sectors["health-wellness-and-pet"].sections.find(
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
                      <p className="mt-4 max-w-[60ch] text-foreground-dimmed">
                        {healthPage.reader.description}
                      </p>
                    </div>
                    <HealthWellnessAndPetReader
                      questions={section.items ?? []}
                      attributes={attributes}
                      copy={healthPage.reader}
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
                    <div className="relative grid border-accent-foreground border-t lg:grid-cols-[2fr_3fr]">
                      <Plus className="top-0 left-2/5 -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
                      <div className="min-w-0 border-accent-foreground bg-background-dimmed px-4 py-8 max-lg:border-b sm:px-8 lg:border-r">
                        <h3 className="max-w-[22ch] text-2xl!">
                          {healthPage.relationship.title}
                        </h3>
                        <div
                          role="img"
                          aria-label={healthPage.relationship.label}
                          className="mt-8"
                        >
                          <div className="relative ml-2 border-accent-rich border-l">
                            {healthPage.relationship.inputs.map((input) => (
                              <div
                                key={input.title}
                                className="relative pb-8 pl-6"
                              >
                                <span
                                  aria-hidden
                                  className="absolute top-2 left-0 h-px w-4 bg-accent-rich"
                                />
                                <p className="font-medium text-foreground-rich">
                                  {input.title}
                                </p>
                                <p className="mt-2 max-w-[32ch] text-foreground-dimmed text-sm">
                                  {input.description}
                                </p>
                              </div>
                            ))}
                          </div>
                          <div className="relative border-accent-rich border-t pt-6 pl-8">
                            <Plus className="top-0 left-2 -translate-x-1/2 -translate-y-1/2" />
                            <p className="max-w-[24ch] font-heading text-primary-text text-xl leading-tight">
                              {healthPage.relationship.output}
                            </p>
                            <p className="mt-2 max-w-[32ch] text-foreground-dimmed text-sm">
                              {healthPage.relationship.description}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        {section.paragraphs
                          ?.slice(0, 2)
                          .map((paragraph, position) => {
                            const source = section.links?.[position];
                            return (
                              <article
                                key={paragraph}
                                className="border-accent-foreground not-first:border-t"
                              >
                                <div className="px-4 py-8 sm:px-8">
                                  <h3 className="text-2xl!">
                                    {healthPage.rules[position]}
                                  </h3>
                                  <p className="mt-4 max-w-[58ch] text-foreground-dimmed">
                                    {paragraph}
                                  </p>
                                </div>
                                {source && (
                                  <Link
                                    href={source.href}
                                    className="group flex min-h-16 items-center justify-between gap-6 border-accent-foreground border-t px-4 py-4 text-primary-text hover:bg-background-dimmed focus-visible:-outline-offset-4 sm:px-8"
                                  >
                                    <span className="group-hover:underline group-hover:underline-offset-4">
                                      {source.label}
                                    </span>
                                    <ArrowRightIcon
                                      aria-hidden
                                      className="size-4 shrink-0"
                                    />
                                  </Link>
                                )}
                              </article>
                            );
                          })}
                      </div>
                    </div>
                    <div className="relative grid gap-4 border-accent-foreground border-t px-4 py-8 sm:px-8 lg:grid-cols-[2fr_3fr] lg:gap-16">
                      <Plus className="top-0 left-2/5 -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
                      <h3 className="text-2xl!">{healthPage.role}</h3>
                      <div>
                        {section.paragraphs?.slice(2).map((paragraph) => (
                          <p
                            key={paragraph}
                            className="not-first:mt-4 max-w-[60ch] text-foreground-dimmed"
                          >
                            {paragraph}
                          </p>
                        ))}
                        {section.note && (
                          <p className="mt-4 max-w-[65ch] text-foreground-dimmed text-sm">
                            {section.note}
                          </p>
                        )}
                      </div>
                    </div>
                    {sectionChildren?.[section.id]}
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
                    {section.items?.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href ?? "/solutions"}
                        className="group grid min-w-0 items-center gap-4 border-accent-foreground border-t px-4 py-8 hover:bg-background-dimmed focus-visible:-outline-offset-4 sm:px-8 md:grid-cols-[2fr_2fr_1fr] md:gap-8"
                      >
                        <h3 className="max-w-[26ch] text-2xl! group-hover:text-primary-text">
                          {item.title}
                        </h3>
                        <p className="max-w-[40ch] text-foreground-dimmed">
                          {item.body}
                        </p>
                        <span className="flex items-center justify-between gap-4 text-primary-text text-sm">
                          {item.label}
                          <ArrowRightIcon
                            aria-hidden
                            className="size-4 shrink-0"
                          />
                        </span>
                      </Link>
                    ))}
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
