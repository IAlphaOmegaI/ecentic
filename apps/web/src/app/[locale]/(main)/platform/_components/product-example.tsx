"use client";

import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";

export const ProductExample = ({ content }: ProductExample.Props) => (
  <Tabs defaultValue="before">
    <div className="px-4 pb-8 sm:px-8">
      <p className="marketing-note">{content.label}</p>
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
        <dl className="marketing-rows">
          {content.rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row[state]}</dd>
            </div>
          ))}
        </dl>
      </TabsPanel>
    ))}
    <p className="marketing-note px-4 py-8 sm:px-8">{content.note}</p>
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
