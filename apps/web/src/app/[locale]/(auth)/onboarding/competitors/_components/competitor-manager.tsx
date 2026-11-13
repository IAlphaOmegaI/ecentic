"use client";

import { ArrowLeftIcon, ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { useLinkStatus } from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { AutoDetectTab } from "./auto-detect-tab";
import { MerchantTab } from "./merchant-tab";
import { OffersTab } from "./offers-tab";
import { SearchTab } from "./search-tab";
import { UrlTab } from "./url-tab";

export namespace CompetitorManager {
  export type Props = {
    children: ReactNode;
    products: string[];
    productNames: string[];
    store: string;
  };
}

export const CompetitorManager = ({
  children,
  products,
  productNames,
  store,
}: CompetitorManager.Props) => {
  const translate = useTranslations("onboarding.competitors");

  return (
    <Motion.Stagger className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-accent-foreground border-b bg-linear-to-br from-primary/10 via-background-rich to-background-rich">
        {children}
      </div>

      <Motion.Item className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="relative flex h-full min-h-0 flex-col">
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          {/* Offers leads, and the order is the argument: it is the only tab
              whose rivals and prices were observed rather than recalled. The
              model-driven tabs stay because a private-label catalog has no
              competing offers to find — they are the fallback, not the default. */}
          <Tabs
            defaultValue="offers"
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="shrink-0 overflow-x-auto overscroll-x-contain border-accent-foreground border-b">
              <TabsList
                aria-label={translate("page.title")}
                className="w-max min-w-full rounded-none border-0"
              >
                <TabsIndicator className="top-0 h-full translate-y-0 rounded-none" />
                <Tab
                  value="offers"
                  className="h-auto min-h-12 flex-1 shrink-0 whitespace-nowrap px-4 py-3"
                >
                  {translate("tabs.offers")}
                </Tab>
                <Tab
                  value="auto"
                  className="h-auto min-h-12 flex-1 shrink-0 whitespace-nowrap px-4 py-3"
                >
                  {translate("tabs.auto")}
                </Tab>
                <Tab
                  value="url"
                  className="h-auto min-h-12 flex-1 shrink-0 whitespace-nowrap px-4 py-3"
                >
                  {translate("tabs.url")}
                </Tab>
                <Tab
                  value="search"
                  className="h-auto min-h-12 flex-1 shrink-0 whitespace-nowrap px-4 py-3"
                >
                  {translate("tabs.search")}
                </Tab>
                <Tab
                  value="merchant"
                  className="h-auto min-h-12 flex-1 shrink-0 whitespace-nowrap px-4 py-3"
                >
                  {translate("tabs.merchant")}
                </Tab>
              </TabsList>
            </div>

            <TabsPanel
              value="offers"
              keepMounted
              className="min-h-0 min-w-0 flex-1 overflow-hidden border-0"
            >
              <OffersTab
                products={products}
                store={store}
                className="h-full min-h-0 min-w-0 flex-1 border-0"
              />
            </TabsPanel>

            <TabsPanel
              value="auto"
              keepMounted
              className="min-h-0 min-w-0 flex-1 overflow-hidden border-0"
            >
              <AutoDetectTab
                products={products}
                store={store}
                className="h-full min-h-0 min-w-0 flex-1 border-0"
              />
            </TabsPanel>

            {/* keepMounted, like the auto panel: extracted rows and an
                in-flight extraction must survive a tab switch. */}
            <TabsPanel
              value="url"
              keepMounted
              className="min-h-0 min-w-0 flex-1 overflow-hidden border-0"
            >
              <UrlTab
                store={store}
                className="h-full min-h-0 min-w-0 flex-1 border-0"
              />
            </TabsPanel>

            <TabsPanel
              value="search"
              keepMounted
              className="min-h-0 min-w-0 flex-1 overflow-hidden border-0"
            >
              <SearchTab
                productNames={productNames}
                store={store}
                className="h-full min-h-0 min-w-0 flex-1 border-0"
              />
            </TabsPanel>

            {/* keepMounted so the picked rivals survive a tab switch. The
                mount-time fetch this costs is a single query against our own
                tables for the common onboarding case — a store with no Google
                link never reaches Google's API. */}
            <TabsPanel
              value="merchant"
              keepMounted
              className="min-h-0 min-w-0 flex-1 overflow-hidden border-0"
            >
              <MerchantTab
                store={store}
                className="h-full min-h-0 min-w-0 flex-1 border-0"
              />
            </TabsPanel>
          </Tabs>
        </div>
      </Motion.Item>

      <Motion.Item className="relative shrink-0 border-accent-foreground border-t bg-background-rich">
        <div className="relative flex w-full flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-8">
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <Button
            color="accent"
            type="button"
            render={<Link href="/onboarding/products" />}
          >
            <Back />
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              color="accent"
              type="button"
              render={<Link href="/onboarding/scan" />}
            >
              <Skip />
            </Button>
            <Button
              color="primary"
              type="button"
              render={
                <Link
                  href={`/onboarding/competitors/review?store=${encodeURIComponent(store)}`}
                />
              }
            >
              <Next />
            </Button>
          </div>
        </div>
      </Motion.Item>
    </Motion.Stagger>
  );
};

const Skip = () => {
  const { pending } = useLinkStatus();
  const translate = useTranslations("onboarding.competitors.action");

  return (
    <>
      {translate("skip")}{" "}
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </>
  );
};

const Back = () => {
  const { pending } = useLinkStatus();
  const translate = useTranslations("onboarding.competitors.action");

  return (
    <>
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowLeftIcon className="size-4" />
      )}
      {translate("back")}
    </>
  );
};

const Next = () => {
  const { pending } = useLinkStatus();
  const translate = useTranslations("onboarding.competitors.action");

  return (
    <>
      {translate("nextReview")}
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </>
  );
};
