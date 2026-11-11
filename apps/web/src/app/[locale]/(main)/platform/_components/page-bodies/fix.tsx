import type { MarketingBodyProps } from "@/components/marketing/body";
import {
  type MarketingPage,
  MarketingSection,
} from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingEyebrow,
} from "@/components/marketing/primitives";
import { FixControls } from "./fix-controls";

const Introduction = ({ section }: { section: MarketingPage.Section }) => (
  <>
    {section.eyebrow && <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>}
    <h2>{section.title}</h2>
    {section.description && (
      <p className="mt-6 max-w-[60ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
        {section.description}
      </p>
    )}
    {section.paragraphs?.map((paragraph) => (
      <p className="mt-4 text-foreground-dimmed" key={paragraph}>
        {paragraph}
      </p>
    ))}
  </>
);

const Ending = ({ section }: { section: MarketingPage.Section }) => {
  if (!section.note && !section.links?.length) return null;

  return (
    <div className="px-8 py-8 max-sm:px-4">
      {section.note && <p className="text-foreground-dimmed">{section.note}</p>}
      {section.links && <MarketingActions actions={section.links} />}
    </div>
  );
};

export const FixBody = ({ sections, sectionChildren }: MarketingBodyProps) => (
  <>
    {sections.map((section) => {
      switch (section.id) {
        case "problem":
          return (
            <MarketingBand
              key={section.id}
              id={section.id}
              className="[&>.marketing-rail>.marketing-guides]:hidden"
            >
              <div className="grid md:grid-cols-[1.1fr_1fr]">
                <div className="px-8 py-12 max-sm:px-4 max-sm:py-8">
                  <Introduction section={section} />
                </div>
                <div className="border-accent-foreground border-t bg-background-dimmed md:border-t-0 md:border-l">
                  {section.items?.map((item, index) => (
                    <article
                      key={item.title}
                      className="grid grid-cols-[40px_1fr] gap-4 border-accent-foreground border-b px-8 py-8 last:border-b-0 max-sm:px-4"
                    >
                      <span
                        aria-hidden="true"
                        className="font-heading text-3xl text-primary-text leading-none"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3>{item.title}</h3>
                        <p className="mt-4 max-w-[40ch] text-foreground-dimmed">
                          {item.body}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              {sectionChildren?.[section.id]}
              <Ending section={section} />
            </MarketingBand>
          );
        case "how-it-works":
          return (
            <MarketingBand
              key={section.id}
              id={section.id}
              className="[&>.marketing-rail>.marketing-guides]:hidden"
            >
              <div className="px-8 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
                <Introduction section={section} />
              </div>
              <FixControls section={section} />
              {sectionChildren?.[section.id]}
              <Ending section={section} />
            </MarketingBand>
          );
        case "why-it-works":
          return (
            <MarketingBand
              key={section.id}
              id={section.id}
              className="[&>.marketing-rail>.marketing-guides]:hidden"
            >
              <div className="px-8 pt-12 pb-8 max-sm:px-4 max-sm:pt-8">
                <Introduction section={section} />
              </div>
              <div className="px-8 pb-12 max-sm:px-4 max-sm:pb-8">
                <div className="border border-accent-foreground bg-background-dimmed px-6 py-6 md:mx-auto md:max-w-[420px]">
                  <p className="font-medium text-primary-text">
                    {sections.find((item) => item.id === "publish")?.title}
                  </p>
                </div>
                <div
                  aria-hidden="true"
                  className="mx-auto hidden h-8 w-px bg-accent-foreground md:block"
                />
                <div className="grid md:grid-cols-3">
                  {section.items?.map((item, index) => (
                    <article key={item.title} className="relative min-w-0">
                      <div
                        aria-hidden="true"
                        className="relative hidden h-8 md:block"
                      >
                        <span className="absolute inset-y-0 left-1/2 w-px bg-accent-foreground" />
                        <span
                          className={
                            index === 0
                              ? "absolute top-0 right-0 left-1/2 h-px bg-accent-foreground"
                              : index === (section.items?.length ?? 0) - 1
                                ? "absolute top-0 right-1/2 left-0 h-px bg-accent-foreground"
                                : "absolute inset-x-0 top-0 h-px bg-accent-foreground"
                          }
                        />
                      </div>
                      <div className="mt-8 border-primary-text border-t px-0 pt-6 md:mx-4 md:mt-0 md:px-2">
                        <p className="mb-6 font-heading text-3xl text-primary-text leading-none">
                          {String(index + 1).padStart(2, "0")}
                        </p>
                        <h3>{item.title}</h3>
                        <p className="mt-4 text-foreground-dimmed">
                          {item.body}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              {sectionChildren?.[section.id]}
              <Ending section={section} />
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
