import type { AppConfig } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import {
  CodeDiff,
  type CodeRecord,
} from "@/components/marketing/interactive/code-comparison";
import { Plus } from "@/components/plus";
import type { Sector, ShelfScenario } from "@/content/sectors";
import { SectorRecordArtwork } from "./record-artwork";
import { SectorBrandReferences } from "./sector-brand-references";
import { sectorFields } from "./sector-fields";

/** Sample records preserve the source facts; null only represents an omitted field. */
export const CompareShelf = async ({
  sector,
  scenarios,
  questions,
  attributes,
  copy,
  shared,
  presentation,
  referenceCopy,
  fallback,
}: CompareShelf.Props) => {
  const { round14Sectors } = await getMessages();
  const position = 0;
  const scenario = scenarios[position];
  const content = copy.scenarios[position];
  if (!scenario || !content) return fallback;

  const record = (side: "left" | "right", restored: boolean) => ({
    product: side === "left" ? content.leftTitle : content.rightTitle,
    ...Object.fromEntries(
      attributes.map((attribute, index) => [
        sectorFields[sector][index] ?? attribute.title,
        side === "left" && !restored && scenario.missing.includes(index)
          ? null
          : (content.rows[index]?.[side] ?? null),
      ]),
    ),
  });
  const question = questions[position]?.title ?? content.leftTitle;
  const rows: CodeRecord.Row[] = [
    {
      key: "shopper_question",
      before: question,
      after: question,
      note: `${presentation.questionNote} ${presentation.required}: ${scenario.required
        .map((index) => attributes[index]?.title)
        .filter(Boolean)
        .join(" · ")}.`,
    },
    {
      key: "your_listing",
      before: record("left", false),
      after: record("left", true),
      note: presentation.yourNote,
    },
    {
      key: "comparison_listing",
      before: record("right", true),
      after: record("right", true),
      note: presentation.rivalNote,
    },
  ];
  const labels = { before: shared.beforeLabel, after: shared.afterLabel };

  return (
    <div
      data-compare-shelf={sector}
      data-shelf-mode="diff"
      className="relative min-w-0 bg-emphasis-dimmed"
    >
      <SectorBrandReferences sector={sector} copy={referenceCopy} />
      <header className="relative border-accent-foreground border-t px-4 py-6 sm:px-8">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <p className="mb-4 font-medium text-primary-text text-sm">
          {shared.exampleLabel}
        </p>
        <h3 className="text-2xl">{presentation.title}</h3>
        <p className="mt-3 max-w-[70ch] text-foreground-dimmed text-sm">
          {presentation.description}
        </p>
      </header>
      <div
        className="relative grid border-accent-foreground border-t md:grid-cols-[5fr_7fr]"
        data-sector-before-fix
      >
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <div className="min-w-0 px-4 py-8 sm:px-8">
          <p className="text-primary-text text-sm">
            {round14Sectors.sourceHeading}
          </p>
          <h4 className="mt-3 font-heading text-2xl text-foreground-rich">
            {content.leftTitle}
          </h4>
          <p className="mt-4 max-w-[48ch] text-foreground-dimmed leading-relaxed">
            {question}
          </p>
          <dl className="mt-6 divide-y divide-accent-foreground border-accent-foreground border-y">
            {scenario.missing.map((index) => (
              <div key={index} className="grid gap-2 py-4">
                <dt className="mb-2 text-primary-text text-sm">
                  {attributes[index]?.title}
                </dt>
                <dd className="text-foreground-rich text-sm leading-relaxed">
                  {content.rows[index]?.left}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex min-w-0 items-center border-accent-foreground border-t px-4 py-8 sm:px-8 md:border-t-0 md:border-l">
          <SectorRecordArtwork sector={sector} surface="dark" />
        </div>
      </div>
      <p
        data-sector-source-note
        className="marketing-seam border-accent-foreground border-y px-4 py-6 text-foreground-dimmed text-sm leading-relaxed sm:px-8"
      >
        {round14Sectors.comparisonIntro}
      </p>
      <CodeDiff
        rows={rows}
        filename={`${sector}-comparison.json`}
        label={shared.exampleLabel}
        before={labels.before}
        after={labels.after}
      />
      <div className="grid border-accent-foreground border-t md:grid-cols-2">
        {(["before", "after"] as const).map((value) => (
          <section
            key={value}
            className="min-w-0 border-accent-foreground px-4 py-6 last:border-t sm:px-8 md:last:border-t-0 md:last:border-l"
          >
            <h4 className="text-foreground-rich text-lg">{labels[value]}</h4>
            <p className="mt-4 max-w-[65ch] text-foreground-dimmed text-sm leading-relaxed">
              {content[value]}
            </p>
          </section>
        ))}
      </div>
      <p className="relative border-accent-foreground border-t px-4 py-6 text-foreground-dimmed text-sm sm:px-8">
        {presentation.format}
      </p>
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
    </div>
  );
};

export namespace CompareShelf {
  export type Props = {
    sector: Sector;
    scenarios: readonly ShelfScenario[];
    questions: readonly { title: string; body: string }[];
    attributes: readonly { title: string; body: string }[];
    copy: AppConfig["Messages"]["interactiveShelf"]["sectors"][Sector];
    shared: AppConfig["Messages"]["interactiveShelf"]["shared"];
    presentation: AppConfig["Messages"]["sectorReview"]["code"];
    referenceCopy: AppConfig["Messages"]["sectorReview"]["references"];
    fallback: ReactNode;
  };
}
