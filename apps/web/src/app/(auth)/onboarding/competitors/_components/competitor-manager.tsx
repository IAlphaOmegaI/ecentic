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
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="mx-8 flex flex-1 flex-col border-x border-accent-foreground">
        {/* Title section */}
        <div className="px-6 py-8">
          {children}
        </div>

        {/* Tabs — crossing borders */}
        <div className="-mx-8 flex flex-1 flex-col overflow-hidden border-y border-accent-foreground">
          <div className="mx-8 flex flex-1 flex-col pt-6">
        <Tabs defaultValue="auto" className="flex flex-1 flex-col">
          <TabsList className="mb-6">
            <TabsIndicator className="top-0 h-full translate-y-0 rounded-none" />
            <Tab value="auto">Auto-detect</Tab>
            <Tab value="url">Paste URLs</Tab>
            <Tab value="search">Search Brand</Tab>
          </TabsList>

          <TabsPanel value="auto" className="flex flex-1 flex-col">
            <AutoDetectTab products={products} onSuccess={handleSuccess} />
          </TabsPanel>

          <TabsPanel value="url">
            <UrlTab onSuccess={handleSuccess} />
          </TabsPanel>

          <TabsPanel value="search">
            <SearchTab onSuccess={handleSuccess} />
          </TabsPanel>
        </Tabs>
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-6">
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
        </div>
      </div>
    </div>
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
