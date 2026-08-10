"use client";

import { FaceSearchIcon, LoaderIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useTranslations } from "next-intl";
import { use } from "react";
import { useRouter } from "@/i18n/navigation";
import * as Brand from "@/server/app/intelligence/brand";

/**
 * Kicks off a full brand analysis (~a minute of audited queries) and refreshes
 * the page once the snapshot lands. `params` arrives as the route's promise so
 * the trigger can sit in the static shell; `use()` resolves it client-side.
 */
export const RefreshBrand = ({
  params,
  variant = "refresh",
}: {
  params: Promise<{ store: string }>;
  variant?: "refresh" | "run";
}) => {
  const { store } = use(params);
  const translate = useTranslations("dashboard.brand");
  const toast = useToastManager();
  const router = useRouter();

  const [handleAnalyze, isAnalyzing] = useAsyncAction(async () => {
    const result = await Brand.analyze({ store });

    if (!result.success) {
      toast.add({
        title: translate("toast.failed"),
        description: result.error.message,
        type: "error",
      });
      return;
    }

    router.refresh();
  });

  return (
    <Button
      color="primary"
      className="shrink-0 gap-1.5"
      disabled={isAnalyzing}
      onClick={() => handleAnalyze()}
    >
      {isAnalyzing ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <FaceSearchIcon className="size-4" />
      )}
      {translate(variant === "run" ? "action.run" : "action.refresh")}
    </Button>
  );
};
