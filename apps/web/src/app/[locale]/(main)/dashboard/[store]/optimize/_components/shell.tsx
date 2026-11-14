"use client";

import { AlertCircleIcon, ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useTranslations } from "next-intl";
import { type ReactNode, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Crosshair } from "../../../_components/grid";
import { DashboardHeaderFigure } from "../../../_components/header-figure";

export const OptimizeShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.optimizeWorkspace");
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <header className="flex min-w-0 items-center gap-4 px-4 py-6 sm:px-6">
        <DashboardHeaderFigure subject="optimize" />
        <div className="min-w-0">
          <h1 className="font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
            {translate("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-foreground-dimmed text-sm leading-6">
            {translate("description")}
          </p>
        </div>
      </header>
      <section className="relative flex min-w-0 flex-1 flex-col border-accent-foreground border-t">
        <Crosshair className="top-0 left-0 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 -translate-y-1/2" />
        {children}
      </section>
    </div>
  );
};

export const OptimizeFeedback = ({
  kind,
  store,
  onReset,
}: {
  kind: "empty" | "error" | "filtered" | "published" | "dismissed";
  store?: string;
  onReset?: () => void;
}) => {
  const translate = useTranslations("dashboard.optimizeWorkspace");
  const legacy = useTranslations("dashboard.optimize");
  const quality = useTranslations("dashboard.qualityWorkspace");
  const stateCopy =
    kind === "published" || kind === "dismissed"
      ? {
          title: legacy(`states.${kind}Empty.title`),
          description:
            kind === "published"
              ? translate("history.unmeasured")
              : legacy("states.dismissedEmpty.description"),
        }
      : {
          title: translate(`states.${kind}.title`),
          description: translate(`states.${kind}.description`),
        };
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div
      className="flex min-h-72 flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center"
      role={kind === "error" ? "alert" : "status"}
      aria-busy={pending}
    >
      {kind === "error" && (
        <AlertCircleIcon className="size-8 text-foreground-dimmed" />
      )}
      <h2 className="font-semibold text-foreground-rich text-xl">
        {stateCopy.title}
      </h2>
      <p className="max-w-md text-foreground-dimmed text-sm leading-6">
        {stateCopy.description}
      </p>
      {kind === "filtered" && onReset && (
        <Button variant="soft" color="neutral" onClick={onReset}>
          {quality("action.tertiary")}
        </Button>
      )}
      {kind === "error" && (
        <Button
          variant="soft"
          color="neutral"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
        >
          {pending && (
            <LoaderIcon className="size-4 animate-spin motion-reduce:animate-none" />
          )}
          {translate("action.quaternary")}
        </Button>
      )}
      {kind === "empty" && store && (
        <Button
          variant="soft"
          color="primary"
          render={<Link href={`/dashboard/${store}/quality`} />}
        >
          {translate("action.tertiary")}
          <ArrowRightIcon className="size-4" />
        </Button>
      )}
    </div>
  );
};

export const OptimizeSkeleton = () => (
  <div aria-hidden>
    <div className="grid grid-cols-3 divide-x divide-accent-foreground border-accent-foreground border-b">
      {["candidate", "manual", "published"].map((key) => (
        <div key={key} className="min-w-0 px-4 py-5 sm:px-6">
          <div className="h-4 w-28 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
          <div className="mt-3 h-8 w-12 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
    <div className="flex flex-wrap gap-3 border-accent-foreground border-b px-4 py-4 sm:px-6">
      <div className="h-9 w-64 max-w-full animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
      <div className="ml-auto h-9 w-32 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
    </div>
    <div className="border-accent-foreground border-b px-4 py-5 sm:px-6">
      <div className="h-6 w-60 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
      <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
    </div>
    <div className="border-accent-foreground border-b px-4 py-4 sm:px-6">
      <div className="h-10 w-full animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
    </div>
    {["a", "b", "c", "d"].map((key) => (
      <div
        key={key}
        className="flex items-center gap-4 border-accent-foreground border-b px-4 py-5 sm:px-6"
      >
        <div className="size-9 shrink-0 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
        <div className="min-w-0 flex-1">
          <div className="h-5 w-72 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
          <div className="mt-2 h-4 w-40 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        </div>
        <div className="h-6 w-12 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
      </div>
    ))}
  </div>
);
