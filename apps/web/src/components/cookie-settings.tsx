"use client";

import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { useConsent } from "@/context/consent";

/**
 * Re-opens the consent banner. GDPR requires consent be as easy to withdraw as
 * it was to give, so this stays reachable from every page via the footer.
 */
export const CookieSettings = ({
  label,
  appearance = "button",
}: CookieSettings.Props) => {
  const { revisit } = useConsent();

  return (
    <Button
      type="button"
      onClick={revisit}
      variant="ghost"
      color="accent"
      className={cn(
        appearance === "link" &&
          "justify-start rounded-none p-0 font-normal text-foreground-dimmed text-sm leading-relaxed hover:bg-transparent hover:text-primary-text hover:underline hover:underline-offset-4 max-[801px]:py-3 max-[801px]:text-base max-[801px]:leading-6",
      )}
    >
      {label}
    </Button>
  );
};

export namespace CookieSettings {
  export type Props = { label: string; appearance?: "button" | "link" };
}
