import { ArrowLeftIcon, ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import { DashboardHeaderFigure } from "@/components/dashboard-header-figure";
import { Link } from "@/i18n/navigation";
import { Crosshair } from "./grid";
import type { Section } from "./navigation";
import { WorkspaceSkeleton } from "./skeletons";

type Mode =
  | Exclude<Section, "review" | "linkedin" | "campaigns" | "warmup" | "sent">
  | "new"
  | "detail";

export const WorkspacePage = async ({
  section,
  children,
}: WorkspacePage.Props) => {
  const translate = await getTranslations("outbound");
  const key =
    section === "prospects" || section === "new" || section === "detail"
      ? "prospect"
      : section === "overview"
        ? "pipeline"
        : section;
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <header className="relative flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <DashboardHeaderFigure
            subject={
              section === "new"
                ? "prospectNew"
                : section === "detail"
                  ? "prospectDetail"
                  : section
            }
          />
          <div className="min-w-0">
            <h1 className="break-words font-heading font-semibold text-3xl text-foreground-rich tracking-tight">
              {section === "new"
                ? translate("prospect.newTitle")
                : section === "detail"
                  ? translate("prospect.editTitle")
                  : translate(`${key}.title`)}
            </h1>
            <p className="mt-2 max-w-2xl text-foreground-dimmed text-sm leading-6">
              {section === "detail"
                ? translate("prospect.summary.description")
                : translate(`${key}.description`)}
            </p>
          </div>
        </div>
        {(section === "new" || section === "detail") && (
          <Button
            variant="soft"
            color="neutral"
            render={<Link href="/prospects" />}
          >
            <ArrowLeftIcon aria-hidden />
            {translate("nav.prospects")}
          </Button>
        )}
        {section === "overview" && (
          <Button render={<Link href="/campaigns" />}>
            {translate("nav.campaigns")}
            <ArrowRightIcon aria-hidden />
          </Button>
        )}
        <Crosshair className="bottom-0 left-0 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-y-1/2" />
      </header>
      <div className="min-w-0 flex-1 bg-background-rich">
        <Suspense fallback={<WorkspaceSkeleton section={section} />}>
          {children}
        </Suspense>
      </div>
    </div>
  );
};

export namespace WorkspacePage {
  export type Props = { section: Mode; children: ReactNode };
}
