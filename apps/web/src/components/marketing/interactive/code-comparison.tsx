"use client";

import { CodeIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { useState } from "react";
import { Plus } from "@/components/plus";
import { useInteractive } from "./use-interactive";

/** An illustrative record, paired line-for-line with a plain-language explanation. */
export const CodeRecord = ({
  rows,
  state,
  filename,
  label,
}: CodeRecord.Props) => (
  <section
    aria-label={label}
    data-code-record={state}
    className="relative min-w-0 bg-background-rich"
  >
    <header className="flex min-h-14 items-center gap-4 border-accent-foreground border-b px-6 py-4 max-sm:px-4">
      <CodeIcon aria-hidden className="size-6 shrink-0 text-primary-text" />
      <span className="min-w-0 break-all font-mono text-foreground-rich text-sm">
        {filename}
      </span>
    </header>
    <div
      aria-hidden
      className="px-6 pt-6 pb-2 font-mono text-foreground-dimmed text-sm max-sm:px-4"
    >
      {"{"}
    </div>
    <ol className="m-0 list-none p-0">
      {rows.map((row, index) => (
        <li
          key={row.key}
          className="group relative grid min-w-0 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] max-lg:grid-cols-1"
        >
          <div className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-2 px-6 py-4 max-sm:px-4">
            <span
              aria-hidden
              className="pt-0.5 font-mono text-foreground-dimmed text-xs tabular-nums"
            >
              {String(index + 2).padStart(2, "0")}
            </span>
            <code className="min-w-0 whitespace-pre-wrap break-words font-mono text-sm leading-7">
              <span className="text-primary-text">
                {JSON.stringify(row.key)}
              </span>
              <span className="text-foreground-dimmed">{": "}</span>
              <span
                className={cn(
                  "text-foreground-rich",
                  state === "after" &&
                    row.before !== row.after &&
                    "text-success-text",
                )}
              >
                {JSON.stringify(row[state])}
              </span>
              {index < rows.length - 1 && (
                <span className="text-foreground-dimmed">,</span>
              )}
            </code>
          </div>
          <div className="relative flex min-w-0 items-center border-accent-foreground border-l px-6 py-4 max-sm:ml-12 max-sm:px-4 max-lg:ml-16 max-lg:border-l-0 max-lg:pt-0">
            <span
              aria-hidden
              className="absolute top-1/2 left-0 h-px w-4 bg-accent-foreground max-lg:hidden"
            />
            <p className="text-foreground-dimmed text-sm leading-relaxed">
              {row.note}
            </p>
          </div>
        </li>
      ))}
    </ol>
    <div
      aria-hidden
      className="px-6 pt-2 pb-6 font-mono text-foreground-dimmed text-sm max-sm:px-4"
    >
      {"}"}
    </div>
  </section>
);

export namespace CodeRecord {
  export type State = "before" | "after";
  export type Row = {
    key: string;
    before: string | number | boolean | null;
    after: string | number | boolean | null;
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
