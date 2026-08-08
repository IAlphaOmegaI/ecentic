"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { type PropsWithChildren, Suspense, useEffect } from "react";
import { useConsent } from "./consent";

export const PostHogProvider = ({ children }: PropsWithChildren) => {
  const { decision, isReady } = useConsent();

  useEffect(() => {
    // `posthog` is a module singleton, so it outlives this effect: StrictMode's
    // double-invoke in dev and every Fast Refresh re-run would call init again
    // on an already-initialized client. PostHog no-ops that and warns; skipping
    // it keeps the console clean and the consent config below authoritative.
    if (posthog.__loaded) return;

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: "always",
      enable_heatmaps: true,
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      // Nothing is captured until the banner is answered. Without this, a
      // banner gating only GA4 would be telling visitors something untrue.
      opt_out_capturing_by_default: true,
      // Memory-only until consent. `opt_out_capturing_by_default` governs event
      // capture, not the persistence layer, so it alone is not a guarantee that
      // the `ph_<token>_posthog` identifier stays unwritten — and that
      // identifier is exactly the storage this banner exists to gate. Memory
      // persistence makes it unconditional: nothing reaches cookie or
      // localStorage until `granted` upgrades it below.
      persistence: "memory",
    });
  }, []);

  useEffect(() => {
    if (!isReady) return;

    if (decision === "granted") {
      posthog.set_config({ persistence: "localStorage+cookie" });
      posthog.opt_in_capturing();
      return;
    }

    // Declining or withdrawing. The guard matters: if consent was never granted
    // there is nothing to undo — init's own settings already hold the line — and
    // touching set_config/opt_out here would only churn PostHog's persistence
    // and opt-out flag on behalf of someone who simply said no.
    if (!posthog.has_opted_in_capturing()) return;

    posthog.opt_out_capturing();
    // Drops the identifier stored while consent was active, so withdrawing
    // removes it rather than just muting capture.
    posthog.reset();
    posthog.set_config({ persistence: "memory" });
  }, [decision, isReady]);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
};

const PostHogPageView = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (pathname && posthog) {
      const url = window.origin + pathname;
      const search = searchParams.toString();
      posthog.capture("$pageview", { $current_url: url, $search: search });
    }
  }, [pathname, searchParams, posthog]);

  return null;
};
