"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import { Toggle } from "@zenncore/web/components/toggle";
import type { AppConfig } from "next-intl";
import { type ReactNode, useId, useState } from "react";
import { ComparePanel } from "@/components/marketing/interactive/compare-panel";
import { useInteractive } from "@/components/marketing/interactive/use-interactive";
import type { Sector, ShelfScenario } from "@/content/sectors";

export const CompareShelf = ({
  sector,
  scenarios,
  questions,
  attributes,
  copy,
  shared,
  fallback,
}: CompareShelf.Props) => {
  const { ready, reduced } = useInteractive();
  const [selected, setSelected] = useState(scenarios[0]?.key ?? "");
  const [fixed, setFixed] = useState(false);
  const identifier = useId();
  const position = scenarios.findIndex((scenario) => scenario.key === selected);
  const scenario = scenarios[position];
  const content = copy.scenarios[position];

  if (!ready || !scenario || !content)
    return (
      <div data-compare-shelf={sector} data-shelf-mode="static">
        <p className="border-accent-foreground border-t px-4 py-4 text-foreground-dimmed text-sm md:px-6">
          {shared.exampleLabel}
        </p>
        {fallback}
      </div>
    );

  const rows: ComparePanel.Row[] = attributes.map((attribute, index) => {
    const field = content.rows[index];
    const required = scenario.required.includes(index);
    const missing = !reduced && !fixed && scenario.missing.includes(index);

    return {
      key: `${selected}-${index}`,
      label: attribute.title,
      required,
      left: {
        value: field?.left ?? shared.labels.missing,
        status: missing ? "missing" : required ? "meets" : "present",
      },
      right: {
        value: field?.right ?? shared.labels.missing,
        status: required ? "meets" : "present",
      },
    };
  });
  const reason = reduced || fixed ? content.after : content.before;

  if (reduced)
    return (
      <div
        data-compare-shelf={sector}
        data-shelf-mode="completed"
        className="bg-background-dimmed"
      >
        <div className="border-accent-foreground border-t px-4 py-6 md:px-6">
          <p className="font-medium text-foreground-rich">
            {shared.exampleLabel}
          </p>
          <p className="mt-3 text-foreground">{questions[position]?.title}</p>
          <p className="mt-3 text-foreground text-sm">{shared.afterLabel}</p>
        </div>
        <ComparePanel.Root
          left={{ label: shared.leftLabel, title: content.leftTitle }}
          right={{ label: shared.rightLabel, title: content.rightTitle }}
          rows={rows}
          labels={shared.labels}
        />
        <ComparePanel.Result label={shared.resultLabel}>
          {reason}
        </ComparePanel.Result>
      </div>
    );

  return (
    <div
      data-compare-shelf={sector}
      data-shelf-mode="interactive"
      className="bg-background-dimmed"
    >
      <div className="border-accent-foreground border-t px-4 py-6 md:px-6">
        <p className="flex items-center gap-2 font-medium text-foreground-rich text-sm">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          {shared.exampleLabel}
        </p>
        <p className="mt-3 max-w-[70ch] text-foreground-dimmed text-sm leading-relaxed">
          {shared.description}
        </p>
      </div>
      <Tabs
        value={selected}
        onValueChange={(value) => {
          if (
            typeof value === "string" &&
            scenarios.some((entry) => entry.key === value)
          )
            setSelected(value);
        }}
      >
        <p
          id={`${identifier}-questions`}
          className="px-4 pb-4 font-medium text-foreground-rich text-sm md:px-6"
        >
          {shared.questionsLabel}
        </p>
        <TabsList
          activateOnFocus
          aria-labelledby={`${identifier}-questions`}
          className="grid w-full grid-cols-1 overflow-visible rounded-none border-x-0 border-b-0 sm:grid-cols-3"
        >
          {scenarios.map((entry, index) => (
            <Tab
              key={entry.key}
              value={entry.key}
              className="relative h-auto min-h-24 items-start justify-start gap-3 whitespace-normal border-accent-foreground border-b bg-transparent px-4 py-5 text-left text-foreground-dimmed text-sm leading-relaxed outline-0 transition-colors duration-200 ease-out before:hidden last:border-r-0 focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-4 data-[active]:text-foreground-rich data-selected:text-foreground-rich data-[active]:outline-1 data-[active]:outline-primary data-selected:outline-1 data-selected:outline-primary data-[active]:-outline-offset-1 data-selected:-outline-offset-1 motion-reduce:transition-none max-sm:border-r-0 md:px-6"
            >
              <span
                aria-hidden="true"
                className="mt-2 size-2 shrink-0 rounded-full border border-foreground-dimmed data-selected:border-primary data-selected:bg-primary"
                data-selected={entry.key === selected || undefined}
              />
              {questions[index]?.title}
            </Tab>
          ))}
        </TabsList>
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-6">
          <p className="text-foreground-dimmed text-sm">
            {fixed ? shared.afterLabel : shared.beforeLabel}
          </p>
          <Toggle
            pressed={fixed}
            onPressedChange={setFixed}
            className="h-auto min-h-11 w-auto gap-3 border border-accent-foreground bg-transparent px-4 py-3 text-foreground-rich text-sm transition-colors duration-200 ease-out hover:bg-transparent focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-4 active:bg-transparent data-pressed:border-primary data-pressed:bg-transparent data-pressed:text-foreground-rich motion-reduce:transition-none"
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-full border border-foreground-dimmed data-selected:border-primary data-selected:bg-primary"
              data-selected={fixed || undefined}
            />
            {shared.action.primary}
          </Toggle>
        </div>
        <TabsPanel value={selected}>
          <ComparePanel.Root
            left={{ label: shared.leftLabel, title: content.leftTitle }}
            right={{ label: shared.rightLabel, title: content.rightTitle }}
            rows={rows}
            labels={shared.labels}
          />
        </TabsPanel>
      </Tabs>
      <div aria-live="polite" aria-atomic="true">
        <ComparePanel.Result label={shared.resultLabel}>
          {reason}
        </ComparePanel.Result>
      </div>
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
    fallback: ReactNode;
  };
}
