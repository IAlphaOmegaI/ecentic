"use client";

import { Button } from "@zenncore/web/components/button";
import { useConsent } from "@/context/consent";

/**
 * Re-opens the consent banner. GDPR requires consent be as easy to withdraw as
 * it was to give, so this stays reachable from every page via the footer.
 */
export const CookieSettings = ({ label }: { label: string }) => {
  const { revisit } = useConsent();

  return (
    <Button type="button" onClick={revisit} variant="ghost" color="accent">
      {label}
    </Button>
  );
};
