"use client";

import {
  AlertCircleIcon,
  ChevronLeftIcon,
  FileSearchIcon,
  LoaderIcon,
} from "@zenncore/icons";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import { Button } from "@zenncore/web/components/button";
import {
  Popover,
  PopoverPopup,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger,
} from "@zenncore/web/components/popover";
import { useParams, useRouter } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { type ReactNode, Suspense, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { formatRelativeTime } from "@/lib/date";
import { Crosshair } from "../../../../_components/grid";
import { DashboardHeaderFigure } from "../../../../_components/header-figure";
import type { ProductDetailData } from "./product-detail";

export const ProductShell = ({ children }: { children: ReactNode }) => {
  const translate = useTranslations("dashboard.productWorkspace");
  return (
    <div className="min-w-0">
      <h1 className="sr-only">{translate("title")}</h1>
      <nav
        className="border-accent-foreground border-b px-4 py-2 sm:px-6"
        aria-label={translate("title")}
      >
        <Suspense fallback={<ProductBackButton />}>
          <ProductNavigation />
        </Suspense>
      </nav>
      {children}
    </div>
  );
};

const ProductNavigation = () => {
  const { store } = useParams<{ store: string }>();
  return <ProductBackButton store={store} />;
};

const ProductBackButton = ({ store }: { store?: string }) => {
  const translate = useTranslations("dashboard.productWorkspace");
  return (
    <Button
      variant="ghost"
      color="neutral"
      disabled={!store}
      render={
        store ? <Link href={`/dashboard/${store}/products`} /> : undefined
      }
    >
      <ChevronLeftIcon aria-hidden className="size-4" />
      {translate("navigation.primary")}
    </Button>
  );
};

export const ProductHeader = ({ data }: { data: ProductDetailData }) => {
  const translate = useTranslations("dashboard.productWorkspace");
  const shared = useTranslations("dashboard.shared");
  const locale = useLocale();
  const formatter = useFormatter();
  const { product } = data;
  const title = product.title.trim() || product.id;
  const amount = product.price?.trim()
    ? Number(product.price.trim().replace(",", "."))
    : null;
  const currency = product.currency?.trim().toUpperCase();
  const price =
    amount !== null && Number.isFinite(amount)
      ? formatter.number(
          amount,
          currency && /^[A-Z]{3}$/.test(currency)
            ? { style: "currency", currency }
            : { maximumFractionDigits: 2 },
        )
      : translate("priceMissing");
  const updated = product.updatedAt ? new Date(product.updatedAt) : null;
  const status =
    product.status === "active" ||
    product.status === "draft" ||
    product.status === "archived"
      ? product.status
      : "unknown";
  return (
    <header className="flex items-start gap-4 px-4 py-6 sm:gap-6 sm:px-6">
      <Avatar className="size-20 shrink-0 rounded-lg border border-accent-foreground bg-background-rich sm:size-24">
        <AvatarImage src={product.image ?? undefined} alt="" />
        <AvatarFallback>
          <DashboardHeaderFigure subject="productDetail" surface="rich" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-foreground-dimmed text-xs">
          <span>{translate(`status.${status}`)}</span>
          {product.sku?.trim() && (
            <span className="break-all">
              {shared("sku", { sku: product.sku })}
            </span>
          )}
        </div>
        <h2 className="break-words font-heading font-semibold text-2xl text-foreground-rich tracking-tight sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 break-words font-medium text-foreground text-sm tabular-nums">
          {price}
        </p>
        {data.channels?.source && (
          <p className="mt-2 truncate text-foreground-dimmed text-xs">
            {data.channels.source.name || data.channels.source.domain}
          </p>
        )}
        {updated && (
          <p className="mt-2 text-foreground-dimmed text-xs">
            {translate("updated", {
              time: formatRelativeTime(updated, locale),
            })}
          </p>
        )}
      </div>
    </header>
  );
};

export const ProductMetrics = ({ data }: { data: ProductDetailData }) => {
  const translate = useTranslations("dashboard.productWorkspace");
  const formatter = useFormatter();
  const { product, simulations, competitors, winRate } = data;
  const wins = simulations.filter(
    (simulation) => simulation.winner === "product",
  ).length;
  return (
    <section
      className="relative border-accent-foreground border-b"
      aria-label={translate("method.title")}
    >
      <Crosshair className="top-0 right-0 -translate-y-1/2" />
      <div className="grid grid-cols-3 divide-x divide-accent-foreground">
        <div className="min-w-0 px-4 py-4 sm:px-6">
          <p className="min-h-10 font-medium text-foreground text-xs sm:min-h-5">
            {translate("metrics.rate")}
          </p>
          <p className="mt-2 font-semibold text-2xl text-foreground-rich tabular-nums sm:text-3xl">
            {simulations.length
              ? formatter.number(winRate / 100, {
                  style: "percent",
                  maximumFractionDigits: 0,
                })
              : "—"}
          </p>
          <p className="mt-2 text-foreground-dimmed text-xs">
            {simulations.length
              ? translate("metrics.wins", {
                  wins: formatter.number(wins),
                  total: formatter.number(simulations.length),
                })
              : translate("unmeasured")}
          </p>
        </div>
        <div className="min-w-0 px-4 py-4 sm:px-6">
          <p className="min-h-10 font-medium text-foreground text-xs sm:min-h-5">
            {translate("metrics.comparisons")}
          </p>
          <p className="mt-2 font-semibold text-2xl text-foreground-rich tabular-nums sm:text-3xl">
            {formatter.number(simulations.length)}
          </p>
          <p className="mt-2 text-foreground-dimmed text-xs">
            {translate("metrics.competitors", { count: competitors.length })}
          </p>
        </div>
        <div className="min-w-0 px-4 py-4 sm:px-6">
          <p className="min-h-10 font-medium text-foreground text-xs sm:min-h-5">
            {translate("metrics.coverage")}
          </p>
          <p className="mt-2 font-semibold text-2xl text-foreground-rich tabular-nums sm:text-3xl">
            {formatter.number(product.quality / 100, {
              style: "percent",
              maximumFractionDigits: 0,
            })}
          </p>
          <Popover>
            <PopoverTrigger
              render={<Button variant="ghost" color="neutral" />}
              className="mt-2 max-w-full text-xs"
            >
              <FileSearchIcon className="size-4 shrink-0" />
              <span className="truncate">{translate("method.title")}</span>
            </PopoverTrigger>
            <PopoverPositioner side="bottom" align="end">
              <PopoverPopup className="max-w-80">
                <PopoverTitle className="font-semibold">
                  {translate("method.title")}
                </PopoverTitle>
                <p className="mt-2 text-foreground-dimmed text-sm leading-6">
                  {translate("method.description")}
                </p>
              </PopoverPopup>
            </PopoverPositioner>
          </Popover>
        </div>
      </div>
    </section>
  );
};

export const ProductFeedback = ({ kind }: { kind: "error" | "missing" }) => {
  const translate = useTranslations("dashboard.productWorkspace");
  const router = useRouter();
  const { store } = useParams<{ store: string }>();
  const [pending, startTransition] = useTransition();
  return (
    <div
      role="alert"
      aria-busy={pending}
      className="flex min-h-80 flex-col items-center justify-center gap-4 border-accent-foreground border-b px-6 py-12 text-center"
    >
      <AlertCircleIcon className="size-10 text-foreground-dimmed" />
      <h2 className="font-heading font-semibold text-2xl text-foreground-rich">
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
        <Button render={<Link href={`/dashboard/${store}/products`} />}>
          {translate("action.tertiary")}
        </Button>
      )}
    </div>
  );
};

export const PageSkeleton = () => (
  <div aria-hidden>
    <div className="flex gap-4 px-4 py-6 sm:gap-6 sm:px-6">
      <div className="size-20 shrink-0 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none sm:size-24" />
      <div className="min-w-0 flex-1">
        <div className="h-4 w-32 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        <div className="mt-2 h-9 w-96 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        <div className="mt-2 h-5 w-20 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        <div className="mt-2 h-4 w-40 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        <div className="mt-2 h-4 w-32 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
      </div>
    </div>
    <div className="border-accent-foreground border-b px-4 py-4 sm:px-6">
      <div className="h-9 w-128 max-w-full animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
    </div>
    <div className="border-accent-foreground border-b px-4 py-5 sm:px-6">
      <div className="h-7 w-72 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
      <div className="mt-2 h-6 w-96 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
    </div>
    <div className="grid min-w-0 lg:grid-cols-2">
      <div className="border-accent-foreground border-b lg:border-r lg:border-b-0">
        <div className="border-accent-foreground border-b px-4 py-4 sm:px-6">
          <div className="h-9 w-80 max-w-full animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
        </div>
        <div className="flex justify-between border-accent-foreground border-b px-4 py-3 sm:px-6">
          <div className="h-5 w-24 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
          <div className="h-5 w-28 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        </div>
        <div className="h-64 animate-pulse bg-foreground/5 motion-reduce:animate-none sm:h-72" />
        <div className="border-accent-foreground border-y px-4 py-5 sm:px-6">
          <div className="h-7 w-72 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
          <div className="mt-3 h-5 w-20 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
          <div className="mt-5 h-20 w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        </div>
      </div>
      <div className="divide-y divide-accent-foreground">
        {["source", "google", "assistant"].map((key) => (
          <div key={key} className="px-4 py-5 sm:px-6">
            <div className="h-6 w-48 max-w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
            <div className="mt-4 h-16 w-full animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
            <div className="mt-5 h-9 w-40 max-w-full animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  </div>
);
