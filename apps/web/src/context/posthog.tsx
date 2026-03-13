"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { type PropsWithChildren, Suspense, useEffect } from "react";

export const PostHogProvider = ({ children }: PropsWithChildren) => {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: "always",
      enable_heatmaps: true,
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    });
  }, []);

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
