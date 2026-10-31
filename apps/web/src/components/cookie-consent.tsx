"use client";

import { Button } from "@zenncore/web/components/button";
import { useTranslations } from "next-intl";
import { useConsent } from "@/context/consent";
import { Link } from "@/i18n/navigation";
import { Plus } from "./plus";

export const CookieConsent = () => {
  const { decision, isReady, accept, reject } = useConsent();
  const translate = useTranslations("cookieConsent");

  if (!isReady || decision) return null;
  // The room screens run unattended on a big display. `isReady` means this is the
  // browser, and a pathname hook here would break prerendering in the root layout.
  if (/\/agents\/(stage|board)/.test(window.location.pathname)) return null;

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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-header text-base text-foreground">
              {translate("title")}
            </h2>
            <p className="text-foreground-dimmed text-sm">
              {translate("message")}{" "}
              <Link
                href="/privacy-policy"
                className="text-primary-text underline underline-offset-2"
              >
                {translate("privacy")}
              </Link>
              .
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button color="accent" onClick={reject}>
              {translate("action.secondary")}
            </Button>
            <Button color="primary" onClick={accept}>
              {translate("action.primary")}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
};
