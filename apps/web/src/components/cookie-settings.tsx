"use client";

import { useConsent } from "@/context/consent";

/**
 * Re-opens the consent banner. GDPR requires consent be as easy to withdraw as
 * it was to give, so this stays reachable from every page via the footer.
 */
export const CookieSettings = () => {
  const { revisit } = useConsent();

  return (
    <button
      type="button"
      onClick={revisit}
      className="cursor-pointer font-light text-foreground-dimmed text-sm transition-colors hover:text-primary"
    >
      Cookie settings
    </button>
  );
};
