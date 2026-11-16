"use client";

import { LoaderIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import * as Brand from "@/server/app/intelligence/brand";

/**
 * Starts a background brand analysis. The action returns as soon as the run is
 * queued (the audit itself continues server-side via `after()`), so this only
 * spins briefly; the refreshed page then shows the in-progress banner, which
 * polls and swaps in the report when it lands. The resolved store belongs to the streamed report region.
 */
export const RefreshBrand = ({
  store,
  disabled = false,
  variant = "refresh",
}: {
  store: string;
  disabled?: boolean;
  variant?: "refresh" | "run";
}) => {
  const translate = useTranslations("dashboard.brand");
  const toast = useToastManager();
  const router = useRouter();

  const [handleAnalyze, isAnalyzing] = useAsyncAction(async () => {
    const result = await resultify(() => Brand.analyze({ store }));

    if (!result.success || !result.data.success) {
      toast.add({
        title: translate("toast.failed"),
        description: translate("design.error"),
        type: "error",
      });
      return;
    }

    if (result.data.data.alreadyRunning) {
      toast.add({ title: translate("toast.alreadyRunning") });
      router.refresh();
      return;
    }

    toast.add({
      title: translate("toast.started.title"),
      description: translate("toast.started.description"),
      type: "success",
    });
    router.refresh();
  });

  return (
    <Button
      color={variant === "run" ? "primary" : "neutral"}
      variant={variant === "run" ? "default" : "soft"}
      className="shrink-0 gap-1.5"
      disabled={isAnalyzing || disabled}
      onClick={() => handleAnalyze()}
    >
      {isAnalyzing ? (
        <LoaderIcon
          aria-hidden
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      ) : null}
      {translate(
        variant === "run" ? "design.action.primary" : "design.action.secondary",
      )}
    </Button>
  );
};
