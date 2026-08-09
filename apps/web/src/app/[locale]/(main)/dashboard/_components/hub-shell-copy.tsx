"use client";

import { PlusIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { StatusPill } from "./grid";

export const HubShellCopy = () => {
  const translate = useTranslations("dashboard.hub");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <StatusPill tone="neutral">{translate("workspace")}</StatusPill>
        <h1 className="mt-3 font-bold text-3xl text-foreground-rich tracking-[-0.02em]">
          {translate("title")}
        </h1>
        <p className="mt-1 text-foreground-dimmed text-sm">
          {translate("description")}
        </p>
      </div>
      <Button color="primary" render={<Link href="/onboarding/connect" />}>
        <PlusIcon className="size-4" />
        {translate("action.primary")}
      </Button>
    </div>
  );
};
