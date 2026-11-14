"use client";

import {
  ArrowRightIcon,
  CodeIcon,
  FileSearchIcon,
  GlobeIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { formatRelativeTime } from "@/lib/date";
import type * as GoogleMerchant from "@/server/app/integration/google-merchant";
import { Crosshair } from "../../../_components/grid";
import { ChannelSection } from "./workspace";

type Source = {
  name: string;
  domain: string;
  platform: string;
  status: string;
  lastSyncedAt: string | null;
};

export const ChannelLoadError = () => {
  const translate = useTranslations("dashboard.channels.error");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div
      role="alert"
      className="flex min-h-64 flex-col items-start justify-center gap-3 px-4 py-8 sm:px-6"
    >
      <FileSearchIcon className="size-9 text-primary" />
      <h2 className="font-semibold text-xl">{translate("title")}</h2>
      <p className="max-w-xl text-foreground-dimmed text-sm">
        {translate("description")}
      </p>
      <Button
        variant="soft"
        color="neutral"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {translate("action.primary")}
      </Button>
    </div>
  );
};

export const ChannelsSummary = ({
  store,
  source,
  google,
}: {
  store: string;
  source: Source;
  google: GoogleMerchant.Status | null;
}) => {
  const translate = useTranslations("dashboard.channels");
  const locale = useLocale();
  const formatter = useFormatter();
  const sourceStatus = [
    "connected",
    "syncing",
    "disconnected",
    "error",
  ].includes(source.status)
    ? (source.status as "connected" | "syncing" | "disconnected" | "error")
    : "unavailable";
  const googleStatus = !google
    ? "unavailable"
    : !google.supported
      ? "unsupported"
      : !google.connected
        ? "notConnected"
        : google.linkState !== "active" || !google.provisioned
          ? "setup"
          : "connected";
  const status = (
    value:
      | "connected"
      | "syncing"
      | "disconnected"
      | "error"
      | "unavailable"
      | "unsupported"
      | "notConnected"
      | "setup",
  ) => (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-medium text-sm",
        value === "connected"
          ? "text-success"
          : value === "error"
            ? "text-error"
            : value === "syncing" || value === "setup"
              ? "text-primary-text"
              : "text-foreground-dimmed",
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {translate(`status.${value}`)}
    </span>
  );
  return (
    <>
      <ChannelSection className="grid sm:grid-cols-2">
        <div className="min-w-0 px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/5 text-primary">
              {source.platform.startsWith("shopify") ||
              source.platform.startsWith("woocommerce") ? (
                <Image
                  width={24}
                  height={24}
                  src={
                    source.platform.startsWith("shopify")
                      ? "/providers/shopify.svg"
                      : "/providers/woocommerce.svg"
                  }
                  alt=""
                  className="size-6 object-contain"
                />
              ) : (
                <GlobeIcon className="size-6" />
              )}
            </span>
            <h2 className="font-semibold text-xl">
              {translate("source.title")}
            </h2>
          </div>
          <p className="mt-3 text-foreground-dimmed text-sm">
            {translate("source.description")}
          </p>
          <p className="mt-5 break-words font-medium">{source.name}</p>
          <p className="mt-1 break-all text-foreground-dimmed text-sm">
            {source.domain}
          </p>
          <p className="mt-3 text-foreground-dimmed text-sm">
            {source.lastSyncedAt
              ? translate("source.synced", {
                  date: formatRelativeTime(
                    new Date(source.lastSyncedAt),
                    locale,
                  ),
                })
              : translate("source.never")}
          </p>
          {source.platform.endsWith("-public") && (
            <p className="mt-3 max-w-xl text-foreground-dimmed text-sm leading-6">
              {translate("source.public")}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {status(sourceStatus)}
            <Button
              color="neutral"
              variant="soft"
              render={
                <Link
                  href={`/dashboard/settings?tab=integrations&store=${store}`}
                />
              }
            >
              {translate("source.action.primary")}
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
        <div className="min-w-0 border-accent-foreground border-t px-4 py-6 sm:border-t-0 sm:border-l sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/5 text-primary">
              <Image
                width={24}
                height={24}
                src="/images/google.svg"
                alt=""
                className="size-6 object-contain"
              />
            </span>
            <h2 className="font-semibold text-xl">
              {translate("google.title")}
            </h2>
          </div>
          <p className="mt-3 text-foreground-dimmed text-sm">
            {translate("google.description")}
          </p>
          {google?.connected && (
            <dl className="mt-5 grid grid-cols-3 gap-3">
              {(
                [
                  ["pending", google.offers.pending],
                  ["verified", google.offers.live],
                  ["issues", google.offers.disapproved + google.offers.error],
                ] as const
              ).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-foreground-dimmed text-sm">
                    {translate(`google.${key}`)}
                  </dt>
                  <dd className="mt-2 font-semibold text-2xl tabular-nums">
                    {formatter.number(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-4 text-foreground-dimmed text-sm leading-6">
            {translate("google.note")}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {status(googleStatus)}
            <Button
              color="neutral"
              variant="soft"
              render={<Link href={`/dashboard/${store}/google-shopping`} />}
            >
              {translate("google.action.primary")}
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </ChannelSection>
      <ChannelSection className="flex flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:px-6">
        <span className="text-primary">
          <ShoppingCartIcon className="size-8" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-xl">
            {translate("checkout.title")}
          </h2>
          <p className="mt-2 text-foreground-dimmed text-sm leading-6">
            {translate("checkout.description")}
          </p>
          <p className="mt-1 text-foreground-dimmed text-xs leading-5">
            {translate("checkout.scope")}
          </p>
        </div>
        <Button
          color="neutral"
          variant="soft"
          render={<Link href={`/dashboard/${store}/ucp`} />}
        >
          {translate("checkout.action.primary")}
          <ArrowRightIcon className="size-4" />
        </Button>
      </ChannelSection>
      <ChannelSection>
        <div className="px-4 py-5 sm:px-6">
          <h2 className="font-semibold text-xl">{translate("tools.title")}</h2>
          <p className="mt-2 text-foreground-dimmed text-sm">
            {translate("tools.description")}
          </p>
        </div>
        <div className="relative border-accent-foreground border-t before:pointer-events-none before:absolute before:inset-y-0 before:left-1/2 before:hidden before:border-accent-foreground before:border-l sm:before:block">
          <Crosshair className="-top-1.5 left-1/2 hidden -translate-x-1/2 sm:block" />
          {(
            [
              [
                { key: "checks", route: "agentic", icon: FileSearchIcon },
                { key: "access", route: "visibility", icon: GlobeIcon },
              ],
              [
                { key: "webmcp", route: "webmcp", icon: CodeIcon },
                {
                  key: "playground",
                  route: "ucp-playground",
                  icon: ShoppingCartIcon,
                },
              ],
              [
                {
                  key: "comparison",
                  route: "ucp-comparison",
                  icon: FileSearchIcon,
                },
              ],
            ] as const
          ).map((row) => (
            <div
              key={row[0]?.key}
              className="grid border-accent-foreground border-t first-of-type:border-t-0 sm:grid-cols-2"
            >
              {row.map(({ key, route, icon: Icon }, index) => (
                <Link
                  key={key}
                  href={`/dashboard/${store}/${route}`}
                  className={cn(
                    "group flex min-w-0 items-center gap-3 px-4 py-5 font-medium text-sm hover:bg-primary/5 focus-visible:outline-primary sm:px-6",
                    index > 0 &&
                      "border-accent-foreground border-t sm:border-t-0",
                  )}
                >
                  <Icon className="size-5 shrink-0 text-primary" />
                  <span className="flex-1">{translate(`tools.${key}`)}</span>
                  <ArrowRightIcon className="size-4 text-foreground-dimmed" />
                </Link>
              ))}
            </div>
          ))}
          <Crosshair className="-bottom-1.5 left-1/2 hidden -translate-x-1/2 sm:block" />
        </div>
      </ChannelSection>
      <ChannelSection className="px-4 py-6 sm:px-6">
        <h2 className="font-semibold text-lg">{translate("research.title")}</h2>
        <p className="mt-2 max-w-3xl text-foreground-dimmed text-sm leading-6">
          {translate("research.description")}
        </p>
        <Button
          className="mt-4"
          color="neutral"
          variant="soft"
          render={<Link href={`/dashboard/${store}/research/catalog-rank`} />}
        >
          {translate("research.action.primary")}
          <ArrowRightIcon className="size-4" />
        </Button>
      </ChannelSection>
    </>
  );
};
