"use client";

import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";
import { QueryTransitionFade } from "@/components/query-transition";
import { DashboardLoadingState } from "../../../_components/loading-state";

export const CatalogTransition = ({ children }: PropsWithChildren) => {
  const translate = useTranslations("dashboard.products.catalog");

  return (
    <QueryTransitionFade
      blur
      className="flex min-w-0 flex-1 flex-col"
      contentClassName="flex min-w-0 flex-1 flex-col"
      indicator={
        <DashboardLoadingState
          title={translate("loading")}
          compact
          className="rounded-lg bg-background-rich/95"
        />
      }
    >
      {children}
    </QueryTransitionFade>
  );
};
