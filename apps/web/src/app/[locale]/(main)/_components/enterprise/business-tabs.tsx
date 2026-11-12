"use client";

import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceCityBuildingIcon,
  CommerceFileShieldIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { AppConfig } from "next-intl";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { Link } from "@/i18n/navigation";

const audiences = [
  { Icon: CommerceBasketShoppingIcon, tone: "primary", figure: "catalog" },
  { Icon: CommerceCityBuildingIcon, tone: "success", figure: "drawer" },
  { Icon: CommerceFileShieldIcon, tone: "secondary", figure: "hub" },
  { Icon: CommercePlug_3SparkleIcon, tone: "warning", figure: "relay" },
] as const;

export const BusinessTabs = ({ copy }: BusinessTabs.Props) => (
  <Tabs
    defaultValue={copy.items[0]?.id}
    className="enterprise-business-tabs relative"
  >
    <div className="px-7 pb-8 max-sm:px-4 max-sm:pb-6">
      <TabsList
        aria-label={copy.title}
        className="grid w-full grid-cols-4 gap-1 rounded-lg border-0 bg-background-dimmed p-1 max-[801px]:grid-cols-2"
      >
        {copy.items.map((item, index) => {
          const appearance = audiences[index] ?? audiences[0];
          const Icon = appearance.Icon;
          return (
            <Tab
              key={item.id}
              value={item.id}
              data-tone={appearance.tone}
              className="group/tab h-auto min-h-16 justify-start gap-3 rounded-md border-0 px-4 py-3 text-left text-base leading-snug before:hidden focus-visible:-outline-offset-4! data-[tone=secondary]:data-[active]:text-secondary data-[tone=secondary]:data-selected:text-secondary data-[tone=success]:data-[active]:text-success-foreground data-[tone=success]:data-selected:text-success-foreground data-[tone=warning]:data-[active]:text-warning-foreground data-[tone=warning]:data-selected:text-warning-foreground data-[active]:bg-background-rich data-selected:bg-background-rich data-[active]:text-primary-text data-selected:text-primary-text max-sm:gap-2 max-sm:px-3 max-sm:text-sm"
            >
              <Icon
                aria-hidden
                className="size-6 shrink-0 text-primary-text group-data-[tone=secondary]/tab:text-secondary group-data-[tone=success]/tab:text-success-foreground group-data-[tone=warning]/tab:text-warning-foreground"
              />
              {item.eyebrow}
            </Tab>
          );
        })}
      </TabsList>
    </div>
    {copy.items.map((item, index) => {
      const appearance = audiences[index] ?? audiences[0];
      const Icon = appearance.Icon;
      return (
        <TabsPanel key={item.id} value={item.id}>
          <div
            data-tone={appearance.tone}
            className="group/audience marketing-section-grid relative border-accent-foreground border-t bg-linear-to-br from-primary/10 via-background to-background-rich data-[tone=secondary]:from-secondary/10 data-[tone=success]:from-success/10 data-[tone=warning]:from-warning/10"
          >
            <div
              className="marketing-grid relative grid grid-cols-2 max-sm:grid-cols-1"
              data-columns="2"
            >
              <div className="relative flex min-h-[460px] min-w-0 flex-col overflow-hidden border-accent-foreground border-r px-8 py-10 max-sm:min-h-[400px] max-sm:border-r-0 max-sm:px-4 max-sm:py-8">
                <Icon
                  aria-hidden
                  className="relative mb-8 size-10 text-primary-text group-data-[tone=secondary]/audience:text-secondary group-data-[tone=success]/audience:text-success-foreground group-data-[tone=warning]/audience:text-warning-foreground"
                />
                <h3 className="relative max-w-[15ch] text-[clamp(2rem,3.2vw,3rem)] leading-[1.08]">
                  {item.title}
                </h3>
                <p className="relative mt-6 mb-10 max-w-[40ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                  {item.description}
                </p>
                <div className="relative mt-auto">
                  <Button render={<Link href={item.href} />}>
                    {item.label}
                    <ArrowRightIcon aria-hidden className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="relative flex min-w-0 flex-col bg-background-rich max-sm:border-accent-foreground max-sm:border-t">
                <CommerceFigure
                  kind={appearance.figure}
                  surface="rich"
                  className="mx-auto w-full max-w-72 group-data-[tone=secondary]/audience:[--hairline-hi:var(--color-secondary)] group-data-[tone=success]/audience:[--hairline-hi:var(--color-success-foreground)] group-data-[tone=warning]/audience:[--hairline-hi:var(--color-warning-foreground)]"
                />
                <div className="border-accent-foreground border-t px-8 py-8 max-sm:px-4">
                  <h4 className="mb-6 font-body font-medium text-foreground-rich text-lg tracking-normal">
                    {copy.painLabel}
                  </h4>
                  <ul className="divide-y divide-accent-foreground">
                    {item.pains.map((pain) => (
                      <li
                        key={pain}
                        className="flex items-start gap-4 py-5 first:pt-0 last:pb-0"
                      >
                        <span
                          aria-hidden
                          className="mt-2.5 size-2 shrink-0 rounded-full bg-primary-text group-data-[tone=secondary]/audience:bg-secondary group-data-[tone=success]/audience:bg-success-foreground group-data-[tone=warning]/audience:bg-warning-foreground"
                        />
                        <p className="max-w-[40ch] text-foreground text-lg leading-relaxed max-sm:text-base">
                          {pain}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </TabsPanel>
      );
    })}
  </Tabs>
);

export namespace BusinessTabs {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["businesses"];
  };
}
