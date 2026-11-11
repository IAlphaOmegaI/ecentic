"use client";

import { CodeIcon } from "@zenncore/icons";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { useState } from "react";
import { Plus } from "@/components/plus";
import { FormattedSource } from "./published-files/formatted-source";
import { useInteractive } from "./use-interactive";

/** Format a complete JSON property; each group keeps its explanatory annotation. */
const propertySource = (
  row: CodeRecord.Row,
  state: CodeRecord.State,
  final: boolean,
) =>
  JSON.stringify({ [row.key]: row[state] }, null, 2)
    .split("\n")
    .slice(1, -1)
    .join("\n") + (final ? "" : ",");

export const CodeRecord = ({
  rows,
  state,
  filename,
  label,
}: CodeRecord.Props) => {
  const groups = rows.map((row, index) => ({
    ...row,
    source: propertySource(row, state, index === rows.length - 1),
    line:
      2 +
      rows
        .slice(0, index)
        .reduce(
          (total, previous) =>
            total + propertySource(previous, state, false).split("\n").length,
          0,
        ),
  }));
  const finalLine =
    2 +
    groups.reduce((total, group) => total + group.source.split("\n").length, 0);
  return (
    <section
      aria-label={label}
      data-code-record={state}
      className="relative min-w-0 bg-background-rich"
    >
      <header className="relative flex min-h-14 items-center gap-4 border-accent-foreground border-b px-6 py-4 max-sm:px-4">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <CodeIcon aria-hidden className="size-6 shrink-0 text-primary-text" />
        <span className="min-w-0 break-all font-mono text-foreground-rich text-sm">
          {filename}
        </span>
      </header>
      <div className="relative min-w-0 bg-emphasis-dimmed bg-radial-[at_0%_0%] from-primary-dimmed/70 via-transparent to-transparent">
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] max-lg:grid-cols-1">
          <FormattedSource source="{" />
          <div
            aria-hidden
            className="relative border-background-rich/15 border-l bg-background-rich/3 max-lg:hidden"
          >
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 [&>span]:bg-background-rich/35" />
          </div>
        </div>
        <ol className="m-0 list-none p-0">
          {groups.map((group) => (
            <li
              key={group.key}
              data-code-property={group.key}
              className="relative grid min-w-0 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] max-lg:grid-cols-1"
            >
              <div className="min-w-0 [&>pre]:py-3">
                <FormattedSource source={group.source} startLine={group.line} />
              </div>
              <div className="relative flex min-w-0 items-center border-background-rich/15 border-l bg-background-rich/3 px-7 py-5 max-sm:pr-4 max-sm:pl-12 max-lg:border-l-0 max-lg:bg-transparent max-lg:pt-0 max-lg:pl-16">
                <span
                  aria-hidden
                  className="absolute top-1/2 left-0 h-px w-4 bg-primary-rich/50 max-lg:hidden"
                />
                <p className="max-w-[42ch] text-background-rich/75 text-sm leading-relaxed">
                  {group.note}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] max-lg:grid-cols-1">
          <FormattedSource source="}" startLine={finalLine} />
          <div
            aria-hidden
            className="relative border-background-rich/15 border-l bg-background-rich/3 max-lg:hidden"
          >
            <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2 [&>span]:bg-background-rich/35" />
          </div>
        </div>
      </div>
    </section>
  );
};

export namespace CodeRecord {
  export type State = "before" | "after";
  export type Value =
    | string
    | number
    | boolean
    | null
    | readonly Value[]
    | { readonly [key: string]: Value };
  export type Row = {
    key: string;
    before: Value;
    after: Value;
    note: string;
  };
  export type Props = {
    rows: readonly Row[];
    state: State;
    filename: string;
    label: string;
  };
}

export const AnnotatedCodeComparison = ({
  title,
  sampleLabel,
  before,
  after,
  note,
  filename,
  rows,
}: AnnotatedCodeComparison.Props) => {
  const { ready, reduced } = useInteractive();
  const [state, setState] = useState<CodeRecord.State>("before");
  const states = ["before", "after"] as const;
  const labels = { before, after };
  return (
    <div
      data-code-comparison
      className="relative min-w-0 border-accent-foreground border-t"
    >
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <header className="flex flex-wrap items-end justify-between gap-6 px-8 py-8 max-sm:px-4">
        <div>
          <p className="mb-4 text-primary-text text-sm">{sampleLabel}</p>
          <h3 className="text-2xl">{title}</h3>
        </div>
      </header>
      {!ready || reduced ? (
        <div data-code-static className="grid gap-0">
          {states.map((value) => (
            <div
              key={value}
              className="min-w-0 border-accent-foreground border-t"
            >
              <h4 className="bg-background-dimmed px-8 py-4 font-medium max-sm:px-4">
                {labels[value]}
              </h4>
              <CodeRecord
                rows={rows}
                state={value}
                filename={filename}
                label={`${title} — ${labels[value]}`}
              />
            </div>
          ))}
        </div>
      ) : (
        <Tabs
          value={state}
          onValueChange={(value) => {
            if (value === "before" || value === "after") setState(value);
          }}
        >
          <TabsList
            aria-label={title}
            className="grid w-full grid-cols-2 overflow-visible rounded-none border-x-0 bg-background"
          >
            {states.map((value) => (
              <Tab
                key={value}
                value={value}
                className="group min-h-14 gap-3 px-6 text-base outline-1 outline-transparent -outline-offset-1 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-solid focus-visible:-outline-offset-2 data-[active]:text-foreground-rich data-selected:text-foreground-rich data-[active]:outline-primary data-selected:outline-primary"
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full bg-foreground-dimmed group-data-[active]:bg-primary group-data-selected:bg-primary"
                />
                {labels[value]}
              </Tab>
            ))}
          </TabsList>
          {states.map((value) => (
            <TabsPanel
              key={value}
              value={value}
              className="min-w-0 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-solid focus-visible:-outline-offset-2"
            >
              <CodeRecord
                rows={rows}
                state={value}
                filename={filename}
                label={`${title} — ${labels[value]}`}
              />
            </TabsPanel>
          ))}
        </Tabs>
      )}
      <p className="border-accent-foreground border-t px-8 py-6 text-foreground-dimmed text-sm leading-relaxed max-sm:px-4">
        {note}
      </p>
    </div>
  );
};

export namespace AnnotatedCodeComparison {
  export type Props = {
    title: string;
    sampleLabel: string;
    before: string;
    after: string;
    note: string;
    filename: string;
    rows: readonly CodeRecord.Row[];
  };
}
