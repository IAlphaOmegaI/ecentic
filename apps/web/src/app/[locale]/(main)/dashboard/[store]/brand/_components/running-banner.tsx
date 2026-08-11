"use client";

import { LoaderIcon } from "@zenncore/icons";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import * as BrandSnapshot from "@/server/app/brand-snapshot";

const POLL_INTERVAL_MS = 5000;

/**
 * Shown while a background analysis is in flight. Polls the lightweight
 * `isRunning` action and refreshes the route once the run lands, so the report
 * appears without the user doing anything — including after navigating away
 * and back.
 */
export const RunningBanner = ({ store }: { store: string }) => {
  const translate = useTranslations("dashboard.brand.running");
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      void (async () => {
        const result = await BrandSnapshot.isRunning({ store });
        if (result.success && !result.data) {
          clearInterval(interval);
          router.refresh();
        }
      })();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [store, router]);

  return (
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="relative mx-8 flex items-center gap-3 bg-primary/5 px-6 py-4">
        <LoaderIcon className="size-4 shrink-0 animate-spin text-primary" />
        <div>
          <p className="font-medium text-foreground text-sm">
            {translate("title")}
          </p>
          <p className="mt-0.5 text-foreground-dimmed text-xs">
            {translate("description")}
          </p>
        </div>
      </div>
    </div>
  );
};
