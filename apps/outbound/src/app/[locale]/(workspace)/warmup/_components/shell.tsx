import { ArrowLeftIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { DashboardHeaderFigure } from "@/components/dashboard-header-figure";
import { Link } from "@/i18n/navigation";
import { Crosshair } from "../../_components/grid";

export const WarmupShell = async ({
  children,
  detail = false,
}: {
  children: ReactNode;
  detail?: boolean;
}) => {
  const t = await getTranslations("outbound.warmup");
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <header className="relative flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <DashboardHeaderFigure subject="warmup" />
          <div className="min-w-0">
            <h1 className="break-words font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
              {t(detail ? "detailTitle" : "title")}
            </h1>
            <p className="mt-2 max-w-3xl text-foreground-dimmed text-sm leading-6">
              {t("description")}
            </p>
          </div>
        </div>
        {detail && (
          <Button
            variant="soft"
            color="neutral"
            render={<Link href="/warmup" />}
          >
            <ArrowLeftIcon aria-hidden className="size-4" />
            {t("title")}
          </Button>
        )}
        <Crosshair className="bottom-0 left-1 translate-y-1/2" />
        <Crosshair className="right-1 bottom-0 translate-y-1/2" />
      </header>
      <div className="min-w-0 flex-1 bg-background-rich">{children}</div>
    </div>
  );
};
