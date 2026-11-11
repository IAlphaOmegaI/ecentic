"use client";

import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";

const shapes = [
  ["rss", "`-- channel", "    `-- item", "", "feed", "`-- entry"].join("\n"),
  ["[]", "`-- {}", "", "products[]", "`-- {}", "", "items[]", "`-- {}"].join(
    "\n",
  ),
  [
    "title | name",
    "description",
    "price",
    "image | image_link | image_url",
    "url | link",
    "sku",
    "id",
  ].join("\n"),
] as const;

export const ProductFeedsFormats = ({
  title,
  rows,
}: ProductFeedsFormats.Props) => (
  <>
    <Tabs defaultValue={0}>
      <div className="px-7 pb-8 max-sm:px-4">
        <TabsList aria-label={title}>
          {rows.slice(0, 3).map((row, index) => (
            <Tab
              key={row.label}
              value={index}
              className="min-h-11 px-6 transition-none"
            >
              {row.label}
            </Tab>
          ))}
          <TabsIndicator className="transition-none" />
        </TabsList>
      </div>
      {rows.slice(0, 3).map((row, index) => (
        <TabsPanel key={row.label} value={index}>
          <div className="grid border-accent-foreground border-t lg:min-h-[328px] lg:grid-cols-[1fr_2fr]">
            <div className="px-7 py-8 max-sm:px-4 lg:border-accent-foreground lg:border-r">
              <pre className="overflow-x-auto font-mono text-primary-text text-sm leading-7">
                {shapes[index]}
              </pre>
            </div>
            <div className="px-7 py-8 max-sm:px-4 max-lg:border-accent-foreground max-lg:border-t">
              <h3>{row.label}</h3>
              <p className="mt-4 max-w-[60ch] text-foreground-dimmed text-lg max-sm:text-base">
                {row.value}
              </p>
              {row.detail && (
                <p className="mt-6 max-w-[60ch] border-primary border-l-2 pl-4 text-foreground-dimmed">
                  {row.detail}
                </p>
              )}
            </div>
          </div>
        </TabsPanel>
      ))}
    </Tabs>
    <dl className="divide-y divide-accent-foreground border-accent-foreground border-t bg-background">
      {rows.slice(3).map((row) => (
        <div
          key={row.label}
          className="grid gap-4 px-7 py-6 max-sm:px-4 lg:grid-cols-[1fr_2fr] lg:gap-8"
        >
          <dt className="font-medium text-foreground-rich">{row.label}</dt>
          <dd className="text-foreground-dimmed">{row.value}</dd>
        </div>
      ))}
    </dl>
  </>
);

export namespace ProductFeedsFormats {
  export type Props = {
    title: string;
    rows: readonly { label: string; value: string; detail?: string }[];
  };
}
