"use client";

import {
  ArrowRightIcon,
  CheckBadgeIcon,
  LinkedinIcon,
  SearchIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import {
  createColumnHelper,
  DataTable,
  DataTablePagination,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useFormatter, useMessages, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { z } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import type {
  Campaign,
  CampaignCompany,
  CampaignDiscoveryState,
  CampaignRun,
} from "@/lib/outbound-campaigns";
import * as Campaigns from "@/server/app/outbound/campaign-actions";
import {
  AutomationPanel,
  type AutomationSnapshot,
} from "../../_components/automation";
import { Empty, Notice } from "../../_components/common";
import { CampaignSettings, useCampaignMutation } from "./editor";

type CompanyRow = CampaignCompany & { _id: string };
const column = createColumnHelper<CompanyRow>();

export const CampaignDetail = ({
  data,
  claudeConfigured,
  automationStatus,
}: {
  claudeConfigured: boolean | null;
  automationStatus: AutomationSnapshot | null;
  data: {
    campaign: Campaign;
    companies: {
      rows: CampaignCompany[];
      total: number;
      page: number;
      pageSize: number;
    };
    latestRun: CampaignRun | null;
    discoveryState: CampaignDiscoveryState;
  };
}) => {
  const t = useTranslations("outbound.campaigns");
  const messages = useMessages();
  const format = useFormatter();
  const router = useRouter();
  const mutation = useCampaignMutation({ successMessage: null });
  const [feedbackVersion, setFeedbackVersion] = useState(0);
  const [hasCriteriaPreview, setHasCriteriaPreview] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<
    "auto" | "apollo" | "clay"
  >("auto");
  const [pending, transition] = useTransition();
  const { campaign, companies, latestRun, discoveryState } = data;
  const unavailable = !["draft", "active"].includes(campaign.status);
  const unsettled =
    latestRun && ["starting", "uncertain"].includes(latestRun.status);
  const exhausted =
    discoveryState.apolloExhausted && discoveryState.clayExhausted;
  const columns = [
    column.accessor("name", {
      header: t("company"),
      meta: { className: "min-w-64" },
      cell: ({ row }) => (
        <div className="min-w-0">
          <p
            className="truncate font-medium text-foreground-rich"
            title={row.original.name}
          >
            {row.original.name}
          </p>
          <p
            className="mt-1 truncate text-foreground-dimmed text-xs"
            title={row.original.domain}
          >
            {row.original.domain}
          </p>
        </div>
      ),
    }),
    column.accessor("country", {
      header: t("country"),
      meta: { className: "w-28" },
      cell: ({ getValue }) => <span>{getValue() || t("unknown")}</span>,
    }),
    column.accessor("platform", {
      header: t("platform"),
      meta: { className: "w-32" },
      cell: ({ getValue }) => (
        <span>
          {getValue() === "shopify"
            ? "Shopify"
            : getValue() === "woocommerce"
              ? "WooCommerce"
              : t("unknown")}
        </span>
      ),
    }),
    column.accessor("teamSize", {
      header: t("teamSize"),
      meta: { className: "w-24" },
      cell: ({ getValue }) => (
        <span className="tabular-nums">
          {getValue() === null ? t("unknown") : format.number(getValue() ?? 0)}
        </span>
      ),
    }),
    column.accessor("source", {
      header: t("source"),
      meta: { className: "w-24" },
      cell: ({ getValue }) => (getValue() === "apollo" ? "Apollo" : "Clay"),
    }),
    column.accessor("annualRevenue", {
      header: t("revenue"),
      meta: { className: "w-36" },
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap tabular-nums">
          {getValue() === null
            ? t("unknown")
            : format.number(getValue() ?? 0, {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              })}
        </span>
      ),
    }),
    column.accessor("status", {
      header: t("status"),
      meta: { className: "w-48" },
      cell: ({ row }) => {
        const reason = row.original.reason;
        const reasons = messages.outbound.campaigns.reasons;
        return (
          <div>
            <span className="inline-flex rounded-sm bg-background-dimmed px-2 py-1 text-xs">
              {t(`companyStatuses.${row.original.status}`)}
            </span>
            {reason && (
              <p className="mt-2 text-foreground-dimmed text-xs leading-5">
                {Object.hasOwn(reasons, reason)
                  ? reasons[reason as keyof typeof reasons]
                  : t("reviewRequired")}
              </p>
            )}
          </div>
        );
      },
    }),
    column.display({
      id: "action",
      header: "",
      meta: { className: "w-44" },
      cell: ({ row }) =>
        row.original.prospectId ? (
          <Button
            variant="soft"
            color="neutral"
            render={
              <Link
                href={`/prospects/${row.original.prospectId}`}
                prefetch={false}
              />
            }
          >
            {t("openProspect")}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        ) : row.original.status === "candidate" &&
          row.original.criteriaRevision === campaign.revision ? (
          <Button
            variant="soft"
            color="neutral"
            disabled={unavailable}
            render={
              <Link
                href={`/campaigns/${campaign.id}/companies/${row.original.id}`}
                prefetch={false}
              />
            }
          >
            {t(
              automationStatus?.enabled
                ? "viewContactOptional"
                : "findContacts",
            )}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        ) : null,
    }),
  ];
  return (
    <div className="w-full min-w-0 max-w-full">
      <section className="flex flex-wrap items-start justify-between gap-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="break-words font-heading font-medium text-foreground-rich text-xl">
            {campaign.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-foreground-dimmed text-sm">
            <span>{t(`statuses.${campaign.status}`)}</span>
            <span>{t("criteriaVersion", { version: campaign.revision })}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="soft"
            color="neutral"
            render={<Link href={`/review?campaign=${campaign.id}`} />}
          >
            <CheckBadgeIcon aria-hidden className="size-4" />
            {t("reviewMessages")}
          </Button>
          <Button
            variant="soft"
            color="neutral"
            render={<Link href={`/linkedin?campaign=${campaign.id}`} />}
          >
            <LinkedinIcon aria-hidden className="size-4" />
            {t("linkedinQueue")}
          </Button>
        </div>
      </section>
      <AutomationPanel
        initial={automationStatus}
        campaign={campaign}
        hasCriteriaPreview={hasCriteriaPreview}
      />
      <CampaignSettings
        key={campaign.id}
        campaign={campaign}
        feedbackVersion={feedbackVersion}
        onPreviewChange={setHasCriteriaPreview}
        claudeConfigured={claudeConfigured}
      />
      <section
        aria-busy={pending || mutation.pending}
        className="w-full min-w-0 max-w-full"
      >
        <div className="space-y-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-heading font-medium text-foreground-rich text-xl">
              {t("companiesTitle")}
            </h2>
            <p className="text-foreground-dimmed text-sm tabular-nums">
              {t("companiesCount", { count: companies.total })}
            </p>
          </div>
          <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
            {t("discoverySavedCriteria", {
              version: format.number(campaign.revision),
            })}
          </p>
          {automationStatus?.enabled && (
            <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
              {t("automaticContactsHelp")}
            </p>
          )}
          <InferredForm
            config={{
              provider: field({
                shape: "select",
                validator: z.enum(["auto", "apollo", "clay"]),
                label: t("source"),
                classList: {
                  field: "min-w-0",
                  description: "hidden",
                },
                items: [
                  { value: "auto", label: t("automaticSource") },
                  { value: "apollo", label: "Apollo" },
                  { value: "clay", label: "Clay" },
                ],
              }),
            }}
            defaultValues={{ provider: "auto" as const }}
            className="grid min-w-0 max-w-2xl items-end gap-4 space-y-0 sm:grid-cols-[minmax(0,1fr)_auto]"
            onChange={({ provider }) => setSelectedProvider(provider)}
            onSubmit={({ provider }) => {
              if (hasCriteriaPreview) return;
              setFeedbackVersion((version) => version + 1);
              return mutation.run(() =>
                Campaigns.runCampaignDiscovery({
                  id: campaign.id,
                  expectedRevision: campaign.revision,
                  provider,
                }),
              );
            }}
          >
            <Button
              type="submit"
              disabled={
                unavailable ||
                Boolean(unsettled) ||
                exhausted ||
                hasCriteriaPreview ||
                mutation.pending
              }
            >
              <SearchIcon aria-hidden className="size-4" />
              {t(
                mutation.pending
                  ? "discoveryRunning"
                  : "discovery.action.primary",
              )}
            </Button>
          </InferredForm>
          {hasCriteriaPreview && (
            <p role="status" className="text-foreground-dimmed text-sm">
              {t("discoveryPreviewPending")}
            </p>
          )}
          <p className="max-w-3xl text-foreground-dimmed text-sm leading-6">
            {t(`discoverySourceHelp.${selectedProvider}`)}
          </p>
          {unavailable && (
            <p className="text-foreground-dimmed text-sm">
              {t("discoveryPaused")}
            </p>
          )}
          {exhausted && (
            <p className="text-foreground-dimmed text-sm">
              {t("discoveryExhausted")}
            </p>
          )}
          {unsettled && (
            <p className="text-foreground-dimmed text-sm">
              {t(
                latestRun?.status === "uncertain"
                  ? "uncertainHelp"
                  : "runningHelp",
              )}
            </p>
          )}
          <Notice value={mutation.notice} />
          {latestRun && (
            <div className="space-y-2 text-foreground-dimmed text-xs">
              <p>
                {t("latestRun")}:{" "}
                {latestRun.provider === "apollo" ? "Apollo" : "Clay"} ·{" "}
                {t(`runStatuses.${latestRun.status}`)} ·{" "}
                {t("runCount", { count: latestRun.companyCount })}
              </p>
              {latestRun.error && (
                <p role="alert" className="text-error">
                  {Object.hasOwn(
                    messages.outbound.campaigns.errors,
                    latestRun.error,
                  )
                    ? messages.outbound.campaigns.errors[
                        latestRun.error as keyof typeof messages.outbound.campaigns.errors
                      ]
                    : t("actionError")}
                </p>
              )}
            </div>
          )}
        </div>
        <DataTableProvider
          rows={companies.rows.map((company) => ({
            ...company,
            _id: company.id,
          }))}
          columns={columns}
          handler="server"
          pageIndex={companies.page}
          pageSize={companies.pageSize}
          rowCount={companies.total}
          onPaginationChange={({ pageIndex }) =>
            transition(() =>
              router.push(
                `/campaigns/${campaign.id}${pageIndex > 1 ? `?page=${pageIndex}` : ""}`,
                { scroll: false },
              ),
            )
          }
        >
          {companies.rows.length === 0 ? (
            <Empty
              title={t(
                latestRun?.status === "failed"
                  ? "companySearchFailedTitle"
                  : "companyEmptyTitle",
              )}
              description={t(
                latestRun?.status === "failed"
                  ? "companySearchFailedDescription"
                  : "companyEmptyDescription",
              )}
            />
          ) : (
            <div
              className="w-full min-w-0 max-w-full overflow-x-auto"
              inert={pending}
            >
              <DataTable
                className="min-w-304 table-fixed"
                classList={{
                  "header-cell":
                    "h-10 bg-background-dimmed/50 px-4 font-medium text-xs normal-case tracking-normal",
                  "body-cell": "px-4 py-4 text-sm",
                  "body-row": "hover:bg-background/70",
                }}
              />
            </div>
          )}
          {companies.total > 0 && (
            <div className="sm:px-2">
              <DataTablePagination
                variant="soft"
                labels={{
                  navigation: t("companyPagination"),
                  page: (page, pages) => t("page", { page, pages }),
                  firstPage: t("firstPage"),
                  previousPage: t("previousPage"),
                  nextPage: t("nextPage"),
                  lastPage: t("lastPage"),
                }}
              />
            </div>
          )}
        </DataTableProvider>
      </section>
    </div>
  );
};
