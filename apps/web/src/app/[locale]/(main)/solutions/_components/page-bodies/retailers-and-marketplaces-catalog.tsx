"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { useMessages } from "next-intl";
import type { MarketingPage } from "@/components/marketing/page";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

export const RetailersCatalogRoutes = ({
  items,
  content,
}: RetailersCatalogRoutes.Props) => (
  <Tabs
    defaultValue={items[0]?.title}
    orientation="vertical"
    className="relative grid grid-cols-[1fr_2fr] border-accent-foreground border-t max-md:grid-cols-1"
  >
    <div className="min-w-0 border-accent-foreground border-r bg-background-dimmed px-6 py-8 max-sm:px-4 max-sm:py-6 max-md:border-r-0 max-md:border-b">
      <p className="mb-4 text-foreground-dimmed text-sm">{content.select}</p>
      <TabsList
        aria-label={content.select}
        className="flex w-full flex-col gap-2 overflow-visible rounded-none border-0"
      >
        {items.map((item, index) => (
          <Tab
            key={item.title}
            value={item.title}
            className="h-auto min-h-16 justify-start gap-4 rounded-md border-0 px-4 py-4 text-left text-base leading-snug before:hidden hover:bg-background focus-visible:outline-2 focus-visible:outline-primary-text focus-visible:outline-offset-2 data-[active]:bg-primary-text data-selected:bg-primary-text"
          >
            <span aria-hidden className="text-sm opacity-70">
              {String(index + 1).padStart(2, "0")}
            </span>
            {item.title}
          </Tab>
        ))}
      </TabsList>
    </div>
    {items.map((item, index) => (
      <TabsPanel
        key={item.title}
        value={item.title}
        keepMounted
        className="min-w-0"
      >
        <div className="flex min-h-[460px] flex-col max-md:min-h-0">
          <div className="grow px-8 py-8 max-sm:px-4">
            <p className="mb-4 text-foreground-dimmed text-sm">
              {content.capability}
            </p>
            <h3 className="text-[clamp(1.65rem,2.8vw,2.4rem)]!">
              {item.title}
            </h3>
            <p className="mt-4 max-w-[54ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
              {item.body}
            </p>
          </div>
          <dl className="border-accent-foreground border-t">
            {[
              { label: content.dataLabel, body: content.routes[index]?.data },
              {
                label: content.decisionLabel,
                body: content.routes[index]?.decision,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[144px_1fr] gap-6 border-accent-foreground border-b px-8 py-6 last:border-b-0 max-sm:grid-cols-1 max-sm:gap-2 max-sm:px-4"
              >
                <dt className="font-medium text-foreground-rich">
                  {row.label}
                </dt>
                <dd className="text-foreground-dimmed">{row.body}</dd>
              </div>
            ))}
          </dl>
          {item.href && (
            <div className="border-accent-foreground border-t px-8 py-6 max-sm:px-4">
              <Button color="neutral" render={<Link href={item.href} />}>
                {item.label ?? item.title}
                <ArrowRightIcon aria-hidden className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </TabsPanel>
    ))}
    <Plus className="top-0 left-1/3 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
    <Plus className="bottom-0 left-1/3 -translate-x-1/2 translate-y-1/2 max-md:hidden" />
  </Tabs>
);

export namespace RetailersCatalogRoutes {
  export type Props = {
    items: NonNullable<MarketingPage.Section["items"]>;
    content: ReturnType<typeof useMessages>["retailersPage"]["catalog"];
  };
}
