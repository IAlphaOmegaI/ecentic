"use client";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import {
  createColumnHelper,
  DataTable,
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
  type ActivityQuery,
  activityHref,
  type ConversationActivity,
  type ConversationActivityRow,
} from "@/lib/outbound-conversation-activity";

type Row = ConversationActivityRow & { _id: string };
const column = createColumnHelper<Row>();
export const ConversationActivityTable = ({
  activity,
  query,
}: {
  activity: ConversationActivity;
  query: ActivityQuery;
}) => {
  const t = useTranslations("outbound.conversations");
  const navigation = useTranslations("outbound.sent");
  const router = useRouter();
  const format = useFormatter();
  const [pending, startTransition] = useTransition();
  const navigate = (next: ActivityQuery) =>
    startTransition(() => router.push(activityHref(next), { scroll: false }));
  const rows = useMemo(
    () => activity.rows.map((row) => ({ ...row, _id: row.id })),
    [activity.rows],
  );
  const columns = useMemo(
    () => [
      column.accessor("company", {
        header: t("columns.person"),
        meta: { className: "w-56" },
        cell: ({ row }) => (
          <Link
            href={
              query.view === "scheduled"
                ? `/prospects/${row.original.prospectId}`
                : `/replies/${row.original.prospectId}`
            }
            prefetch={false}
            className="block min-w-0"
          >
            <span className="block truncate font-medium text-foreground-rich">
              {row.original.company}
            </span>
            <span className="mt-1 block truncate text-foreground-dimmed text-xs">
              {row.original.person}
            </span>
          </Link>
        ),
      }),
      column.accessor("kind", {
        header: t("activity.kind"),
        meta: { className: "w-40" },
        cell: ({ row }) => (
          <span>
            {row.original.kind === "emailStep"
              ? navigation("step", { step: String(row.original.step) })
              : t(`activity.${row.original.kind}`)}
          </span>
        ),
      }),
      column.accessor("channel", {
        header: t("columns.channel"),
        meta: { className: "w-28" },
        cell: ({ getValue }) => t(`channel.${getValue()}`),
      }),
      column.accessor("status", {
        header: t("columns.stage"),
        meta: { className: "w-36" },
        cell: ({ getValue }) => (
          <span className="text-foreground-dimmed text-xs">
            {getValue() === "scheduled"
              ? t("views.scheduled")
              : t(
                  `send.${getValue() as "accepted" | "starting" | "failed" | "uncertain"}`,
                )}
          </span>
        ),
      }),
      column.accessor("at", {
        header: t("activity.time"),
        meta: { className: "w-44" },
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
            aria-label={`${t("list.action.primary")}: ${row.original.person}`}
            render={
              <Link
                href={
                  row.original.exactHref ??
                  (query.view === "scheduled"
                    ? `/prospects/${row.original.prospectId}`
                    : `/replies/${row.original.prospectId}`)
                }
                prefetch={false}
              />
            }
          >
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        ),
      }),
    ],
    [t, format, navigation, query.view],
  );
  const channels = [
    { value: "all" as const, label: t("allChannels") },
    { value: "email" as const, label: t("channel.email") },
    { value: "linkedin" as const, label: t("channel.linkedin") },
  ];
  const pages = Math.max(1, Math.ceil(activity.total / activity.pageSize));
  return (
    <div aria-busy={pending}>
      <div className="flex flex-wrap items-start gap-3 border-accent-foreground border-b px-4 py-4 sm:px-6">
        <InferredForm
          key={query.q}
          config={{
            q: field({
              shape: "text",
              validator: z.string().max(200),
              label: t("search"),
              placeholder: navigation("action.quaternary"),
              leadingContent: <SearchIcon aria-hidden className="size-4" />,
              classList: {
                field: "min-w-0 flex-1 space-y-0",
                label: "sr-only",
              },
            }),
          }}
          defaultValues={{ q: query.q }}
          className="flex min-w-0 basis-full items-start gap-2 space-y-0 sm:flex-1 sm:basis-72"
          onSubmit={({ q }) => navigate({ ...query, q, page: 1 })}
        >
          <Button
            className="h-10 shrink-0 self-start text-sm"
            variant="soft"
            color="neutral"
            type="submit"
            disabled={pending}
          >
            {navigation("action.quaternary")}
          </Button>
        </InferredForm>
        <Select
          value={query.channel}
          items={channels}
          disabled={pending}
          onValueChange={(channel) =>
            navigate({ ...query, channel: channel ?? "all", page: 1 })
          }
        >
          <SelectTrigger
            aria-label={t("columns.channel")}
            className="h-10 w-full shrink-0 text-sm sm:w-40"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectPositioner align="start" className="z-40">
            <SelectPopup>
              {channels.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </SelectPositioner>
        </Select>
      </div>
      <p className="border-accent-foreground border-b px-4 py-4 text-foreground-dimmed text-sm leading-6 sm:px-6">
        {t(
          query.view === "scheduled"
            ? "activity.scheduledHelp"
            : "activity.sentHelp",
        )}
      </p>
      <DataTableProvider
        rows={rows}
        columns={columns}
        handler="server"
        pageIndex={activity.page}
        pageSize={activity.pageSize}
        rowCount={activity.total}
        onPaginationChange={({ pageIndex }) =>
          navigate({ ...query, page: pageIndex })
        }
      >
        <div className="max-w-full overflow-x-auto" inert={pending}>
          <DataTable
            className="w-full min-w-[54rem] table-fixed"
            classList={{
              "header-cell":
                "h-10 overflow-hidden text-ellipsis whitespace-nowrap bg-background-dimmed/50 px-4 font-medium text-xs normal-case tracking-normal",
              "body-cell": "overflow-hidden px-4 py-3 font-normal text-sm",
              "body-row": "hover:bg-background/70",
            }}
          />
        </div>
      </DataTableProvider>
      {rows.length === 0 && (
        <p className="px-6 py-14 text-center text-foreground-dimmed text-sm">
          {t("activity.empty")}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-t px-4 py-4 sm:px-6">
        <p className="text-foreground-dimmed text-xs">
          {navigation("pagination.page", {
            page: String(activity.page),
            pages: String(pages),
          })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="soft"
            color="neutral"
            disabled={pending || activity.page <= 1}
            onClick={() => navigate({ ...query, page: activity.page - 1 })}
          >
            <ChevronLeftIcon aria-hidden className="size-4" />
            {navigation("pagination.previous")}
          </Button>
          <Button
            variant="soft"
            color="neutral"
            disabled={pending || activity.page >= pages}
            onClick={() => navigate({ ...query, page: activity.page + 1 })}
          >
            {navigation("pagination.next")}
            <ChevronRightIcon aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
