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
import { Motion } from "@/components/motion";
import type * as Competitor from "@/server/app/competitor";
import { AutoDetectTab } from "./auto-detect-tab";
import { SearchTab } from "./search-tab";
import { UrlTab } from "./url-tab";

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
    <Motion.Stagger stagger={0.05} className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        {children}

        <Motion.Up className="relative mb-4">
          <Tabs defaultValue="auto">
            <TabsList className="flex w-full">
              <TabsIndicator className="top-0 h-full translate-y-0 rounded-none" />
              <Tab value="auto" className="flex-1">
                Auto-detect
              </Tab>
              <Tab value="url" className="flex-1">
                Paste URLs
              </Tab>
              <Tab value="search" className="flex-1">
                Search Brand
              </Tab>
            </TabsList>

            <TabsPanel value="auto">
              <AutoDetectTab products={products} onSuccess={handleSuccess} />
            </TabsPanel>

            <TabsPanel value="url">
              <UrlTab onSuccess={handleSuccess} />
            </TabsPanel>

            <TabsPanel value="search">
              <SearchTab onSuccess={handleSuccess} />
            </TabsPanel>
          </Tabs>
        </Motion.Up>

        <Motion.Up className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            color="neutral"
            type="button"
            className="text-foreground-dimmed text-sm"
            render={<Link href="/onboarding/products" />}
          >
            <Back />
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              color="neutral"
              type="button"
              render={<Link href="/onboarding/scan" />}
              className="text-foreground-dimmed text-sm"
            >
              <Skip />
            </Button>
            <Button
              variant="flat"
              color="primary"
              type="button"
              disabled={count === 0}
              className="px-6 py-2 font-medium text-sm"
              render={<Link href="/onboarding/competitors/review" />}
            >
              <Next />
            </Button>
          </div>
        </Motion.Up>
      </div>
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
