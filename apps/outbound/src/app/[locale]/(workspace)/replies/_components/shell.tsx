import { ArrowLeftIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { DashboardHeaderFigure } from "@/components/dashboard-header-figure";
import { Link } from "@/i18n/navigation";
import { Crosshair } from "../../_components/grid";

export const ConversationShell = async ({
  children,
  detail = false,
}: {
  children: ReactNode;
  detail?: boolean;
}) => {
  const t = await getTranslations("outbound.conversations");
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <header className="relative flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <DashboardHeaderFigure subject="replies" />
          <div className="min-w-0">
            <h1 className="break-words font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm leading-6">
              {t(detail ? "detailDescription" : "description")}
            </p>
          </div>
        </div>
        {detail && (
          <Button
            variant="soft"
            color="neutral"
            render={<Link href="/replies" />}
          >
            <ArrowLeftIcon aria-hidden className="size-4" />
            {t("list.action.secondary")}
          </Button>
        )}
        <Crosshair className="bottom-0 left-0 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-y-1/2" />
      </header>
      <div className="min-w-0 flex-1 bg-background-rich">{children}</div>
    </div>
  );
};
