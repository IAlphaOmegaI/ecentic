"use client";

import { CheckIcon, CommerceFilePenIcon, SearchIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import type { AppConfig } from "next-intl";
import { useState } from "react";
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
  responses,
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
    return attribute && values
      ? [
          {
            index,
            label: attribute.title,
            values,
            missing: scenario.missing.includes(index),
          },
        ]
      : [];
  });
  const image = shoppingProductImage(sector, selected);
  return (
    <div
      data-sector-conversation={sector}
      className="relative min-w-0 border-accent-foreground border-y"
    >
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <div className="grid lg:grid-cols-2">
        <div
          className="min-w-0 bg-linear-to-br from-primary/6 via-background to-background px-4 py-8 sm:px-8"
          data-conversation-transcript
        >
          <ShoppingConversation
            provider={
              sector === "travel-and-experiences" ||
              sector === "home-and-furniture"
                ? "gemini"
                : "chatgpt"
            }
            prompt={question.title}
            response={language.response}
            products={[
              {
                name: record.leftTitle,
                label: copy.yourListing,
                image,
                details: fields
                  .slice(0, 2)
                  .map((field) =>
                    field.missing
                      ? `${field.label} · ${language.needsDetail}`
                      : field.values.left,
                  ),
              },
              {
                name: record.rightTitle,
                label: copy.comparisonListing,
                image: shoppingProductImage(sector, selected, true),
                details: fields.slice(0, 2).map((field) => field.values.right),
              },
            ]}
            sample={copy.sample}
            note={responses[selected]}
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
                      onClick={() => setSelected(index)}
                    >
                      <ShoppingFollowUp>{entry.title}</ShoppingFollowUp>
                    </Button>
                  ),
              )}
            </div>
          </ShoppingConversation>
        </div>
        <div
          data-sector-inspection
          className="relative min-w-0 border-accent-foreground border-t bg-background-rich lg:border-t-0 lg:border-l"
        >
          <div className="flex items-center justify-between gap-4 border-accent-foreground border-b px-4 py-5 sm:px-8">
            <div className="flex items-center gap-3">
              <SearchIcon aria-hidden className="size-4 text-primary-text" />
              <h3 className="font-heading text-lg!">{language.inspection}</h3>
            </div>
            <span className="font-mono text-foreground-dimmed text-xs">
              {String(selected + 1).padStart(2, "0")} / 03
            </span>
          </div>
          <div className="grid grid-cols-[128px_1fr] items-center gap-4 px-4 py-8 sm:grid-cols-[160px_1fr] sm:px-8">
            <div className="relative aspect-square">
              <Image
                src={image}
                alt={record.leftTitle}
                fill
                sizes="160px"
                className="object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-foreground-dimmed text-xs">
                {copy.yourListing}
              </p>
              <h4 className="mt-2 font-heading text-xl! leading-snug!">
                {record.leftTitle}
              </h4>
              <p className="mt-4 flex items-center gap-2 text-primary-text text-xs">
                <CommerceFilePenIcon aria-hidden className="size-4 shrink-0" />
                {language.sourceRecord}
              </p>
            </div>
          </div>
          <div className="border-accent-foreground border-t px-4 py-5 sm:px-8">
            <p className="font-medium text-foreground-rich text-sm">
              {language.evidenceHeading}
            </p>
            <p className="mt-2 max-w-[46ch] text-foreground-dimmed text-sm leading-relaxed">
              {language.evidenceBody}
            </p>
          </div>
          <dl className="px-4 sm:px-8">
            {fields.map((field) => (
              <div
                key={field.index}
                data-record-field={sectorFields[sector][field.index]}
                data-record-state={field.missing ? "missing" : "present"}
                className="border-accent-foreground border-t py-5"
              >
                <dt className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 pl-9">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-0.5 left-0 flex size-5 items-center justify-center rounded-full",
                      field.missing
                        ? "bg-warning/15 text-warning-text"
                        : "bg-success/15 text-success-text",
                    )}
                  >
                    {field.missing ? (
                      <span className="size-1.5 rounded-full bg-current" />
                    ) : (
                      <CheckIcon className="size-3" />
                    )}
                  </span>
                  <span className="font-medium text-foreground-rich text-sm">
                    {field.label}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      field.missing ? "text-warning-text" : "text-success-text",
                    )}
                  >
                    {field.missing ? language.needsDetail : language.stated}
                  </span>
                </dt>
                <dd className="mt-3 pl-9">
                  <p className="text-foreground text-sm leading-relaxed">
                    {field.values.left}
                  </p>
                  {field.missing && (
                    <p className="mt-2 text-foreground-dimmed text-xs leading-relaxed">
                      {language.sourceHint}
                    </p>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div className="border-accent-foreground border-t bg-primary/5 px-4 py-5 sm:px-8">
            <p className="text-foreground-dimmed text-xs leading-relaxed">
              {language.inspectionNote}
            </p>
          </div>
        </div>
      </div>
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <Plus className="bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 max-lg:hidden" />
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
    responses: readonly string[];
    copy: AppConfig["Messages"]["round14Sectors"];
    language: AppConfig["Messages"]["round16Shopping"];
  };
}
