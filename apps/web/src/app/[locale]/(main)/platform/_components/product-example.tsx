"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";

export const ProductExample = ({ content }: ProductExample.Props) => (
  <Tabs defaultValue="before">
    <div className="px-4 pb-8 sm:px-8">
      <p className="marketing-note text-(length:--text-sm) mt-6 text-foreground-dimmed">
        {content.label}
      </p>
      <h3 className="mt-4">{content.product}</h3>
      <TabsList aria-label={content.label} className="mt-6 rounded-sm">
        <Tab
          value="before"
          className="px-4 data-active:bg-primary data-selected:bg-primary"
        >
          {content.before}
        </Tab>
        <Tab
          value="after"
          className="px-4 data-active:bg-primary data-selected:bg-primary"
        >
          {content.after}
        </Tab>
      </TabsList>
    </div>
    {(["before", "after"] as const).map((state) => (
      <TabsPanel key={state} value={state} keepMounted>
        <dl className="marketing-rows border-[var(--rail-color)] border-b [&>div]:grid [&>div]:grid-cols-[minmax(140px,1fr)_2fr] [&>div]:gap-7 [&>div]:border-[var(--rail-color)] [&>div]:border-t [&>div]:px-7 [&>div]:py-6 max-sm:[&>div]:grid-cols-1 max-sm:[&>div]:gap-2 max-sm:[&>div]:px-4 [&_dd]:m-0 [&_dt]:font-medium [&_dt]:text-foreground-rich">
          {content.rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row[state]}</dd>
            </div>
          ))}
        </dl>
      </TabsPanel>
    ))}
    <p className="marketing-note text-(length:--text-sm) mt-6 px-4 py-8 text-foreground-dimmed sm:px-8">
      {content.note}
    </p>
  </Tabs>
);

export namespace ProductExample {
  export type Props = {
    content: {
      label: string;
      product: string;
      before: string;
      after: string;
      note: string;
      rows: readonly { label: string; before: string; after: string }[];
    };
  };
}
