"use client";

import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { useConsent } from "@/context/consent";
import { Plus } from "./plus";

export const CookieConsent = () => {
  const { decision, isReady, accept, reject } = useConsent();

  if (!isReady || decision) return null;

  return (
    <aside
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-100 flex justify-center p-4 sm:p-6"
    >
      <div className="relative w-full max-w-2xl border border-accent-foreground bg-background p-5 shadow-lg sm:p-6">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-header text-base text-foreground">
              Cookies on ecentic
            </h2>
            <p className="text-foreground-dimmed text-sm">
              We use analytics cookies to see how the site is used so we can
              improve it. No advertising, no ad targeting. Read our{" "}
              <Link
                href="/privacy-policy"
                className="text-primary underline underline-offset-2"
              >
                privacy policy
              </Link>
              .
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button color="accent" onClick={reject}>
              Decline
            </Button>
            <Button color="primary" onClick={accept}>
              Accept
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
};
