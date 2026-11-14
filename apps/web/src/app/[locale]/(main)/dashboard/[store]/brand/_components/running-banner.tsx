"use client";

import { LoaderIcon } from "@zenncore/icons";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { useRouter } from "@/i18n/navigation";
import * as BrandSnapshot from "@/server/app/brand-snapshot";
import { BrandUnavailable } from "./shell";

const POLL_INTERVAL_MS = 5000;

export const RunningBanner = ({
  store,
  hasReport = false,
}: {
  store: string;
  hasReport?: boolean;
}) => {
  const translate = useTranslations("dashboard.brand.design.running");
  const router = useRouter();
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = { current: 0, failures: 0 };
    const poll = async () => {
      try {
        const result = await BrandSnapshot.isRunning({ store });
        if (controller.signal.aborted) return;
        if (result.success) {
          timer.failures = 0;
          setUnavailable(false);
          if (!result.data) {
            router.refresh();
            return;
          }
        } else {
          timer.failures += 1;
        }
      } catch {
        // A transient connection failure must not leave an unhandled rejection.
        // Keep the current state and retry without starting another analysis.
        timer.failures += 1;
      }
      if (!controller.signal.aborted) {
        if (timer.failures >= 3) setUnavailable(true);
        timer.current = window.setTimeout(() => void poll(), POLL_INTERVAL_MS);
      }
    };
    timer.current = window.setTimeout(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer.current);
    };
  }, [store, router]);

  if (unavailable) return <BrandUnavailable />;

  if (hasReport)
    return (
      <div
        role="status"
        className="flex gap-3 border-accent-foreground border-b bg-primary/5 px-6 py-4"
      >
        <LoaderIcon
          aria-hidden
          className="mt-0.5 size-5 shrink-0 animate-spin text-primary motion-reduce:animate-none"
        />
        <div>
          <p className="font-semibold text-foreground-rich text-sm">
            {translate("title")}
          </p>
          <p className="mt-1 text-foreground-dimmed text-sm">
            {translate("previous")}
          </p>
        </div>
      </div>
    );

  return (
    <div role="status" className="grid min-w-0 sm:grid-cols-3">
      <div className="flex flex-col justify-center px-6 py-12 sm:col-span-2 sm:px-8">
        <LoaderIcon
          aria-hidden
          className="mb-5 size-6 animate-spin text-primary motion-reduce:animate-none"
        />
        <h2 className="font-heading font-semibold text-2xl text-foreground-rich">
          {translate("title")}
        </h2>
        <p className="mt-3 max-w-lg text-foreground-dimmed text-sm leading-6">
          {translate("description")}
        </p>
        <p className="mt-6 text-foreground-dimmed text-xs leading-6">
          {translate("steps")}
        </p>
      </div>
      <div
        aria-hidden
        className="flex min-h-40 items-center justify-center bg-primary/5 p-6 sm:min-h-72"
      >
        <div className="size-40 text-primary">
          <EvolvingAscii artwork="selection" />
        </div>
      </div>
    </div>
  );
};
