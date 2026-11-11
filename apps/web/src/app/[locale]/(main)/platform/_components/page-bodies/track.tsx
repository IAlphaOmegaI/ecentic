import { getMessages } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { TrackingOverview } from "@/components/marketing/tracking-overview";
import { TrackComparison } from "./track-comparison";

const scopeIds = [
  "traffic",
  "lift",
  "rescans",
  "stores",
  "developers",
] as const;

export const TrackBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { trackPage } = await getMessages();
  const scope = sections.filter((section) =>
    scopeIds.some((id) => id === section.id),
  );

  return (
    <>
      {sections.map((section) => {
        switch (section.id) {
          case "problem":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&_.marketing-guides]:hidden"
              >
                <div className="grid min-w-0 lg:grid-cols-[7fr_5fr]">
                  <MarketingHeading
                    eyebrow={section.eyebrow}
                    title={section.title}
                    description={section.description}
                  />
                  <div className="min-w-0 border-accent-foreground border-t bg-background-dimmed lg:border-t-0 lg:border-l">
                    {section.items?.map((item, index) => (
                      <article
                        key={item.title}
                        className="grid grid-cols-[24px_1fr] gap-4 border-accent-foreground border-b px-8 py-6 last:border-b-0 max-sm:px-4"
                      >
                        <span
                          aria-hidden="true"
                          className="pt-2 font-mono text-lg text-primary-text"
                        >
                          {index === 0 ? "↳" : index === 1 ? "↻" : "⊞"}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-xl">{item.title}</h3>
                          <p className="mt-2 text-foreground-dimmed">
                            {item.body}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          case "how-it-works":
            return (
              <div key={section.id}>
                <SectionGutter />
                <MarketingBand
                  id={section.id}
                  className="[&_.marketing-guides]:hidden"
                >
                  <MarketingHeading
                    eyebrow={section.eyebrow}
                    title={section.title}
                    description={section.description}
                    className="pb-8"
                  />
                  <TrackComparison content={trackPage} />
                  <ol className="grid list-none border-accent-foreground border-t md:grid-cols-2 lg:grid-cols-4">
                    {section.items?.map((item, index) => (
                      <li
                        key={item.title}
                        className="min-w-0 border-accent-foreground border-b px-8 py-8 last:border-b-0 max-sm:px-4 md:nth-last-2:border-b-0 md:odd:border-r lg:border-r lg:border-b-0 lg:last:border-r-0"
                      >
                        <span
                          aria-hidden="true"
                          className="font-heading text-3xl text-primary-text leading-none"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h3 className="mt-6 text-xl">{item.title}</h3>
                        <p className="mt-4 text-foreground-dimmed">
                          {item.body}
                        </p>
                      </li>
                    ))}
                  </ol>
                  {sectionChildren?.[section.id]}
                </MarketingBand>
              </div>
            );
          case "why-it-works":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&_.marketing-guides]:hidden"
              >
                <MarketingHeading
                  eyebrow={section.eyebrow}
                  title={section.title}
                  description={section.description}
                  className="pb-8"
                />
                <div className="grid min-w-0 border-accent-foreground border-t lg:grid-cols-[5fr_7fr]">
                  <div className="min-w-0 border-accent-foreground border-b bg-background-dimmed px-8 py-8 max-sm:px-4 lg:border-r lg:border-b-0">
                    <h3>{trackPage.attributionLabel}</h3>
                    <ol className="mt-8 list-none">
                      {trackPage.attributionFlow.map((step, index) => (
                        <li
                          key={step}
                          className="relative grid grid-cols-[24px_1fr] gap-4 pb-6 before:absolute before:top-6 before:bottom-0 before:left-2 before:border-accent-foreground before:border-l last:pb-0 last:before:hidden"
                        >
                          <span
                            aria-hidden="true"
                            className="font-mono text-primary-text"
                          >
                            {index === 0 ? "●" : "↓"}
                          </span>
                          <span className="min-w-0">{step}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-8 border-accent-foreground border-t pt-6 font-medium text-foreground-rich">
                      {trackPage.attributionNote}
                    </p>
                  </div>
                  <div className="min-w-0">
                    {section.items?.map((item) => (
                      <article
                        key={item.title}
                        className="border-accent-foreground border-b px-8 py-8 last:border-b-0 max-sm:px-4"
                      >
                        <h3 className="text-xl">{item.title}</h3>
                        <p className="mt-2 max-w-[58ch] text-foreground-dimmed">
                          {item.body}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          case "what-to-track":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&_.marketing-guides]:hidden"
              >
                <MarketingHeading
                  eyebrow={section.eyebrow}
                  title={section.title}
                  description={section.description}
                />
                <TrackingOverview
                  items={section.items ?? []}
                  label={section.title}
                />
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          case "traffic":
            return (
              <div key={section.id}>
                <SectionGutter />
                <MarketingBand className="[&_.marketing-guides]:hidden">
                  <MarketingHeading
                    title={trackPage.referenceTitle}
                    description={trackPage.referenceDescription}
                    className="pb-8"
                  />
                  {scope.map((entry) => (
                    <section
                      key={entry.id}
                      id={entry.id}
                      className="grid min-w-0 scroll-mt-24 border-accent-foreground border-t px-8 py-8 max-sm:px-4 md:grid-cols-[4fr_8fr] md:gap-8"
                    >
                      <h3 className="text-xl">{entry.title}</h3>
                      <div className="min-w-0 max-md:mt-4">
                        {entry.paragraphs?.map((paragraph) => (
                          <p
                            key={paragraph}
                            className="max-w-[70ch] text-foreground-dimmed"
                          >
                            {paragraph}
                          </p>
                        ))}
                        <MarketingActions actions={entry.links ?? []} />
                        {sectionChildren?.[entry.id]}
                      </div>
                    </section>
                  ))}
                </MarketingBand>
              </div>
            );
          case "lift":
          case "rescans":
          case "stores":
          case "developers":
            return null;
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
