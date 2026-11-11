import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { DuaEvidence } from "@/components/marketing/measured-evidence";
import {
  type MarketingPage,
  MarketingSection,
} from "@/components/marketing/page";
import { MarketingBand } from "@/components/marketing/primitives";
import { DuaDisclosures } from "./dua-disclosures";

export const DuaStory = ({ sections }: DuaStory.Props) => {
  const overview = sections.find((section) => section.id === "at-a-glance");
  const rows = overview?.rows?.filter(
    (row) => row.label.trim() && row.value.trim(),
  );
  const result = sections.find((section) => section.id === "result");
  const disclosures = sections.filter(
    (section) =>
      (section.id === "method" || section.id === "permission") &&
      (section.description?.trim() ||
        section.paragraphs?.some((paragraph) => paragraph.trim()) ||
        section.note?.trim() ||
        section.links?.some((link) => link.label.trim() && link.href.trim())),
  );
  const narrative = sections.filter(
    (section) =>
      !["at-a-glance", "result", "method", "permission"].includes(section.id),
  );

  return (
    <>
      {overview && rows && rows.length > 0 && (
        <MarketingBand
          id={overview.id}
          className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed"
        >
          <div className="grid min-[801px]:grid-cols-[1fr_2fr]">
            <div className="relative min-w-0 border-accent-foreground px-7 py-10 max-sm:px-4 max-sm:py-8 max-[801px]:border-b min-[801px]:border-r">
              <h2>{overview.title}</h2>
              {overview.description && (
                <p className="mt-4 max-w-[36ch] text-foreground-dimmed">
                  {overview.description}
                </p>
              )}
            </div>
            <dl className="min-w-0 divide-y divide-accent-foreground">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[minmax(96px,1fr)_2fr] gap-6 px-7 py-6 max-sm:grid-cols-1 max-sm:gap-2 max-sm:px-4"
                >
                  <dt className="text-foreground-dimmed">{row.label}</dt>
                  <dd className="min-w-0 font-medium text-foreground-rich">
                    {row.value}
                    {row.detail && (
                      <p className="mt-2 font-normal text-foreground-dimmed text-sm">
                        {row.detail}
                      </p>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </MarketingBand>
      )}

      {narrative.map((section) => (
        <MarketingSection key={section.id} section={section} />
      ))}

      {result && (
        <>
          <SectionGutter />
          <MarketingBand
            id={result.id}
            className="[&>.marketing-rail>.marketing-guides]:hidden"
          >
            <div className="px-7 py-10 max-sm:px-4 max-sm:py-8">
              <h2>{result.title}</h2>
              {result.paragraphs
                ?.filter((paragraph) => paragraph.trim())
                .map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 max-w-[65ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base"
                  >
                    {paragraph}
                  </p>
                ))}
            </div>
            <DuaEvidence />
          </MarketingBand>
        </>
      )}

      {disclosures.length > 0 && (
        <>
          <SectionGutter />
          <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed">
            <DuaDisclosures sections={disclosures} />
          </MarketingBand>
        </>
      )}
    </>
  );
};

export namespace DuaStory {
  export type Props = { sections: readonly MarketingPage.Section[] };
}
