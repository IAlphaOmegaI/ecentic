import { ArrowRightIcon } from "@zenncore/icons";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingEyebrow,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { WineAndSpiritsQuestions } from "./wine-and-spirits-questions";

export const WineAndSpiritsBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { winePage } = await getMessages();

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
                    <WineAndSpiritsQuestions
                      items={section.items ?? []}
                      labels={winePage.explorer}
                    />
                    {sectionChildren?.[section.id]}
                  </MarketingBand>
                );
              case "attributes":
                return (
                  <MarketingBand
                    id={section.id}
                    className="[&>.marketing-rail>.marketing-guides]:hidden"
                  >
                    <div className="relative grid md:grid-cols-[2fr_1fr]">
                      <div className="flex min-w-0 flex-col justify-center px-4 py-8 sm:px-8 sm:py-12">
                        {section.eyebrow && (
                          <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                        )}
                        <h2>{section.title}</h2>
                        <p className="mt-4 max-w-[48ch] text-foreground-dimmed text-lg max-sm:text-base">
                          {winePage.attributes.description}
                        </p>
                      </div>
                      <figure className="m-0 flex min-w-0 flex-col border-accent-foreground bg-background-dimmed max-md:border-t md:border-l">
                        <div className="relative h-52 min-h-52 flex-1 text-primary-text sm:min-h-64">
                          <EvolvingAscii
                            artwork="bag"
                            className="absolute inset-0"
                          />
                        </div>
                        <figcaption className="border-accent-foreground border-t px-4 py-4 text-foreground-dimmed text-sm sm:px-8">
                          {winePage.attributes.caption}
                        </figcaption>
                      </figure>
                    </div>
                    <div className="bg-background-dimmed/50">
                      {sectionChildren?.[section.id]}
                    </div>
                    {section.note && (
                      <p className="border-accent-foreground border-t px-4 py-6 text-foreground-dimmed text-sm sm:px-8">
                        {section.note}
                      </p>
                    )}
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
                    <div className="relative grid gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
                      <Plus className="top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
                      {section.paragraphs?.map((paragraph, position) => (
                        <div
                          key={paragraph}
                          className="bg-background-dimmed px-4 py-8 sm:px-8"
                        >
                          <h3 className="text-2xl!">
                            {position === 0
                              ? winePage.rules.market
                              : winePage.rules.age}
                          </h3>
                          <p className="mt-4 max-w-[52ch] text-foreground-dimmed">
                            {paragraph}
                          </p>
                        </div>
                      ))}
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
                    {section.items?.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href ?? "/solutions"}
                        className="group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-4 border-accent-foreground border-t px-4 py-6 hover:bg-background-dimmed focus-visible:-outline-offset-4 sm:px-8 md:grid-cols-[1.1fr_1fr_auto]"
                      >
                        <h3 className="text-2xl! group-hover:text-primary-text">
                          {item.title}
                        </h3>
                        <p className="text-foreground-dimmed max-md:col-start-1 max-md:row-start-2">
                          {item.body}
                        </p>
                        <span className="flex items-center gap-4 text-primary-text max-md:row-span-2 max-md:row-start-1">
                          <span className="hidden text-sm lg:inline">
                            {item.label}
                          </span>
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
