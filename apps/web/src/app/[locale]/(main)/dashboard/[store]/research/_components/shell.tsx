"use client";

import { AlertCircleIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useTranslations } from "next-intl";
import { type ComponentProps, type ReactNode, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Crosshair } from "../../../_components/grid";
import { DashboardHeaderFigure } from "../../../_components/header-figure";

export const ResearchHeader = ({
  title,
  description,
  children,
  subject = "research",
}: {
  subject?: ComponentProps<typeof DashboardHeaderFigure>["subject"];
  title: string;
  description: string;
  children?: ReactNode;
}) => (
  <header className="relative flex min-w-0 flex-col items-stretch gap-4 border-accent-foreground border-b px-4 py-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
    <div className="flex min-w-0 flex-1 items-center gap-4">
      <DashboardHeaderFigure subject={subject} />
      <div className="min-w-0">
        <h1 className="font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm leading-6">
          {description}
        </p>
      </div>
    </div>
    {children}
    <Crosshair className="bottom-0 left-0 translate-y-1/2" />
    <Crosshair className="right-0 bottom-0 translate-y-1/2" />
  </header>
);

export const ResearchShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.research");
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <ResearchHeader
        title={translate("title")}
        description={translate("description")}
      />
      {children}
    </div>
  );
};

export const ResearchUnavailable = () => {
  const translate = useTranslations("dashboard.research.unavailable");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 px-4 py-8 sm:px-6"
    >
      <AlertCircleIcon aria-hidden className="size-6 text-warning" />
      <h2 className="font-semibold text-lg">{translate("title")}</h2>
      <p className="max-w-xl text-foreground-dimmed text-sm leading-6">
        {translate("description")}
      </p>
      <Button
        variant="soft"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {translate("action.primary")}
      </Button>
    </div>
  );
};

export const ResearchComparisonSkeleton = () => (
  <div
    aria-hidden
    className="grid border-accent-foreground border-b lg:grid-cols-3"
  >
    <div className="min-w-0 px-4 py-6 sm:px-6 lg:col-span-2 lg:border-accent-foreground lg:border-r">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="h-6 w-48 animate-pulse rounded-sm bg-accent-foreground/40 motion-reduce:animate-none" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-lg bg-accent-foreground/30 motion-reduce:animate-none" />
      </div>
      <div className="mt-4 flex min-w-0 items-center gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-4 w-32 max-w-full animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
          <div className="h-12 w-28 animate-pulse rounded-sm bg-accent-foreground/40 motion-reduce:animate-none" />
          <div className="h-4 w-60 max-w-full animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
        </div>
        <div className="aspect-5/4 w-32 shrink-0 animate-pulse rounded-sm bg-accent-foreground/20 motion-reduce:animate-none sm:w-48" />
      </div>
      <div className="mt-6 space-y-2">
        <div className="h-4 w-full animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
        <div className="h-4 w-3/4 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
      </div>
    </div>
    <div className="divide-y divide-accent-foreground">
      {[1, 2, 3].map((key) => (
        <div key={key} className="space-y-3 px-4 py-6 sm:px-6">
          <div className="h-4 w-32 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
          <div className="h-4 w-44 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  </div>
);

export const ResearchBrandSkeleton = () => (
  <div
    aria-hidden
    className="space-y-4 border-accent-foreground border-b px-4 py-6 sm:px-6"
  >
    <div className="h-6 w-44 animate-pulse rounded-sm bg-accent-foreground/40 motion-reduce:animate-none" />
    <div className="h-4 w-3/4 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
    <div className="h-4 w-2/3 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
  </div>
);

export const ResearchDirectionsSkeleton = () => (
  <div aria-hidden className="grid gap-px bg-accent-foreground md:grid-cols-3">
    {[1, 2, 3].map((key) => (
      <div key={key} className="space-y-4 bg-background px-4 py-6 sm:px-6">
        <div className="size-8 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
        <div className="h-5 w-32 animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
        <div className="h-4 w-full animate-pulse rounded-sm bg-accent-foreground/30 motion-reduce:animate-none" />
      </div>
    ))}
  </div>
);
