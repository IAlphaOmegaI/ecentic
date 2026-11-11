import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { getMessages } from "next-intl/server";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingEyebrow,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { EnterpriseEngagements } from "./enterprise-engagements";

export const EnterpriseBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { enterprisePage, enterpriseSolutions } = await getMessages();
  const security = sections.find((section) => section.id === "security");

  return (
    <>
      {sections.map((section) => {
        switch (section.id) {
          case "ways-to-start":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="px-4 py-8 sm:px-8 sm:py-12">
                  {section.eyebrow && (
                    <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                  )}
                  <h2>{section.title}</h2>
                  <p className="mt-4 max-w-[60ch] text-foreground-dimmed text-lg max-sm:text-base">
                    {enterprisePage.engagements.description}
                  </p>
                </div>
                <EnterpriseEngagements
                  items={section.items ?? []}
                  content={enterprisePage.engagements}
                  action={enterpriseSolutions.business.enterprise.actions[0]}
                />
                {sectionChildren?.[section.id]}
                {section.note && (
                  <p className="border-accent-foreground border-t px-4 py-6 text-foreground-dimmed text-sm sm:px-8">
                    {section.note}
                  </p>
                )}
              </MarketingBand>
            );
          case "measures":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="relative grid gap-px bg-accent-foreground lg:grid-cols-2">
                  <div className="flex min-w-0 flex-col bg-background-dimmed px-4 py-8 sm:px-8 sm:py-12">
                    {section.eyebrow && (
                      <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                    )}
                    <h2>{section.title}</h2>
                    <p className="mt-6 max-w-[46ch] text-foreground-dimmed text-lg max-sm:text-base">
                      {enterprisePage.measures.description}
                    </p>
                    {section.note && (
                      <p className="mt-8 max-w-[55ch] border-accent-foreground border-t pt-6 text-foreground-dimmed text-sm lg:mt-auto lg:pt-8">
                        {section.note}
                      </p>
                    )}
                  </div>
                  <dl className="min-w-0 bg-background">
                    {section.items?.map((item, index) => (
                      <div
                        key={item.title}
                        className="grid grid-cols-[32px_1fr] gap-x-4 gap-y-2 border-accent-foreground border-b px-4 py-6 last:border-b-0 sm:grid-cols-[40px_1fr] sm:px-8"
                      >
                        <span
                          aria-hidden="true"
                          className="row-span-2 pt-1 text-primary-text text-sm tabular-nums"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <dt className="font-medium text-2xl text-foreground-rich tracking-tight">
                          {item.title}
                        </dt>
                        <dd className="col-start-2 m-0 max-w-[45ch] text-foreground-dimmed">
                          {item.body}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Plus className="bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 max-lg:hidden" />
                </div>
                {sectionChildren?.[section.id] && (
                  <div className="px-4 pb-8 sm:px-8 sm:pb-12">
                    {sectionChildren[section.id]}
                  </div>
                )}
              </MarketingBand>
            );
          case "what-we-need":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="relative grid gap-px bg-accent-foreground lg:grid-cols-2">
                  <div className="min-w-0 bg-background">
                    <div className="px-4 pt-8 pb-6 sm:px-8 sm:pt-12">
                      {section.eyebrow && (
                        <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                      )}
                      <h2>{section.title}</h2>
                    </div>
                    <dl className="px-4 pb-8 sm:px-8 sm:pb-12">
                      {section.rows
                        ?.filter((row) => row.value.trim())
                        .map((row, index) => (
                          <div
                            key={row.label}
                            className="relative border-accent-foreground border-t py-6 last:pb-0"
                          >
                            <dt className="flex items-baseline gap-4 font-medium text-foreground-rich text-xl tracking-tight">
                              <span
                                aria-hidden="true"
                                className="text-primary-text text-sm tabular-nums"
                              >
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              {row.label}
                            </dt>
                            <dd className="mt-4 ml-8 max-w-[46ch] text-foreground-dimmed">
                              {row.value}
                              {row.detail && (
                                <p className="mt-2 text-sm">{row.detail}</p>
                              )}
                            </dd>
                          </div>
                        ))}
                    </dl>
                    {sectionChildren?.[section.id]}
                  </div>
                  {security && (
                    <section
                      id={security.id}
                      className="min-w-0 scroll-mt-24 bg-background-dimmed"
                    >
                      <div className="px-4 pt-8 pb-6 sm:px-8 sm:pt-12">
                        {security.eyebrow && (
                          <MarketingEyebrow>
                            {security.eyebrow}
                          </MarketingEyebrow>
                        )}
                        <h2>{security.title}</h2>
                      </div>
                      <div className="px-4 pb-8 sm:px-8 sm:pb-12">
                        {security.items
                          ?.filter((item) => item.body.trim())
                          .map((item) => (
                            <article
                              key={item.title}
                              className="border-accent-foreground border-t py-6 last:pb-0"
                            >
                              <h3 className="text-xl!">{item.title}</h3>
                              <p className="mt-4 max-w-[48ch] text-foreground-dimmed">
                                {item.body}
                              </p>
                            </article>
                          ))}
                        <MarketingActions
                          actions={security.links ?? []}
                          tone="inverse"
                        />
                      </div>
                      {sectionChildren?.[security.id]}
                    </section>
                  )}
                  <Plus className="top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
                </div>
              </MarketingBand>
            );
          case "security":
            return null;
          case "checklist":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="relative grid lg:grid-cols-[1fr_2fr]">
                  <div className="px-4 py-8 sm:px-8 sm:py-12">
                    {section.eyebrow && (
                      <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                    )}
                    <h2>{section.title}</h2>
                  </div>
                  <Accordion className="min-w-0 border-accent-foreground lg:border-l">
                    {section.rows
                      ?.filter((row) => row.value.trim())
                      .map((row) => (
                        <AccordionItem
                          key={row.label}
                          value={row.label}
                          className="border-accent-foreground last:border-b-0 max-lg:first:border-t"
                        >
                          <AccordionTrigger
                            className="items-center px-4 py-6 text-base hover:bg-background-dimmed focus-visible:-outline-offset-4 sm:px-8"
                            classList={{
                              trigger: {
                                icon: "size-4 shrink-0 motion-reduce:transition-none",
                              },
                            }}
                          >
                            {row.label}
                          </AccordionTrigger>
                          <AccordionPanel className="motion-reduce:transition-none">
                            <div className="px-4 pb-6 sm:px-8">
                              <p className="max-w-[62ch] text-foreground-dimmed">
                                {row.value}
                              </p>
                              {row.detail && (
                                <p className="mt-2 text-sm">{row.detail}</p>
                              )}
                            </div>
                          </AccordionPanel>
                        </AccordionItem>
                      ))}
                  </Accordion>
                  <Plus className="top-0 left-1/3 -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
                </div>
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          default:
            return (
              <MarketingSection key={section.id} section={section}>
                {sectionChildren?.[section.id]}
              </MarketingSection>
            );
        }
      })}
    </>
  );
};
