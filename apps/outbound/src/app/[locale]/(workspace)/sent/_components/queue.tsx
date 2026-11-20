"use client";

import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  SearchIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import {
  createColumnHelper,
  DataTable,
  DataTableEmpty,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@zenncore/web/components/select";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useTransition } from "react";
import { z } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import {
  SENT_STATUSES,
  type SentQuery,
  type SentQueue,
  type SentRow,
  type SentStatus,
  sentHref,
} from "@/lib/outbound-sent";

export const SentStatusBadge = ({ status }: { status: SentStatus }) => {
  const t = useTranslations("outbound.sent.status");
  const Icon =
    status === "accepted"
      ? CheckCircleIcon
      : status === "claimed"
        ? ClockIcon
        : AlertCircleIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-1 text-xs",
        status === "accepted"
          ? "bg-success/10 text-success"
          : status === "failed"
            ? "bg-error/10 text-error"
            : status === "uncertain"
              ? "bg-warning/10 text-warning"
              : "bg-background text-foreground-dimmed",
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {t(status)}
    </span>
  );
};
type Row = SentRow & { _id: string };
const column = createColumnHelper<Row>();
export const SentQueueTable = ({
  queue,
  query,
}: {
  queue: SentQueue;
  query: SentQuery;
}) => {
  const t = useTranslations("outbound.sent");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (next: SentQuery) =>
    startTransition(() => router.push(sentHref(next), { scroll: false }));
  const current = { ...query, page: queue.page };
  const filtered =
    Boolean(query.q) || query.status !== "all" || query.kind !== "all";
  const pages = Math.max(1, Math.ceil(queue.total / queue.pageSize));
  const rows = useMemo(
    () => queue.rows.map((row) => ({ ...row, _id: row.id })),
    [queue.rows],
  );
  const columns = useMemo(
    () => [
      column.accessor("recipient", {
        header: t("columns.recipient"),
        meta: { className: "w-1/2 md:w-56" },
        cell: ({ row }) => (
          <Link
            href={`/sent/${row.original.id}`}
            prefetch={false}
            className="block min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span
              className="block truncate font-medium text-foreground-rich"
              title={row.original.recipient}
            >
              {row.original.recipient || t("unknown")}
            </span>
            <span className="mt-1 block truncate text-foreground-dimmed text-xs">
              {row.original.company}
            </span>
            <span className="mt-1 block truncate text-foreground-dimmed text-xs md:hidden">
              {row.original.subject || t("unknown")}
            </span>
          </Link>
        ),
      }),
      column.accessor("subject", {
        header: t("columns.subject"),
        meta: { className: "hidden md:table-cell" },
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate" title={row.original.subject}>
              {row.original.subject || t("unknown")}
            </p>
            <p className="mt-1 truncate text-foreground-dimmed text-xs">
              {t("step", { step: String(row.original.step) })}
              {row.original.test ? ` · ${t("test")}` : ""}
            </p>
          </div>
        ),
      }),
      column.accessor("campaignName", {
        header: t("columns.campaign"),
        meta: { className: "hidden w-36 2xl:table-cell" },
        cell: ({ row }) =>
          row.original.campaignId ? (
            <Link
              href={sentHref({ campaign: row.original.campaignId })}
              className="block truncate text-primary-text"
              title={row.original.campaignName ?? ""}
            >
              {row.original.campaignName ?? t("unknown")}
            </Link>
          ) : (
            t("unknown")
          ),
      }),
      column.accessor("sender", {
        header: t("columns.sender"),
        meta: { className: "hidden w-48 2xl:table-cell" },
        cell: ({ getValue }) => (
          <p
            className="truncate text-foreground-dimmed text-xs"
            title={getValue()}
          >
            {getValue() || t("unknown")}
          </p>
        ),
      }),
      column.accessor("status", {
        header: t("columns.status"),
        meta: { className: "w-32" },
        cell: ({ row }) => (
          <div className="space-y-1">
            <SentStatusBadge status={row.original.status} />
            {row.original.sequenceStatus === "bounced" && (
              <p className="text-error text-xs">{t("sequence.bounced")}</p>
            )}
            <p className="text-foreground-dimmed text-xs md:hidden">
              {t("step", { step: String(row.original.step) })}
              {row.original.test ? ` · ${t("test")}` : ""}
            </p>
          </div>
        ),
      }),
      column.accessor("recordedAt", {
        header: t("columns.time"),
        meta: { className: "hidden w-40 xl:table-cell" },
        cell: ({ getValue }) => (
          <time
            dateTime={getValue()}
            className="text-foreground-dimmed text-xs"
          >
            {format.dateTime(new Date(getValue()), {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "UTC",
            })}
          </time>
        ),
      }),
      column.display({
        id: "open",
        header: "",
        meta: { className: "w-12 px-1" },
        cell: ({ row }) => (
          <Button
            variant="soft"
            color="neutral"
            size="icon"
            aria-label={`${t("action.primary")}: ${row.original.recipient}`}
            render={<Link href={`/sent/${row.original.id}`} prefetch={false} />}
          >
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        ),
      }),
    ],
    [t, format],
  );
  const statuses = [
    { value: "all" as const, label: t("allStatuses") },
    ...SENT_STATUSES.map((value) => ({ value, label: t(`status.${value}`) })),
    { value: "bounced" as const, label: t("bouncedFilter") },
  ];
  const kinds = [
    { value: "all" as const, label: t("allKinds") },
    { value: "outreach" as const, label: t("outreach") },
    { value: "test" as const, label: t("test") },
  ];
  return (
    <div aria-busy={pending}>
      <div className="flex flex-wrap items-start gap-3 border-accent-foreground border-b px-4 py-5 sm:px-6">
        <InferredForm
          key={query.q}
          config={{
            q: field({
              shape: "text",
              validator: z.string().max(200),
              label: t("searchLabel"),
              placeholder: t("searchPlaceholder"),
              leadingContent: <SearchIcon aria-hidden className="size-4" />,
              classList: { field: "min-w-0 flex-1", label: "sr-only" },
            }),
          }}
          defaultValues={{ q: query.q }}
          onSubmit={({ q }) => navigate({ ...current, q, page: 1 })}
          className="flex min-w-56 flex-1 gap-2"
        >
          <Button
            type="submit"
            variant="soft"
            color="neutral"
            disabled={pending}
          >
            {t("action.quaternary")}
          </Button>
        </InferredForm>
        <Select
          value={query.status}
          items={statuses}
          disabled={pending}
          onValueChange={(status) =>
            navigate({ ...current, status: status ?? "all", page: 1 })
          }
        >
          <SelectTrigger
            aria-label={t("statusFilter")}
            className="min-w-40 text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectPositioner align="start" className="z-40">
            <SelectPopup>
              {statuses.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </SelectPositioner>
        </Select>
        <Select
          value={query.kind}
          items={kinds}
          disabled={pending}
          onValueChange={(kind) =>
            navigate({ ...current, kind: kind ?? "all", page: 1 })
          }
        >
          <SelectTrigger
            aria-label={t("kindFilter")}
            className="min-w-36 text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectPositioner align="start" className="z-40">
            <SelectPopup>
              {kinds.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </SelectPositioner>
        </Select>
        {filtered && (
          <Button
            variant="soft"
            color="neutral"
            disabled={pending}
            onClick={() =>
              navigate({
                ...current,
                q: "",
                status: "all",
                kind: "all",
                page: 1,
              })
            }
          >
            {t("action.tertiary")}
          </Button>
        )}
        {(query.prospect || query.campaign) && (
          <Button variant="soft" color="neutral" render={<Link href="/sent" />}>
            {t("action.secondary")}
          </Button>
        )}
      </div>
      <p
        aria-live="polite"
        className="border-accent-foreground border-b px-4 py-4 font-medium text-foreground-rich text-sm tabular-nums sm:px-6"
      >
        {t("count", { count: queue.total })}
      </p>
      <DataTableProvider
        rows={rows}
        columns={columns}
        handler="server"
        pageIndex={queue.page}
        pageSize={queue.pageSize}
        rowCount={queue.total}
        onPaginationChange={({ pageIndex }) =>
          navigate({ ...current, page: pageIndex })
        }
      >
        <div
          className={cn("max-w-full overflow-x-auto", pending && "opacity-60")}
          inert={pending}
        >
          <DataTable
            className="w-full table-fixed border-b-0"
            classList={{
              "header-cell":
                "h-10 bg-background-dimmed/50 px-4 font-medium text-xs normal-case tracking-normal",
              "body-cell": "px-4 py-3 font-normal text-sm",
              "body-row": "hover:bg-background/70",
            }}
          >
            <DataTableEmpty>
              <div className="px-6 py-14 text-center">
                <h2 className="font-medium text-foreground-rich">
                  {t(filtered ? "noMatches" : "emptyTitle")}
                </h2>
                <p className="mt-2 text-foreground-dimmed text-sm">
                  {t("emptyDescription")}
                </p>
              </div>
            </DataTableEmpty>
          </DataTable>
        </div>
      </DataTableProvider>
      <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-t px-4 py-4 sm:px-6">
        <p className="text-foreground-dimmed text-xs">
          {t("pagination.page", {
            page: String(queue.page),
            pages: String(pages),
          })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="soft"
            color="neutral"
            disabled={pending || queue.page <= 1}
            onClick={() => navigate({ ...current, page: queue.page - 1 })}
          >
            <ChevronLeftIcon aria-hidden className="size-4" />
            {t("pagination.previous")}
          </Button>
          <Button
            variant="soft"
            color="neutral"
            disabled={pending || queue.page >= pages}
            onClick={() => navigate({ ...current, page: queue.page + 1 })}
          >
            {t("pagination.next")}
            <ChevronRightIcon aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
      <p className="px-4 pb-5 text-foreground-dimmed text-xs leading-5 sm:px-6">
        {t("acceptanceNote")} {t("timezone")}
      </p>
    </div>
  );
};
