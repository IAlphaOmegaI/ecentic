"use client";

import { ChevronLeftIcon, LoaderIcon, ShieldCheckIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useTranslations } from "next-intl";
import { use } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import * as ClaimCheck from "@/server/app/intelligence/claim-check";

type Params = Promise<{ store: string; id: string }>;

/**
 * Starts a background claim check. The action returns once the run is queued
 * (the check continues server-side via `after()`), so this spins only briefly;
 * the refreshed page shows the running banner, which polls until the report
 * lands. `params` arrives as the route's promise so the trigger can sit in the
 * static shell.
 */
export const RunClaimCheck = ({ params }: { params: Params }) => {
  const { store, id } = use(params);
  const translate = useTranslations("dashboard.claims");
  const toast = useToastManager();
  const router = useRouter();

  const [handleRun, isStarting] = useAsyncAction(async () => {
    const result = await ClaimCheck.start({ store, product: id });

    if (!result.success) {
      toast.add({
        title:
          result.error.name === "conflict-error"
            ? translate("toast.limit")
            : translate("toast.failed"),
        description: result.error.message,
        type: "error",
      });
      return;
    }

    if (result.data.alreadyRunning) {
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
      color="primary"
      className="shrink-0 gap-1.5"
      disabled={isStarting}
      onClick={() => handleRun()}
    >
      {isStarting ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <ShieldCheckIcon className="size-4" />
      )}
      {translate("action.primary")}
    </Button>
  );
};

export const BackToProduct = ({ params }: { params: Params }) => {
  const { store, id } = use(params);
  const translate = useTranslations("dashboard.claims");

  return (
    <Button
      color="accent"
      render={<Link href={`/dashboard/${store}/products/${id}`} />}
    >
      <ChevronLeftIcon className="size-4" />
      {translate("action.secondary")}
    </Button>
  );
};
