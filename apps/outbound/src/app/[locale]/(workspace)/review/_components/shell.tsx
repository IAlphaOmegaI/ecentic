import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { DashboardHeaderFigure } from "@/components/dashboard-header-figure";
import { Crosshair } from "../../_components/grid";

export const ReviewShell = async ({
  mode,
  children,
}: {
  mode: "queue" | "detail";
  children: ReactNode;
}) => {
  const translate = await getTranslations("outbound.review");
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <header className="relative flex items-center gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <DashboardHeaderFigure
          subject={mode === "detail" ? "reviewDetail" : "review"}
        />
        <div className="min-w-0">
          <h1 className="break-words font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
            {translate(mode === "queue" ? "queue.title" : "title")}
          </h1>
          <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm leading-6">
            {translate(mode === "queue" ? "queue.description" : "description")}
          </p>
        </div>
        <Crosshair className="bottom-0 left-0 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-y-1/2" />
      </header>
      <div className="min-w-0 flex-1 bg-background-rich">{children}</div>
    </div>
  );
};
