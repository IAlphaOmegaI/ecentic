"use client";
import { ArrowRightIcon, BarChartIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, Suspense } from "react";
import { Link } from "@/i18n/navigation";
import {
  ChannelSection,
  ChannelsWorkspace,
} from "../../channels/_components/workspace";
export const VisibilityShell = ({ audit }: { audit: ReactNode }) => {
  const translate = useTranslations("dashboard.channels");
  return (
    <ChannelsWorkspace
      subject="visibility"
      title={translate("checks.title")}
      description={translate("checks.description")}
    >
      <ChannelSection>{audit}</ChannelSection>
      <ChannelSection className="flex flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex min-w-0 items-start gap-3">
          <BarChartIcon
            aria-hidden
            className="mt-0.5 size-6 shrink-0 text-primary"
          />
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground-rich text-lg">
              {translate("research.title")}
            </h2>
            <p className="mt-1 max-w-3xl text-foreground-dimmed text-sm leading-6">
              {translate("research.description")}
            </p>
          </div>
        </div>
        <Suspense fallback={<ResearchButton />}>
          <ResearchNavigation />
        </Suspense>
      </ChannelSection>
    </ChannelsWorkspace>
  );
};

const ResearchNavigation = () => {
  const { store } = useParams<{ store: string }>();
  return <ResearchButton store={store} />;
};

const ResearchButton = ({ store }: { store?: string }) => {
  const translate = useTranslations("dashboard.channels");
  return (
    <Button
      className="w-fit shrink-0"
      variant="soft"
      color="neutral"
      disabled={!store}
      render={
        store ? (
          <Link href={`/dashboard/${store}/research/catalog-rank`} />
        ) : undefined
      }
    >
      {translate("research.action.primary")}
      <ArrowRightIcon aria-hidden className="size-4" />
    </Button>
  );
};
const SKELETON_ROWS = ["a", "b", "c", "d", "e"] as const;

/** Matches AuditContent: score band, readiness rows, then the feed handoff. */
export const AuditSkeleton = () => (
  <div className="flex flex-col">
    <div className="grid border-accent-foreground border-b md:grid-cols-3">
      <div className="flex flex-col gap-3 px-4 py-5 sm:px-6">
        <div className="h-3 w-24 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
        <div className="h-10 w-32 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
        <div className="h-1.5 w-full animate-pulse rounded-full bg-foreground/10 motion-reduce:animate-none" />
      </div>
      <div className="grid grid-cols-2 gap-px border-accent-foreground border-t bg-accent-foreground md:col-span-2 md:border-t-0 md:border-l">
        {[1, 2, 3, 4].map((key) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3 bg-background-rich px-4 py-5 sm:px-6"
          >
            <div className="h-5 w-20 animate-pulse rounded-full bg-foreground/10 motion-reduce:animate-none" />
            <div className="h-8 w-8 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
    <div className="divide-y divide-accent-foreground">
      {SKELETON_ROWS.map((key) => (
        <div
          key={key}
          className="flex flex-col gap-2 px-4 py-5 sm:flex-row sm:gap-4 sm:px-6"
        >
          <div className="h-5 w-36 shrink-0 animate-pulse rounded-full bg-foreground/10 motion-reduce:animate-none" />
          <div className="flex flex-col gap-2">
            <div className="h-4 w-56 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
            <div className="h-3 w-full animate-pulse bg-foreground/10 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
    <div className="border-accent-foreground border-t">
      <div className="flex items-start gap-3 px-4 py-5 sm:px-6">
        <div className="mt-0.5 size-6 shrink-0 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="h-7 w-3/4 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
          <div className="h-6 w-full max-w-xl animate-pulse bg-foreground/10 motion-reduce:animate-none" />
        </div>
      </div>
      <div className="flex flex-col gap-3 border-accent-foreground border-t bg-background px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <div className="h-4 w-full max-w-xl animate-pulse bg-foreground/10 motion-reduce:animate-none" />
        <div className="h-9 w-36 shrink-0 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none sm:ml-auto" />
      </div>
    </div>
  </div>
);
