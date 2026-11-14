"use client";

import {
  AlertCircleIcon,
  ArrowRightIcon,
  FileSearchIcon,
  LoaderIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useTransition } from "react";
import { CustomHairlineFigure } from "@/components/hairline/custom-figure";
import { Link } from "@/i18n/navigation";
import { Crosshair } from "../../../_components/grid";
import { DashboardHeaderFigure } from "../../../_components/header-figure";

export const QualityShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.qualityWorkspace");
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <header className="flex items-center gap-4 px-4 py-6 sm:px-6">
        <DashboardHeaderFigure subject="quality" />
        <div className="min-w-0">
          <h1 className="font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
            {translate("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-foreground-dimmed text-sm leading-6">
            {translate("description")}
          </p>
        </div>
      </header>
      <section className="relative flex min-w-0 flex-1 flex-col border-accent-foreground border-y">
        <Crosshair className="top-0 right-0 -translate-y-1/2" />
        {children}
        <Crosshair className="bottom-0 left-0 translate-y-1/2" />
      </section>
    </div>
  );
};

export const QualityFeedback = ({
  kind,
  store,
}: {
  kind: "empty" | "error";
  store?: string;
}) => {
  const translate = useTranslations("dashboard.qualityWorkspace");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div
      className="flex min-h-96 flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center"
      role={kind === "error" ? "alert" : "status"}
      aria-busy={pending}
    >
      {kind === "error" ? (
        <AlertCircleIcon className="size-10 text-foreground-dimmed" />
      ) : (
        <div aria-hidden className="w-80 max-w-full sm:w-96">
          <CustomHairlineFigure
            name="inspection-queue"
            label={translate("states.empty.title")}
          />
        </div>
      )}
      <h2 className="font-semibold text-foreground-rich text-xl">
        {translate(`states.${kind}.title`)}
      </h2>
      <p className="max-w-md text-foreground-dimmed text-sm leading-6">
        {translate(`states.${kind}.description`)}
      </p>
      {kind === "error" ? (
        <Button
          variant="soft"
          color="neutral"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
        >
          {pending && (
            <LoaderIcon className="size-4 animate-spin motion-reduce:animate-none" />
          )}
          {translate("action.secondary")}
        </Button>
      ) : (
        store && (
          <Button render={<Link href={`/dashboard/${store}/products`} />}>
            <ArrowRightIcon className="size-4" />
            {translate("action.primary")}
          </Button>
        )
      )}
    </div>
  );
};

export const QualitySkeleton = () => {
  const translate = useTranslations("dashboard.qualityWorkspace");
  return (
    <div aria-hidden>
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <h2 className="font-semibold text-base text-foreground-rich">
            {translate("summary.title")}
          </h2>
          <div className="mt-1 h-4 w-48 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        </div>
        <Button variant="ghost" color="neutral" disabled>
          <FileSearchIcon className="size-4" />
          {translate("method.title")}
        </Button>
      </div>
      <div className="grid grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-t">
        {(["universal", "google", "chatgpt"] as const).map((surface) => (
          <div key={surface} className="min-w-0 px-4 py-4 sm:px-6">
            <div className="flex min-h-10 items-start gap-2 font-medium text-foreground text-xs sm:min-h-8 sm:text-sm">
              <span className="size-4 shrink-0 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
              <span className="min-w-0 break-words">
                {translate(`scope.${surface}`)}
              </span>
            </div>
            <div className="mt-2 h-8 w-16 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none sm:h-9" />
            <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-foreground/10 motion-reduce:animate-none" />
            <div className="mt-2 h-4 w-20 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 px-4 pb-4 sm:px-6">
        {(["blocker", "warning", "info", "ready"] as const).map((status) => (
          <span
            key={status}
            className="inline-flex items-center gap-2 font-medium text-foreground text-xs"
          >
            <span className="size-2 shrink-0 animate-pulse rounded-full bg-foreground/10 motion-reduce:animate-none" />
            {translate(`status.${status}`)}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 border-accent-foreground border-y px-4 py-4 sm:px-6">
        <div className="h-9 w-56 max-w-full animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
        <div className="ml-auto h-4 w-16 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
      </div>
      <div className="flex flex-wrap gap-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
        <div className="h-10 min-w-48 flex-1 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
        <div className="h-10 w-36 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
        <div className="h-10 w-36 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
      </div>
      <p className="border-accent-foreground border-b px-4 py-4 text-foreground-dimmed text-xs leading-5 sm:px-6">
        {translate("issuesHint")}
      </p>
      {["a", "b", "c", "d"].map((key) => (
        <div
          key={key}
          className="flex items-center gap-4 border-accent-foreground border-b px-4 py-4 last:border-b-0 sm:px-6"
        >
          <div className="size-10 shrink-0 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
          <div className="min-w-0 flex-1">
            <div className="h-6 w-64 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
            <div className="mt-2 h-4 w-24 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
          </div>
          <div className="h-10 w-12 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
          <div className="size-4 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
};
