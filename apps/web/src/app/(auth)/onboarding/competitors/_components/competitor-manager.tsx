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
import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import { Motion } from "@/components/motion";
import { Plus } from "@/components/plus";
import { AutoDetectTab } from "./auto-detect-tab";
import { SearchTab } from "./search-tab";
import { UrlTab } from "./url-tab";

export namespace CompetitorManager {
  export type Props = {
    children: ReactNode;
    products: string[];
    productNames: string[];
  };
}

export const CompetitorManager = ({
  children,
  products,
  productNames,
}: CompetitorManager.Props) => {
  return (
    <Motion.Stagger className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="border-accent-foreground border-b px-8">{children}</div>

      <Motion.Item className="h-full min-h-0 flex-1 px-8">
        <div className="relative h-full border-accent-foreground border-x">
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
          <Tabs defaultValue="auto" className="h-full">
            <TabsList className={"w-full border-x-0 border-t-0"}>
              <TabsIndicator className="top-0 h-full translate-y-0 rounded-none" />
              <Tab value="auto" className={"flex-1"}>
                Auto-detect
              </Tab>
              <Tab value="url" className={"flex-1"}>
                Paste URLs
              </Tab>
              <Tab value="search" className={"flex-1"}>
                Search Brand
              </Tab>
            </TabsList>

            <TabsPanel
              value="auto"
              className={"h-[calc(100%-(var(--spacing)*9))] flex-1 border-0"}
            >
              <AutoDetectTab
                products={products}
                className={"h-full flex-1 border-accent-foreground border-b"}
              />
            </TabsPanel>

            <TabsPanel
              value="url"
              className={"h-[calc(100%-(var(--spacing)*9))] flex-1 border-0"}
            >
              <UrlTab className={"flex-1 border-accent-foreground border-b"} />
            </TabsPanel>

            <TabsPanel
              value="search"
              className={"h-[calc(100%-(var(--spacing)*9))] flex-1 border-0"}
            >
              <SearchTab
                productNames={productNames}
                className={"h-full flex-1 border-accent-foreground border-b"}
              />
            </TabsPanel>
          </Tabs>
        </div>
      </Motion.Item>

      <Motion.Item className="flex items-center justify-between border-accent-foreground border-accent-foreground border-t px-8">
        <div className="relative flex w-full items-center justify-between border-accent-foreground border-x border-b px-6 py-6">
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
          <Button
            color="accent"
            type="button"
            render={<Link href="/onboarding/products" />}
          >
            <Back />
          </Button>
          <div className="flex items-center gap-4">
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
              render={<Link href="/onboarding/competitors/review" />}
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
  return (
    <>
      Skip — auto-match{" "}
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
  return (
    <>
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowLeftIcon className="size-4" />
      )}
      Back
    </>
  );
};

const Next = () => {
  const { pending } = useLinkStatus();
  return (
    <>
      Next: Review
      {pending ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </>
  );
};
