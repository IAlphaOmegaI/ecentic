"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Toggle } from "@zenncore/web/components/toggle";
import type { AppConfig } from "next-intl";
import { type ReactNode, useState } from "react";
import { CodeRecord } from "@/components/marketing/interactive/code-comparison";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import { Plus } from "@/components/plus";
import type { Sector, ShelfScenario } from "@/content/sectors";
import { SectorBrandReferences } from "./sector-brand-references";

const fieldKeys = {
  "wine-and-spirits": [
    "strength",
    "age",
    "origin",
    "style",
    "size_and_price",
    "availability",
  ],
  "food-and-beverage": [
    "diet",
    "allergens",
    "nutrition",
    "size_and_value",
    "ingredients",
    "freshness_and_delivery",
  ],
  "beauty-and-personal-care": [
    "skin_or_hair_type",
    "ingredients",
    "free_from",
    "protection",
    "size_and_price",
    "certifications",
  ],
  "consumer-electronics": [
    "model",
    "battery_and_power",
    "compatibility",
    "connectivity",
    "warranty",
    "condition",
  ],
  "home-and-furniture": [
    "dimensions",
    "materials",
    "capacity",
    "assembly",
    "delivery",
    "returns",
  ],
  "fashion-and-outdoor": [
    "size_and_fit",
    "materials",
    "performance",
    "use",
    "care",
    "variants",
  ],
  "health-wellness-and-pet": [
    "intended_user",
    "ingredients",
    "use_guidance",
    "standards_and_testing",
    "size_and_servings",
    "purpose",
  ],
  "travel-and-experiences": [
    "availability",
    "price",
    "inclusions",
    "cancellation",
    "location_and_access",
    "suitability",
  ],
} as const;

/** Sample records preserve the source facts; null only represents an omitted field. */
export const CompareShelf = ({
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
  const { ready, reduced } = useInteractive();
  const [fixed, setFixed] = useState(false);
  const position = 0;
  const scenario = scenarios[position];
  const content = copy.scenarios[position];
  if (!scenario || !content) return fallback;

  const record = (side: "left" | "right", restored: boolean) => ({
    product: side === "left" ? content.leftTitle : content.rightTitle,
    ...Object.fromEntries(
      attributes.map((attribute, index) => [
        fieldKeys[sector][index] ?? attribute.title,
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
  const state = fixed ? "after" : "before";
  const labels = { before: shared.beforeLabel, after: shared.afterLabel };

  return (
    <div
      data-compare-shelf={sector}
      data-shelf-mode={ready && !reduced ? "interactive" : "static"}
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
      <ol
        data-sector-question-paths
        className="relative grid border-accent-foreground border-t md:grid-cols-3"
      >
        {scenarios.map((entry, index) => (
          <li
            key={entry.key}
            className="relative flex min-w-0 flex-col border-accent-foreground not-first:border-t px-4 py-6 sm:px-8 md:not-first:border-t-0 md:not-first:border-l"
          >
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 md:hidden" />
            <span className="mb-4 font-heading text-3xl text-primary-text">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="max-w-[32ch] font-medium text-foreground-rich leading-relaxed">
              {questions[index]?.title}
            </p>
            <div className="mt-auto flex flex-col pt-5">
              <ArrowRightIcon
                className="mb-4 size-5 rotate-90 text-primary-text"
                aria-hidden
              />
              <p className="text-foreground-dimmed text-sm">
                {presentation.required}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {entry.required.map((field) => (
                  <li
                    key={field}
                    className="rounded border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-primary-text text-xs"
                  >
                    {fieldKeys[sector][field] ?? attributes[field]?.title}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
      <p className="border-accent-foreground border-t px-4 py-5 text-foreground-dimmed text-sm sm:px-8">
        {presentation.sampleNote}
      </p>
      {ready && !reduced ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-b px-4 py-5 sm:px-8">
            <p
              className="font-medium text-foreground-rich text-sm"
              aria-live="polite"
            >
              {labels[state]}
            </p>
            <Toggle
              pressed={fixed}
              onPressedChange={setFixed}
              className="h-auto min-h-11 w-auto shrink-0 gap-3 whitespace-nowrap rounded-md border border-accent-foreground px-4 py-3 text-sm data-pressed:border-primary data-pressed:text-primary-text"
            >
              {fixed ? presentation.before : presentation.after}
            </Toggle>
          </div>
          <CodeRecord
            rows={rows}
            state={state}
            filename={`${sector}-comparison.json`}
            label={`${shared.exampleLabel} — ${labels[state]}`}
          />
          <div
            className="border-accent-foreground border-t px-4 py-6 sm:px-8"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="font-medium text-foreground-rich text-sm">
              {shared.resultLabel}
            </p>
            <p className="mt-3 max-w-[75ch] text-foreground-dimmed">
              {fixed ? content.after : content.before}
            </p>
          </div>
        </>
      ) : (
        <div data-code-static>
          {(["before", "after"] as const).map((value) => (
            <div key={value} className="border-accent-foreground border-t">
              <h4 className="px-4 py-5 text-foreground-rich sm:px-8">
                {labels[value]}
              </h4>
              <CodeRecord
                rows={rows}
                state={value}
                filename={`${sector}-comparison.json`}
                label={`${shared.exampleLabel} — ${labels[value]}`}
              />
              <p className="px-4 py-6 text-foreground-dimmed sm:px-8">
                {content[value]}
              </p>
            </div>
          ))}
        </div>
      )}
      <p className="border-accent-foreground border-t px-4 py-6 text-foreground-dimmed text-sm sm:px-8">
        {presentation.format}
      </p>
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
