"use client";

import { CodeIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import { useState } from "react";
import { FormattedSourceTokens } from "@/components/marketing/interactive/published-files/formatted-source";
import { Plus } from "@/components/plus";
import type { Sector, ShelfScenario } from "@/content/sectors";
import {
  ShoppingConversation,
  ShoppingFollowUp,
} from "../../_components/shopping-conversation";
import { shoppingProductImage } from "../../_components/shopping-products";
import { sectorFields } from "./sector-fields";

export const SectorConversation = ({
  sector,
  questions,
  scenarios,
  records,
  attributes,
  copy,
  language,
}: SectorConversation.Props) => {
  const [selected, setSelected] = useState(0);
  const scenario = scenarios[selected];
  const record = records[selected];
  const question = questions[selected];
  if (!scenario || !record || !question) return null;
  const fields = scenario.required.flatMap((index) => {
    const attribute = attributes[index];
    const values = record.rows[index];
    const key = sectorFields[sector][index];
    return attribute && values && key
      ? [
          {
            index,
            key,
            label: attribute.title,
            values,
            missing: scenario.missing.includes(index),
          },
        ]
      : [];
  });
  const missing = fields.filter((field) => field.missing);
  const order = [
    ...new Set([...scenario.required, ...record.rows.map((_, index) => index)]),
  ];
  const imageFit = sector === "travel-and-experiences" ? "cover" : "contain";
  return (
    <div
      data-sector-conversation={sector}
      className="relative min-w-0 border-accent-foreground border-t"
    >
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col" data-conversation-transcript>
          <ShoppingConversation
            provider={
              sector === "travel-and-experiences" ||
              sector === "home-and-furniture"
                ? "gemini"
                : "chatgpt"
            }
            prompt={question.title}
            response={language.responses[sector]}
            products={[
              {
                name: record.leftTitle,
                label: copy.yourListing,
                image: shoppingProductImage(sector, selected),
                imageFit,
                details: order
                  .filter((index) => !scenario.missing.includes(index))
                  .slice(0, 3)
                  .flatMap((index) =>
                    record.rows[index] ? [record.rows[index].left] : [],
                  ),
              },
              {
                name: record.rightTitle,
                label: copy.comparisonListing,
                image: shoppingProductImage(sector, selected, true),
                imageFit,
                details: order
                  .slice(0, 3)
                  .flatMap((index) =>
                    record.rows[index] ? [record.rows[index].right] : [],
                  ),
              },
            ]}
            sample={language.sample}
          >
            <p className="mb-3 text-foreground-dimmed text-xs">
              {language.followUps}
            </p>
            <div className="flex flex-col items-start gap-2">
              {questions.map(
                (entry, index) =>
                  index !== selected && (
                    <Button
                      key={entry.title}
                      variant="ghost"
                      color="neutral"
                      className="h-auto max-w-full py-2"
                      onClick={() => setSelected(index)}
                    >
                      <ShoppingFollowUp>{entry.title}</ShoppingFollowUp>
                    </Button>
                  ),
              )}
            </div>
          </ShoppingConversation>
        </div>
        <aside
          data-sector-inspection
          className="relative flex min-w-0 flex-col border-background-rich/15 border-t bg-emphasis-dimmed text-background-rich lg:border-t-0 lg:border-l"
        >
          <header className="flex items-center justify-between gap-4 border-background-rich/15 border-b px-5 py-6 sm:px-8">
            <p className="flex items-center gap-3 font-mono text-background-rich/80 text-sm">
              <CodeIcon
                aria-hidden
                className="size-4 shrink-0 text-primary-rich"
              />
              source.json
            </p>
            <span className="font-mono text-background-rich/55 text-xs">
              {String(selected + 1).padStart(2, "0")} / 03
            </span>
          </header>
          <div className="px-5 py-7 sm:px-8">
            <p className="text-background-rich/60 text-sm">
              {record.leftTitle}
            </p>
            <h3 className="mt-3 max-w-[22ch] font-heading text-2xl! text-background-rich leading-snug!">
              {language.evidence}
            </h3>
            <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-warning-rich">
              {missing.map((field) => field.label).join(" · ")}
            </p>
          </div>
          <div className="border-background-rich/15 border-y">
            <div className="flex flex-wrap items-center justify-between gap-3 border-background-rich/10 border-b px-5 py-3 text-xs sm:px-8">
              <span className="text-background-rich/65">{language.source}</span>
              <span className="flex items-center gap-2 text-warning-rich">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-current"
                />
                {language.missing}
              </span>
            </div>
            <pre className="min-w-0 py-5 font-mono text-xs leading-7 max-sm:text-xs">
              <code>
                <span className="grid grid-cols-[2.5rem_1fr] px-3 text-background-rich/75">
                  <span
                    aria-hidden
                    className="select-none text-background-rich/35"
                  >
                    1
                  </span>
                  {"{"}
                </span>
                {fields.map((field, index) => (
                  <span
                    key={field.key}
                    data-record-field={field.key}
                    data-record-state={field.missing ? "missing" : "present"}
                    className={cn(
                      "grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] px-3",
                      field.missing && "bg-warning/8",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "select-none border-transparent border-l pl-2 text-background-rich/35",
                        field.missing &&
                          "border-warning-rich text-warning-rich",
                      )}
                    >
                      {index + 2}
                    </span>
                    <span className="whitespace-pre-wrap break-words pr-3 text-background-rich/80 [overflow-wrap:anywhere]">
                      <span className="sr-only">
                        {field.missing ? language.missing : language.present}:{" "}
                      </span>
                      <FormattedSourceTokens
                        source={`  ${JSON.stringify(field.key)}: ${JSON.stringify(field.values.left)}${index < fields.length - 1 ? "," : ""}`}
                      />
                    </span>
                  </span>
                ))}
                <span className="grid grid-cols-[2.5rem_1fr] px-3 text-background-rich/75">
                  <span
                    aria-hidden
                    className="select-none text-background-rich/35"
                  >
                    {fields.length + 2}
                  </span>
                  {"}"}
                </span>
              </code>
            </pre>
          </div>
          <p className="max-w-[52ch] px-5 py-6 text-background-rich/75 text-sm leading-relaxed sm:px-8">
            {language.evidenceNote}
          </p>
          <p className="mt-auto border-background-rich/15 border-t px-5 py-5 text-background-rich/55 text-xs leading-relaxed sm:px-8">
            {language.qualification}
          </p>
        </aside>
      </div>
    </div>
  );
};

export namespace SectorConversation {
  export type Props = {
    sector: Sector;
    questions: readonly { title: string; body: string }[];
    attributes: readonly { title: string; body: string }[];
    scenarios: readonly ShelfScenario[];
    records: AppConfig["Messages"]["interactiveShelf"]["sectors"][Sector]["scenarios"];
    copy: AppConfig["Messages"]["round14Sectors"];
    language: AppConfig["Messages"]["round17Shopping"];
  };
}
