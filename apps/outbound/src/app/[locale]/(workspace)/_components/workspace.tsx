import { ArrowLeftIcon, ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DashboardHeaderFigure } from "@/components/dashboard-header-figure";
import { Link } from "@/i18n/navigation";
import * as Outbound from "@/server/app/outbound";
import * as Claude from "@/server/app/outbound/claude-actions";
import * as Connections from "@/server/app/outbound/integrations";
import * as LinkedInAccounts from "@/server/app/outbound/linkedin-accounts";
import * as ProspectProgress from "@/server/app/outbound/prospect-progress-actions";
import { Environment } from "@/server/utils/environment";
import { ProspectSummary } from "../prospects/[id]/_components/summary";
import { Empty } from "./common";
import { Replies } from "./conversations";
import { Crosshair } from "./grid";
import { Integrations } from "./integrations";
import type { Section } from "./navigation";
import { PipelineOverview } from "./pipeline-overview";
import { PlaybookEditor } from "./playbook";
import { ProspectEditor, ProspectList } from "./prospects";
import { WorkspaceSkeleton } from "./skeletons";

type Mode =
  | Exclude<Section, "review" | "linkedin" | "campaigns" | "warmup" | "sent">
  | "new"
  | "detail";

export const WorkspacePage = async ({
  section,
  params,
}: {
  section: Mode;
  params?: Promise<{ id: string }>;
}) => {
  const t = await getTranslations("outbound");
  const key =
    section === "prospects" || section === "new" || section === "detail"
      ? "prospect"
      : section === "overview"
        ? "pipeline"
        : section;
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <header className="relative flex flex-wrap items-center justify-between gap-5 border-accent-foreground border-b px-4 py-6 sm:px-6">
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
                ? t("prospect.newTitle")
                : section === "detail"
                  ? t("prospect.editTitle")
                  : t(`${key}.title`)}
            </h1>
            <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm leading-6">
              {section === "detail"
                ? t("prospect.summary.description")
                : t(`${key}.description`)}
            </p>
          </div>
        </div>
        {(section === "new" || section === "detail") && (
          <Button
            variant="soft"
            color="neutral"
            render={<Link href="/prospects" />}
          >
            <ArrowLeftIcon aria-hidden className="size-4" />
            {t("nav.prospects")}
          </Button>
        )}
        {section === "overview" && (
          <Button render={<Link href="/campaigns" />}>
            {t("nav.campaigns")}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        )}
        <Crosshair className="bottom-0 left-0 translate-y-1/2" />
        <Crosshair className="right-0 bottom-0 translate-y-1/2" />
      </header>
      <div className="min-w-0 flex-1 bg-background-rich">
        <Suspense fallback={<WorkspaceSkeleton section={section} />}>
          <WorkspaceData section={section} params={params} />
        </Suspense>
      </div>
    </div>
  );
};

const WorkspaceData = async ({
  section,
  params,
}: {
  section: Mode;
  params?: Promise<{ id: string }>;
}) => {
  const t = await getTranslations("outbound");
  if (section === "overview") return <PipelineOverview />;
  const result = await Outbound.getWorkspace(Environment.SERVER);
  if (!result.success)
    return (
      <div role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {t("common.error")}
      </div>
    );
  const workspace = result.data;
  switch (section) {
    case "prospects": {
      const progress = await ProspectProgress.getProgress(Environment.SERVER, {
        prospectIds: workspace.prospects.map((prospect) => prospect.id),
      });
      return (
        <ProspectList
          prospects={workspace.prospects}
          target={workspace.playbook.weeklyTarget}
          progress={progress.success ? progress.data : null}
          automationEnabled={workspace.playbook.automationEnabled}
        />
      );
    }
    case "new":
      return <ProspectEditor />;
    case "detail": {
      const id = (await params)?.id;
      const prospect = workspace.prospects.find((entry) => entry.id === id);
      if (!prospect)
        return (
          <Empty
            title={t("prospect.emptyTitle")}
            description={t("prospect.emptyDescription")}
          />
        );
      const [clay, progress] = await Promise.all([
        Connections.getClayStatus(Environment.SERVER),
        ProspectProgress.getProgress(Environment.SERVER, {
          prospectIds: [prospect.id],
        }),
      ]);
      return (
        <ProspectSummary
          prospect={prospect}
          clay={clay.success ? clay.data : null}
          progress={progress.success ? (progress.data[0] ?? null) : null}
        />
      );
    }
    case "replies":
      return (
        <Replies prospects={workspace.prospects} events={workspace.events} />
      );
    case "playbook": {
      const accounts = await LinkedInAccounts.list();
      return (
        <PlaybookEditor
          value={workspace.playbook}
          revision={workspace.playbookRevision}
          linkedinAccounts={accounts.success ? accounts.data : []}
        />
      );
    }
    case "integrations": {
      const [status, claude] = await Promise.all([
        Connections.getStatus(Environment.SERVER),
        Claude.getStatus(Environment.SERVER),
      ]);
      return (
        <Integrations
          status={status.success ? status.data : null}
          inboxes={workspace.inboxes}
          claude={claude.success ? claude.data : null}
        />
      );
    }
    default:
      return null;
  }
};
