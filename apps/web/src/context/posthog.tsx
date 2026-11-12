"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { type PropsWithChildren, Suspense, useEffect } from "react";
import { useConsent } from "./consent";

export const PostHogProvider = ({ children }: PropsWithChildren) => {
  const { decision, isReady } = useConsent();

  useEffect(() => {
    if (!isReady) return;
    if (decision === "granted") {
      // Do not initialize the SDK or contact its configuration endpoint before consent.
      const newlyInitialized = !posthog.__loaded;
      if (newlyInitialized)
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
          person_profiles: "always",
          enable_heatmaps: true,
          disable_surveys: true,
          ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
          opt_out_capturing_by_default: true,
          persistence: "memory",
        });
      posthog.set_config({ persistence: "localStorage+cookie" });
      posthog.opt_in_capturing();
      if (newlyInitialized)
        posthog.capture("$pageview", { $current_url: window.location.href });
      return;
    }

    // Declining or withdrawing. The guard matters: if consent was never granted
    // there is nothing to undo — init's own settings already hold the line — and
    // touching set_config/opt_out here would only churn PostHog's persistence
    // and opt-out flag on behalf of someone who simply said no.
    if (!posthog.__loaded || !posthog.has_opted_in_capturing()) return;

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
  const { decision, isReady } = useConsent();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (isReady && decision === "granted" && pathname && posthog?.__loaded) {
      const url = window.origin + pathname;
      const search = searchParams.toString();
      posthog.capture("$pageview", { $current_url: url, $search: search });
    }
  }, [pathname, searchParams, posthog, decision, isReady]);

  return null;
};
