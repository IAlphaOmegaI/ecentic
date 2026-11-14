"use client";

import {
  AlertCircleIcon,
  ArrowRightIcon,
  LoaderIcon,
  PlusIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useTransition } from "react";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { Link, useRouter } from "@/i18n/navigation";
import { Crosshair, Slot } from "../../../_components/grid";

import { DashboardHeaderFigure } from "../../../_components/header-figure";

export const ProductsShell = ({
  action,
  banner,
  stats,
  table,
}: {
  action: ReactNode;
  banner?: ReactNode;
  stats: ReactNode;
  table: ReactNode;
}) => {
  const translate = useTranslations("dashboard.products.catalog");
  return (
    <div className="flex min-w-0 flex-col">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-5 px-4 py-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <DashboardHeaderFigure subject="products" />
          <div className="min-w-0">
            <h1 className="font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
              {translate("title")}
            </h1>
            <p className="mt-1 max-w-xl text-foreground-dimmed text-sm leading-6">
              {translate("description")}
            </p>
          </div>
        </div>
        <Slot>{action}</Slot>
      </header>
      <Slot>{banner}</Slot>
      <div className="relative min-w-0 border-accent-foreground border-y">
        <Crosshair className="top-0 right-0 -translate-y-1/2" />
        <Slot>{stats}</Slot>
      </div>
      <section
        className="relative min-w-0 border-accent-foreground border-b bg-background-rich"
        aria-label={translate("tableLabel")}
      >
        <Slot>{table}</Slot>
        <Crosshair className="bottom-0 left-0 translate-y-1/2" />
      </section>
    </div>
  );
};

export const CatalogSummary = ({
  total,
  compared,
  incomplete,
}: {
  total: number;
  compared: number;
  incomplete: number;
}) => {
  const translate = useTranslations("dashboard.products.catalog");
  const formatter = useFormatter();
  const count = (value: number) => {
    const exact = formatter.number(value);
    return (
      <span title={exact}>
        <span aria-hidden>
          {value >= 100_000
            ? formatter.number(value, {
                notation: "compact",
                maximumFractionDigits: 1,
              })
            : exact}
        </span>
        <span className="sr-only">{exact}</span>
      </span>
    );
  };
  const metrics = [
    { key: "compared", value: compared },
    { key: "incomplete", value: incomplete },
  ] as const;
  return (
    <dl className="grid grid-cols-2 lg:grid-cols-3">
      <div className="relative col-span-2 flex min-w-0 items-center justify-between gap-3 overflow-hidden bg-primary/5 px-4 py-5 text-foreground-rich sm:px-6 lg:col-span-1">
        <div className="relative z-1 min-w-0">
          <dt className="font-medium text-foreground text-sm">
            {translate("summary.imported")}
          </dt>
          <dd
            className={`mt-2 font-semibold tabular-nums tracking-tight ${total >= 100_000 ? "text-3xl" : "text-4xl"}`}
          >
            {count(total)}
          </dd>
          <p className="mt-2 text-foreground-dimmed text-xs leading-5">
            {translate("summary.importedHint")}
          </p>
        </div>
        <div aria-hidden className="size-24 shrink-0 text-primary sm:size-28">
          <EvolvingAscii artwork="catalogCommerce" />
        </div>
      </div>
      {metrics.map(({ key, value }) => (
        <div
          key={key}
          className="flex min-w-0 flex-col border-accent-foreground border-t px-4 py-5 last:border-l sm:px-6 lg:border-t-0 lg:border-l"
        >
          <dt className="min-h-10 font-medium text-foreground text-sm sm:min-h-5">
            {translate(`summary.${key}`)}
          </dt>
          <dd className="mt-2 flex flex-wrap items-baseline gap-x-2 tabular-nums">
            <span className="font-semibold text-3xl text-foreground-rich tracking-tight">
              {count(value)}
            </span>
            {total > 0 && (
              <span className="text-foreground-dimmed text-sm">
                / {count(total)}
              </span>
            )}
          </dd>
          <div
            aria-hidden
            className="mt-4 h-2.5 overflow-hidden rounded-sm bg-accent-foreground"
          >
            <div
              className={`h-full ${key === "compared" ? "bg-primary" : "bg-warning"}`}
              style={{
                width: `${total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0}%`,
              }}
            />
          </div>
          <p className="mt-2 text-foreground-dimmed text-xs leading-5">
            {translate(`summary.${key}Hint`)}
          </p>
        </div>
      ))}
    </dl>
  );
};

export const CatalogFeedback = ({
  kind,
  store,
}: {
  kind: "empty" | "noMatches" | "error";
  store?: string;
}) => {
  const translate = useTranslations("dashboard.products.catalog");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div
      className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 py-10 text-center"
      role={kind === "error" ? "alert" : undefined}
      aria-busy={pending}
    >
      {kind === "error" ? (
        <AlertCircleIcon className="size-10 text-error-dimmed" />
      ) : (
        <div aria-hidden className="size-20 text-primary">
          <EvolvingAscii artwork="catalog" />
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
            <LoaderIcon
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
          )}
          {translate("action.retry")}
        </Button>
      ) : (
        store && (
          <Button
            color={kind === "empty" ? "primary" : "neutral"}
            variant={kind === "empty" ? "default" : "soft"}
            render={
              <Link
                href={`/dashboard/${store}/products${kind === "empty" ? "/add" : ""}`}
              />
            }
          >
            {kind === "empty" ? (
              <PlusIcon className="size-4" />
            ) : (
              <ArrowRightIcon className="size-4" />
            )}
            {translate(kind === "empty" ? "action.add" : "action.clear")}
          </Button>
        )
      )}
    </div>
  );
};

export const AddActionSkeleton = () => (
  <div className="h-9 w-36 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
);
export const StatsSkeleton = () => (
  <div aria-hidden className="grid grid-cols-2 lg:grid-cols-3">
    <div className="col-span-2 flex min-w-0 items-center justify-between gap-3 bg-primary/5 px-4 py-5 sm:px-6 lg:col-span-1">
      <div className="min-w-0">
        <div className="h-5 w-24 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        <div className="mt-2 h-10 w-16 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        <div className="mt-2 h-5 w-28 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
      </div>
      <div className="size-24 shrink-0 animate-pulse rounded-sm bg-primary/10 motion-reduce:animate-none sm:size-28" />
    </div>
    {["compared", "incomplete"].map((key) => (
      <div
        key={key}
        className="min-w-0 border-accent-foreground border-t px-4 py-5 last:border-l sm:px-6 lg:border-t-0 lg:border-l"
      >
        <div className="h-10 w-20 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none sm:h-5" />
        <div className="mt-2 h-9 w-24 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        <div className="mt-4 h-2.5 w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        <div className="mt-2 h-10 w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none sm:h-5" />
      </div>
    ))}
  </div>
);
export const TableSkeleton = () => (
  <div aria-hidden>
    <div className="flex flex-wrap items-center gap-2 border-accent-foreground border-b px-4 py-4 sm:px-6">
      <div className="h-10 min-w-48 flex-1 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
      <div className="h-10 w-24 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
      <div className="h-10 w-24 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
      <div className="w-full">
        <div className="h-4 w-52 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
      </div>
    </div>
    <div className="h-14 border-accent-foreground border-b bg-background-dimmed/50" />
    {["a", "b", "c", "d", "e"].map((key) => (
      <div
        key={key}
        className="flex items-center gap-4 border-accent-foreground border-b px-4 py-3 sm:px-6"
      >
        <div className="size-5 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        <div className="size-11 shrink-0 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-52 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        </div>
        <div className="hidden h-4 w-20 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none sm:block" />
        <div className="h-4 w-16 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
      </div>
    ))}
    <div className="h-16" />
  </div>
);
