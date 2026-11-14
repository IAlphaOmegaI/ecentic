import { ArrowRightIcon, DocumentPdfIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";
import { Link } from "@/i18n/navigation";
import { Crosshair } from "../../../_components/grid";
import { DashboardHeaderFigure } from "../../../_components/header-figure";

export const ResultsShell = ({ children }: PropsWithChildren) => {
  const translate = useTranslations("dashboard.workspace.results");
  return (
    <div className="flex min-w-0 flex-col">
      <header className="relative flex items-center gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <DashboardHeaderFigure subject="results" />
        <div>
          <h1 className="font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
            {translate("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-foreground-dimmed text-sm leading-6">
            {translate("description")}
          </p>
        </div>
        <Crosshair className="bottom-0 left-0 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-y-1/2" />
      </header>
      {children}
      <section className="relative flex flex-wrap items-center justify-between gap-5 border-accent-foreground border-y bg-primary/5 px-4 py-6 sm:px-6">
        <div className="flex max-w-2xl items-start gap-3">
          <DocumentPdfIcon
            aria-hidden
            className="mt-1 size-6 shrink-0 text-primary"
          />
          <div>
            <h2 className="font-semibold text-foreground-rich text-lg">
              {translate("reportsTitle")}
            </h2>
            <p className="mt-2 text-foreground-dimmed text-sm leading-6">
              {translate("reportsDescription")}
            </p>
          </div>
        </div>
        <Button
          variant="soft"
          color="neutral"
          render={<Link href="/dashboard/reports" />}
        >
          {translate("action.primary")}
          <ArrowRightIcon aria-hidden className="size-4" />
        </Button>
        <Crosshair className="bottom-0 left-0 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-y-1/2" />
      </section>
    </div>
  );
};
