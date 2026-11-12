"use client";

import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import { useState } from "react";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";
import type { Sector, ShelfScenario } from "@/content/sectors";
import { FurnitureFootprint } from "./furniture-footprint";
import { SectorRecordArtwork } from "./record-artwork";
import { sectorFields } from "./sector-fields";

export const SectorConversation = ({
  sector,
  questions,
  scenarios,
  records,
  responses,
  attributes,
  copy,
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
  return (
    <div
      data-sector-conversation={sector}
      className="relative min-w-0 border-accent-foreground border-t"
    >
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <p className="px-4 py-6 text-foreground-dimmed text-sm sm:px-8">
        {copy.sample}
      </p>
      <div className="grid border-accent-foreground border-t lg:grid-cols-[5fr_7fr]">
        <div className="relative min-w-0 px-4 py-8 sm:px-8">
          <h3 className="font-heading text-2xl text-foreground-rich">
            {copy.conversation}
          </h3>
          <div className="mt-8 space-y-8" data-conversation-transcript>
            <div className="ml-8 rounded-xl rounded-br-sm bg-background-dimmed px-4 py-5">
              <p className="mb-3 text-foreground-dimmed text-xs">
                {copy.shopper}
              </p>
              <p className="font-medium text-foreground-rich leading-relaxed">
                {question.title}
              </p>
            </div>
            <div className="grid grid-cols-[28px_1fr] gap-4">
              <ProviderLogo
                provider="chatgpt"
                decorative
                className="mt-1 size-7"
              />
              <div>
                <p className="mb-3 font-medium text-foreground-rich text-sm">
                  {copy.assistant}
                </p>
                <p className="text-foreground-dimmed leading-relaxed">
                  {copy.assistantIntro}
                </p>
                <ul className="mt-4 space-y-2">
                  {fields.map((field) => (
                    <li
                      key={field.index}
                      className="flex gap-3 text-foreground-rich text-sm"
                    >
                      <span
                        aria-hidden
                        className="mt-2 size-1 shrink-0 rounded-full bg-primary"
                      />
                      {field.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="ml-8 rounded-xl rounded-br-sm bg-background-dimmed px-4 py-5">
              <p className="text-foreground-rich">{copy.followUp}</p>
            </div>
            <div className="grid grid-cols-[28px_1fr] gap-4">
              <ProviderLogo
                provider="chatgpt"
                decorative
                className="mt-1 size-7"
              />
              <p className="text-foreground-dimmed leading-relaxed">
                {responses[selected]}
              </p>
            </div>
          </div>
          <div className="mt-10 border-accent-foreground border-t pt-6">
            <p className="mb-4 font-medium text-foreground-rich text-sm">
              {copy.questions}
            </p>
            <ol className="grid gap-3">
              {questions.map((entry, index) => (
                <li key={entry.title}>
                  <Button
                    variant={index === selected ? "soft" : "ghost"}
                    color={index === selected ? "primary" : "neutral"}
                    aria-pressed={index === selected}
                    onClick={() => setSelected(index)}
                  >
                    <span className="flex items-start gap-3 whitespace-normal py-1 text-left">
                      <span className="shrink-0 tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{entry.title}</span>
                    </span>
                  </Button>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div
          className="relative min-w-0 border-accent-foreground border-t bg-background-dimmed lg:border-t-0 lg:border-l"
          data-sector-inspection
        >
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 lg:hidden" />
          <div className="px-4 py-8 sm:px-8">
            <p className="text-primary-text text-sm">{copy.inspection}</p>
            <h3 className="mt-3 font-heading text-2xl text-foreground-rich">
              {record.leftTitle}
            </h3>
            <p className="mt-3 font-mono text-foreground-dimmed text-xs">
              {scenario.key}.json
            </p>
            {sector === "home-and-furniture" && selected === 0 ? (
              <FurnitureFootprint
                copy={copy.dimensions}
                source={record.rows[0]?.left ?? ""}
              />
            ) : (
              <div className="mt-4">
                <SectorRecordArtwork sector={sector} />
              </div>
            )}
          </div>
          <dl>
            {fields.map((field) => (
              <div
                key={field.index}
                data-record-field={sectorFields[sector][field.index]}
                data-record-state={field.missing ? "missing" : "present"}
                className={cn(
                  "border-accent-foreground border-t px-4 py-6 sm:px-8",
                  field.missing && "bg-warning/5",
                )}
              >
                <dt className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    <span className="block font-medium text-foreground-rich">
                      {field.label}
                    </span>
                    <code className="mt-2 block text-primary-text text-xs">
                      {sectorFields[sector][field.index]}
                    </code>
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      field.missing ? "text-warning-text" : "text-success-text",
                    )}
                  >
                    {field.missing ? copy.missing : copy.available}
                  </span>
                </dt>
                <dd className="mt-4 grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-foreground-dimmed text-xs">
                      {copy.yourListing}
                    </p>
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        field.missing
                          ? "text-warning-text"
                          : "text-foreground-rich",
                      )}
                    >
                      <code className="whitespace-pre-wrap break-words font-mono text-xs">
                        {field.missing
                          ? "null"
                          : JSON.stringify(field.values.left)}
                      </code>
                    </p>
                  </div>
                  <div>
                    <p className="mb-2 text-foreground-dimmed text-xs">
                      {copy.comparisonListing}
                    </p>
                    <p className="text-foreground-rich text-sm leading-relaxed">
                      <code className="whitespace-pre-wrap break-words font-mono text-xs">
                        {JSON.stringify(field.values.right)}
                      </code>
                    </p>
                  </div>
                  {field.missing && (
                    <div className="border-primary/30 border-l pl-4 sm:col-span-2">
                      <p className="mb-2 text-primary-text text-xs">
                        {copy.sourceFact}
                      </p>
                      <p className="text-foreground-rich text-sm leading-relaxed">
                        <code className="whitespace-pre-wrap break-words font-mono text-xs">
                          {JSON.stringify(field.values.left)}
                        </code>
                      </p>
                    </div>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <Plus className="bottom-0 left-[41.666%] -translate-x-1/2 translate-y-1/2 max-lg:hidden" />
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
  };
}
