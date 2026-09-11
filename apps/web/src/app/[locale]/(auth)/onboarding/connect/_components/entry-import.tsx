"use client";

import { ArrowRightIcon, CheckIcon, LoaderIcon } from "@zenncore/icons";
import { cn, resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Motion } from "@/components/motion";
import { Link, useRouter } from "@/i18n/navigation";
import type { Entry as EntryCookie } from "@/lib/redirect";
import { seo } from "@/lib/seo";
import * as Entry from "@/server/app/entry";

/** How long a tab waiting on another tab's import waits before asking again. */
const BUSY_RETRY_MS = 5000;

const PLATFORM_NAME = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  unknown: null,
} as const;

type Outcome = EntryCookie["status"] | "running" | "busy" | "failed";

/**
 * Onboarding's first step for a visitor who typed their store into the landing
 * hero. A `pending` entry imports itself the moment this mounts; every other
 * status is an outcome to explain, with the verified connect (the Shopify app,
 * the WooCommerce plugin) and the platform grid (`children`) as ways forward.
 */
export const EntryImport = ({ entry, children }: EntryImport.Props) => {
  // Scoped at `onboarding.connect` like the rest of this step — a namespace
  // one level deeper does not type (the `platforms` array beside it defeats
  // next-intl's key inference), full keys below it do.
  const translate = useTranslations("onboarding.connect");
  const locale = useLocale();
  const router = useRouter();
  const started = useRef(false);
  const [outcome, setOutcome] = useState<Outcome>(
    entry.status === "pending" ? "running" : entry.status,
  );

  const [runImport] = useAsyncAction(async () => {
    setOutcome("running");

    // Imported → the action redirects and never returns here. `claimed` and
    // `locked` are also written to the cookie, so the refresh that follows
    // renders the same state from the server.
    const call = await resultify(() => Entry.connect({ locale }));
    const result = call.success ? call.data : null;
    if (call.success && !result) return;
    if (!result?.success) {
      setOutcome("failed");
      return;
    }

    switch (result.data.kind) {
      case "claimed":
      case "locked":
      case "busy":
        setOutcome(result.data.kind);
        return;
      // Nothing left to import — another tab finished (or dismissed) it.
      // Re-render the step from the server's view of the cookie.
      case "idle":
        router.refresh();
        return;
    }
  });

  // Redirects from the action; a rejected call just leaves the panel in place.
  const [handleDismiss, isDismissing] = useAsyncAction(async () => {
    await resultify(() => Entry.dismiss({ locale }));
  });

  // Once per mount — a dev double-effect or a re-render must not start a
  // second import (the server holds a lock too, for a second tab).
  useEffect(() => {
    if (entry.status !== "pending" || started.current) return;
    started.current = true;
    void runImport();
  }, [entry.status, runImport]);

  // Another tab holds the import. Ask again shortly: it either finishes (the
  // cookie is spent → `idle` → refresh) or its lock lapses and this tab runs.
  useEffect(() => {
    if (outcome !== "busy") return;
    const timer = setTimeout(() => void runImport(), BUSY_RETRY_MS);
    return () => clearTimeout(timer);
  }, [outcome, runImport]);

  const platform = PLATFORM_NAME[entry.platform];

  const verified = (() => {
    switch (entry.platform) {
      case "shopify":
        return {
          label: translate("entry.verified.shopify"),
          href: seo.shopifyAppStore,
        };
      case "woocommerce":
        return {
          label: translate("entry.verified.woocommerce"),
          href: `/onboarding/connect/woocommerce?store_url=${encodeURIComponent(entry.origin)}`,
        };
      default:
        return null;
    }
  })();

  const dismiss = (
    <Button
      type="button"
      color="accent"
      disabled={isDismissing}
      onClick={() => void handleDismiss()}
    >
      {translate("entry.action.secondary")}
      {isDismissing ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ArrowRightIcon className="size-4" />
      )}
    </Button>
  );

  if (outcome === "running" || outcome === "busy")
    return (
      <Motion.Stagger stagger={0.12} className="flex flex-col gap-6 p-6">
        <Motion.Item className="flex flex-col gap-1">
          <h3 className="font-medium text-2xl text-foreground">
            {translate("entry.running.title", { host: entry.host })}
          </h3>
          <p className="font-light text-foreground-dimmed">
            {translate("entry.running.description")}
          </p>
        </Motion.Item>
        <ul className="flex flex-col gap-3">
          <Step done>
            {translate("entry.steps.reached", { host: entry.host })}
          </Step>
          {platform && (
            <Step done>
              {translate("entry.steps.detected", { platform })}
              {entry.products !== null && (
                <span className="text-foreground-dimmed">
                  {" · "}
                  {translate("entry.steps.products", { count: entry.products })}
                </span>
              )}
            </Step>
          )}
          <Step>
            {outcome === "busy"
              ? translate("entry.busy")
              : translate("entry.steps.importing")}
          </Step>
        </ul>
        <Motion.Item>
          <p className="font-light text-foreground-dimmed text-sm">
            {translate("entry.steps.slow")}
          </p>
        </Motion.Item>
      </Motion.Stagger>
    );

  const notice = (() => {
    switch (outcome) {
      case "failed":
        return {
          title: translate("entry.failed.title", { host: entry.host }),
          description: translate("entry.failed.description"),
        };
      case "claimed":
        return {
          title: translate("entry.claimed.title", { host: entry.host }),
          description: translate("entry.claimed.description"),
        };
      case "locked":
        return entry.platform === "woocommerce"
          ? {
              title: translate("entry.locked.woocommerce.title", {
                host: entry.host,
              }),
              description: translate("entry.locked.woocommerce.description"),
            }
          : {
              title: translate("entry.locked.shopify.title", {
                host: entry.host,
              }),
              description: translate("entry.locked.shopify.description"),
            };
      default:
        return {
          title: translate("entry.unsupported.title", { host: entry.host }),
          description: translate("entry.unsupported.description"),
        };
    }
  })();

  return (
    <div className="flex flex-col">
      <Motion.Up className="flex flex-col gap-4 border-accent-foreground border-b bg-background-dimmed p-6">
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-foreground text-xl">
            {notice.title}
          </h3>
          <p className="font-light text-foreground-dimmed">
            {notice.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {outcome === "failed" && (
            <Button
              type="button"
              color="primary"
              onClick={() => void runImport()}
            >
              {translate("entry.action.primary")}
            </Button>
          )}
          {verified && outcome !== "failed" && outcome !== "unsupported" && (
            <Button color="primary" render={<Link href={verified.href} />}>
              {verified.label}
              <ArrowRightIcon className="size-4" />
            </Button>
          )}
          {dismiss}
        </div>
      </Motion.Up>
      {children}
    </div>
  );
};

const Step = ({
  done = false,
  children,
}: {
  done?: boolean;
  children: ReactNode;
}) => (
  <li>
    <Motion.Item className="flex items-center gap-3 text-foreground">
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full",
          done ? "bg-primary/10 text-primary" : "text-foreground-dimmed",
        )}
      >
        {done ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <LoaderIcon className="size-4 animate-spin" />
        )}
      </span>
      <span>{children}</span>
    </Motion.Item>
  </li>
);

export namespace EntryImport {
  export type Props = {
    entry: EntryCookie;
    /** The platform grid, offered under every outcome as another way in. */
    children: ReactNode;
  };
}
