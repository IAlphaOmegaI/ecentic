"use client";

import { ClockIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import {
  createColumnHelper,
  DataTable,
  DataTablePagination,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { useFormatter, useMessages, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import type { AutomationStatus } from "@/lib/outbound-automation";
import type { Campaign } from "@/lib/outbound-campaigns";
import * as Automation from "@/server/app/outbound/automation-actions";
import * as Campaigns from "@/server/app/outbound/campaign-actions";
import { Notice } from "./common";

export type AutomationSnapshot = AutomationStatus;
type AutomationRow = AutomationSnapshot["jobs"][number] & { _id: string };
const column = createColumnHelper<AutomationRow>();

export const AutomationPanel = ({
  initial,
  campaign,
  hasCriteriaPreview = false,
}: {
  initial: AutomationSnapshot | null;
  campaign?: Campaign;
  hasCriteriaPreview?: boolean;
}) => {
  const t = useTranslations("outbound.automation");
  const messages = useMessages();
  const format = useFormatter();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [statusFailed, setStatusFailed] = useState(initial === null);
  const [pending, setPending] = useState(false);
  const working = useRef(false);
  const polling = useRef(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const campaignId = campaign?.id;
  useEffect(() => {
    setSnapshot(initial);
    setStatusFailed(initial === null);
  }, [initial]);
  const refresh = async () => {
    const result = await Automation.getStatus(campaignId ? { campaignId } : {});
    if (!result.success) throw result.error;
    setSnapshot(result.data);
    setStatusFailed(false);
  };
  useEffect(() => {
    const lifecycle = { mounted: true };
    const interval = setInterval(async () => {
      if (
        document.visibilityState === "hidden" ||
        polling.current ||
        working.current
      )
        return;
      polling.current = true;
      const result = await resultify(() =>
        Automation.getStatus(campaignId ? { campaignId } : {}),
      );
      if (lifecycle.mounted) {
        if (result.success && result.data.success) {
          setSnapshot(result.data.data);
          setStatusFailed(false);
        } else setStatusFailed(true);
      }
      polling.current = false;
    }, 20_000);
    return () => {
      lifecycle.mounted = false;
      clearInterval(interval);
    };
  }, [campaignId]);
  const run = async (operation: () => Promise<void>, success: string) => {
    if (working.current) return;
    working.current = true;
    setPending(true);
    setNotice(null);
    const result = await resultify(async () => {
      await operation();
      await refresh();
    });
    setNotice({
      error: !result.success,
      text: result.success ? success : t("actionError"),
    });
    working.current = false;
    setPending(false);
    router.refresh();
  };
  const changeCampaign = (status: "active" | "paused") => {
    if (!campaign) return;
    return run(
      async () => {
        const updated = await Campaigns.updateCampaign({
          id: campaign.id,
          name: campaign.name,
          expectedRevision: campaign.revision,
          status,
        });
        if (!updated.success) throw updated.error;
        if (status === "active") {
          const started = await Automation.run({ campaignId: campaign.id });
          if (!started.success) throw started.error;
        }
      },
      t(status === "active" ? "campaignStarted" : "campaignPaused"),
    );
  };
  const label = (
    group: "stages" | "statuses" | "reasons",
    key: string | null,
  ) => {
    const values = messages.outbound.automation[group];
    return key && Object.hasOwn(values, key)
      ? values[key as keyof typeof values]
      : t(
          group === "stages"
            ? "unknownStage"
            : group === "statuses"
              ? "unknownStatus"
              : "unknownReason",
        );
  };
  const columns = [
    column.accessor("companyName", {
      header: t("company"),
      meta: { className: "min-w-56" },
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link
            href={`/campaigns/${row.original.campaignId}/companies/${row.original.companyId}`}
            className="block truncate font-medium text-foreground-rich"
            title={row.original.companyName}
          >
            {row.original.companyName}
          </Link>
          {row.original.prospectId && (
            <Link
              href={`/prospects/${row.original.prospectId}`}
              className="mt-1 inline-block text-primary text-xs"
            >
              {t("openProspect")}
            </Link>
          )}
        </div>
      ),
    }),
    column.accessor("stage", {
      header: t("stage"),
      meta: { className: "w-44" },
      cell: ({ getValue }) => label("stages", getValue()),
    }),
    column.accessor("status", {
      header: t("status"),
      meta: { className: "w-36" },
      cell: ({ getValue }) => label("statuses", getValue()),
    }),
    column.accessor("reason", {
      header: t("reason"),
      meta: { className: "w-80" },
      cell: ({ getValue }) =>
        getValue() ? label("reasons", getValue()) : t("noBlocker"),
    }),
  ];
  const active = campaign
    ? campaign.status === "active"
    : Boolean(snapshot?.activeCampaigns);
  const researchBlocked = Boolean(snapshot?.research.blocked?.length);
  const researchProviders = researchBlocked
    ? (snapshot?.research.blocked ?? [])
    : (snapshot?.research.missing ?? []);
  return (
    <section
      className="w-full min-w-0 max-w-full border-accent-foreground border-b"
      aria-busy={pending}
    >
      <div className="space-y-4 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading font-medium text-foreground-rich text-xl">
              {t("title")}
            </h2>
            <p className="mt-1 max-w-3xl text-foreground-dimmed text-sm leading-6">
              {t("help")}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-sm bg-background-dimmed px-2.5 py-1.5 text-sm">
            <ClockIcon aria-hidden className="size-4" />
            {t(
              !snapshot
                ? "unknownStatus"
                : !snapshot.enabled
                  ? "modeOff"
                  : !active
                    ? "campaignInactive"
                    : snapshot.counts.running > 0
                      ? "working"
                      : "waiting",
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {campaign && campaign.status === "active" && (
            <Button
              variant="soft"
              color="neutral"
              disabled={pending}
              onClick={() => changeCampaign("paused")}
            >
              {t("campaign.action.secondary")}
            </Button>
          )}
          {campaign && ["draft", "paused"].includes(campaign.status) && (
            <Button
              disabled={pending || !snapshot?.enabled || hasCriteriaPreview}
              onClick={() => changeCampaign("active")}
            >
              {t("campaign.action.primary")}
            </Button>
          )}
          {active && (
            <Button
              disabled={pending || !snapshot?.enabled || hasCriteriaPreview}
              onClick={() =>
                run(async () => {
                  const processed = await Automation.run(
                    campaignId ? { campaignId } : {},
                  );
                  if (!processed.success) throw processed.error;
                }, t("runComplete"))
              }
            >
              {t(pending ? "processing" : "action.primary")}
            </Button>
          )}
          <Button
            variant="soft"
            color="neutral"
            disabled={pending}
            onClick={() => run(async () => {}, t("refreshed"))}
          >
            {t("action.secondary")}
          </Button>
          <Button
            variant="soft"
            color="neutral"
            render={<Link href="/playbook#automation" />}
          >
            {t("action.tertiary")}
          </Button>
        </div>
        {snapshot && !snapshot.enabled && (
          <p className="text-foreground-dimmed text-sm">{t("enableHelp")}</p>
        )}
        {snapshot?.research.required && !snapshot.research.ready && (
          <div
            className="space-y-3 border-accent-foreground border-t pt-4"
            role="status"
          >
            <div>
              <h3 className="font-medium text-foreground-rich text-sm">
                {t(
                  researchBlocked
                    ? "research.blockedTitle"
                    : "research.missingTitle",
                )}
              </h3>
              <p className="mt-1 max-w-3xl text-foreground-dimmed text-sm leading-6">
                {t(
                  researchBlocked
                    ? "research.blockedHelp"
                    : "research.missingHelp",
                  {
                    providers: format.list(
                      researchProviders.map((provider) =>
                        provider === "scrapellm"
                          ? "ScrapeLLM"
                          : provider === "firecrawl"
                            ? "Firecrawl"
                            : t("research.unknownProvider"),
                      ),
                    ),
                  },
                )}
              </p>
            </div>
            <Button
              variant="soft"
              color="neutral"
              render={<Link href="/integrations#shopping-research" />}
            >
              {t(researchBlocked ? "research.reviewAction" : "research.action")}
            </Button>
          </div>
        )}
        {hasCriteriaPreview && (
          <p className="text-foreground-dimmed text-sm">
            {t("previewPending")}
          </p>
        )}
        {campaign?.status === "paused" && (
          <p className="text-foreground-dimmed text-sm">{t("pauseHelp")}</p>
        )}
        {statusFailed && (
          <p role="alert" className="text-error text-sm">
            {t("statusError")}
          </p>
        )}
        <Notice value={notice} />
        {snapshot && (
          <div className="flex flex-wrap gap-x-8 gap-y-3 border-accent-foreground border-t pt-4">
            {(
              ["queued", "running", "held", "uncertain", "complete"] as const
            ).map((state) => (
              <div key={state}>
                <p className="text-foreground-dimmed text-xs">
                  {t(`counts.${state}`)}
                </p>
                <p className="mt-1 font-medium text-foreground-rich text-xl tabular-nums">
                  {format.number(snapshot.counts[state])}
                </p>
              </div>
            ))}
          </div>
        )}
        <p className="text-foreground-dimmed text-xs leading-5">
          {t("preparedHelp")}
        </p>
        {snapshot && (
          <div className="space-y-3 border-accent-foreground border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-medium text-base text-foreground-rich">
                {t("deliveryTitle")}
              </h3>
              <span className="text-foreground-dimmed text-sm">
                {t(
                  snapshot.delivery.ready ? "deliveryReady" : "deliveryBlocked",
                )}
              </span>
            </div>
            <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
              {t("deliveryHelp")}
            </p>
            {snapshot.delivery.blockers.length > 0 && (
              <ul className="grid list-disc gap-x-8 gap-y-2 pl-4 text-foreground-dimmed text-sm sm:grid-cols-2">
                {snapshot.delivery.blockers.map((reason) => (
                  <li key={reason}>
                    {Object.hasOwn(
                      messages.outbound.automation.deliveryBlockers,
                      reason,
                    )
                      ? messages.outbound.automation.deliveryBlockers[
                          reason as keyof typeof messages.outbound.automation.deliveryBlockers
                        ]
                      : t("unknownReason")}
                  </li>
                ))}
              </ul>
            )}
            {snapshot.delivery.inboxes.length > 0 && (
              <div className="min-w-0 space-y-3 pt-2">
                <h3 className="font-medium text-base text-foreground-rich">
                  {t("volumeTitle")}
                </h3>
                <div className="max-w-full overflow-x-auto">
                  <Table className="min-w-120 table-fixed [&_td]:font-normal">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/2 text-xs normal-case">
                          {messages.outbound.integrations.mailbox.fields.email}
                        </TableHead>
                        <TableHead className="text-xs normal-case">
                          {t("currentCap")}
                        </TableHead>
                        <TableHead className="text-xs normal-case">
                          {t("targetCap")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {snapshot.delivery.inboxes.map((inbox) => (
                        <TableRow key={inbox.email}>
                          <TableCell
                            className="truncate text-sm"
                            title={inbox.email}
                          >
                            {inbox.email}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {format.number(inbox.dailyCap)}
                            {inbox.rampHeld && (
                              <span className="mt-1 block text-foreground-dimmed text-xs">
                                {t("rampHeld")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {format.number(inbox.target)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="max-w-3xl text-foreground-dimmed text-xs leading-5">
                  {t("rampHelp")}
                </p>
              </div>
            )}
            <Button
              variant="soft"
              color="neutral"
              render={<Link href="/integrations" />}
            >
              {t("action.quaternary")}
            </Button>
          </div>
        )}
      </div>
      {snapshot && snapshot.jobs.length > 0 ? (
        <DataTableProvider
          rows={snapshot.jobs.map((job) => ({ ...job, _id: job.id }))}
          columns={columns}
          pageSize={10}
        >
          <div className="w-full min-w-0 max-w-full overflow-x-auto">
            <DataTable
              className="min-w-240 table-fixed"
              classList={{
                "header-cell":
                  "h-10 bg-background-dimmed/50 px-4 font-medium text-xs normal-case tracking-normal",
                "body-cell": "px-4 py-4 text-sm",
              }}
            />
          </div>
          <DataTablePagination
            variant="soft"
            labels={{
              navigation: t("pagination"),
              page: (page, pages) => t("page", { page, pages }),
              firstPage: t("firstPage"),
              previousPage: t("previousPage"),
              nextPage: t("nextPage"),
              lastPage: t("lastPage"),
            }}
          />
        </DataTableProvider>
      ) : snapshot ? (
        <p className="px-4 pb-5 text-foreground-dimmed text-sm sm:px-6">
          {t("empty")}
        </p>
      ) : null}
    </section>
  );
};

export const AutomationSkeleton = () => (
  <div
    aria-hidden
    className="space-y-4 border-accent-foreground border-b px-4 py-5 motion-safe:animate-pulse sm:px-6"
  >
    <div className="h-6 w-48 rounded-sm bg-accent-foreground/40" />
    <div className="h-4 w-3/4 rounded-sm bg-accent-foreground/40" />
    <div className="flex gap-3">
      <div className="h-10 w-32 rounded-sm bg-accent-foreground/40" />
      <div className="h-10 w-32 rounded-sm bg-accent-foreground/40" />
    </div>
    <div className="grid grid-cols-5 gap-5 pt-4">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="h-12 rounded-sm bg-accent-foreground/40" />
      ))}
    </div>
  </div>
);
