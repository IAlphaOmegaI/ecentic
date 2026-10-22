"use client";

import { LoaderIcon } from "@zenncore/icons";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import * as ClaimCheck from "@/server/app/intelligence/claim-check";
import { Band } from "../../../../../_components/grid";

const POLL_INTERVAL_MS = 5000;

/**
 * Shown while a check is in flight. Polls that run's status — not the whole
 * report — and refreshes the route once it is no longer running, so the report
 * (or the failure note) appears without the merchant doing anything.
 */
export const RunningBanner = ({ run }: { run: string }) => {
  const translate = useTranslations("dashboard.claims.running");
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      void (async () => {
        const result = await ClaimCheck.status({ run });
        // A failed poll (run gone, session lapsed) refreshes too, so the page
        // shows the server's view instead of spinning forever.
        if (!result.success || result.data !== "running") {
          clearInterval(interval);
          router.refresh();
        }
      })();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [run, router]);

  return (
    <Band
      surface={false}
      className="flex items-center gap-3 bg-primary/5 px-6 py-4"
    >
      <LoaderIcon className="size-4 shrink-0 animate-spin text-primary" />
      <div>
        <p className="font-medium text-foreground text-sm">
          {translate("title")}
        </p>
        <p className="mt-0.5 text-foreground-dimmed text-xs">
          {translate("description")}
        </p>
      </div>
    </Band>
  );
};
