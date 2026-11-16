"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import * as BrandSnapshot from "@/server/app/brand-snapshot";
import { DashboardLoadingState } from "../../../_components/loading-state";
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

  return (
    <DashboardLoadingState
      title={translate("title")}
      description={translate(hasReport ? "previous" : "description")}
      figure="brand-megaphone"
      compact={hasReport}
      scope={hasReport ? "section" : "page"}
      className="border-accent-foreground border-b"
    >
      {!hasReport && (
        <p className="mt-4 text-foreground-dimmed text-xs leading-6">
          {translate("steps")}
        </p>
      )}
    </DashboardLoadingState>
  );
};
