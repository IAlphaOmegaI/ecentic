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
import { useState } from "react";
import type * as Competitor from "@/server/app/competitor";
import { AutoDetectTab } from "./auto-detect-tab";
import { SearchTab } from "./search-tab";
import { UrlTab } from "./url-tab";
import { Motion } from "@/components/motion";

export namespace CompetitorManager {
  export type Props = {
    children: ReactNode;
    existing: Competitor.Type[];
    products: string[];
  };
}

export const CompetitorManager = ({
  children,
  existing,
  products,
}: CompetitorManager.Props) => {
  const [count, setCount] = useState(existing.length);

  const handleSuccess = (competitors: Competitor.Type[]) => {
    setCount((previous) => previous + competitors.length);
  };

  return (
    <Motion.Stagger className="flex flex-1 flex-col overflow-hidden">
      <div className="px-8 border-b border-accent-foreground">{children}</div>

      <Motion.Item className="border-accent-foreground px-8 flex-1 border-b">
        <div className="border-x border-accent-foreground h-full">
          <Tabs defaultValue="auto" className="h-full">
            <TabsList className={"border-0 w-full"}>
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
              className={"border-0 flex-1 h-[calc(100%-(var(--spacing)*9))]"}
            >
              <AutoDetectTab
                products={products}
                onSuccess={handleSuccess}
                className={"flex-1"}
              />
            </TabsPanel>

            <TabsPanel
              value="url"
              className={"border-0 flex-1 h-[calc(100%-(var(--spacing)*9))]"}
            >
              <UrlTab onSuccess={handleSuccess} className={"flex-1"} />
            </TabsPanel>

            <TabsPanel value="search" className={"border-0"}>
              <SearchTab onSuccess={handleSuccess} />
            </TabsPanel>
          </Tabs>
        </div>
      </Motion.Item>

      <Motion.Item className="flex items-center justify-between border-accent-foreground px-8">
        <div className="flex w-full items-center justify-between border-accent-foreground border-x px-6 py-6">
          <Button
            variant="outline"
            color="accent"
            type="button"
            render={<Link href="/onboarding/products" />}
          >
            <Back />
          </Button>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              color="accent"
              type="button"
              render={<Link href="/onboarding/scan" />}
            >
              <Skip />
            </Button>
            <Button
              variant="flat"
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
