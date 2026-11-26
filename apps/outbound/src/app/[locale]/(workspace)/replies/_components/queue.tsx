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
import { conversationHref } from "@/lib/outbound-conversation-view";
import {
  CONVERSATION_STAGES,
  type ConversationList,
  type ConversationQuery,
  type ConversationStage,
} from "@/lib/outbound-conversations";

export const ConversationStageBadge = ({
  stage,
  needsReply,
  archivedAt,
}: {
  stage: ConversationStage;
  needsReply: boolean;
  archivedAt?: string | null;
}) => {
  const t = useTranslations("outbound.conversations");
  return (
    <div className="space-y-1">
      <span className="inline-flex whitespace-nowrap rounded-sm bg-background px-2 py-1 text-foreground-dimmed text-xs">
        {archivedAt ? t("views.archived") : t(`stage.${stage}`)}
      </span>
      {needsReply && (
        <p className="text-primary-text text-xs">{t("needsReply")}</p>
      )}
    </div>
  );
};
type Row = ConversationList["items"][number] & { _id: string };
const column = createColumnHelper<Row>();
export const ConversationQueue = ({
  queue,
  query,
}: {
  queue: ConversationList;
  query: ConversationQuery;
}) => {
  const t = useTranslations("outbound.conversations");
  const navigation = useTranslations("outbound.sent");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (next: ConversationQuery) =>
    startTransition(() =>
      router.push(conversationHref(next), { scroll: false }),
    );
  const rows = useMemo(
    () => queue.items.map((row) => ({ ...row, _id: row.id })),
    [queue.items],
  );
  const columns = useMemo(
    () => [
      column.accessor("company", {
        header: t("columns.person"),
        meta: { className: "w-64" },
        cell: ({ row }) => (
          <Link
            href={`/replies/${row.original.id}?thread=${row.original.threadId}`}
            prefetch={false}
            className="block min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span
              className="block truncate font-medium text-foreground-rich"
              title={row.original.company}
            >
              {row.original.company}
            </span>
            <span className="mt-1 block truncate text-foreground-dimmed text-xs">
              {row.original.person} · {row.original.counterpart}
            </span>
          </Link>
        ),
      }),
      column.accessor("subject", {
        header: t("columns.subject"),
        meta: { className: "" },
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate" title={row.original.subject}>
              {row.original.subject || t("noSubject")}
            </p>
            <p className="mt-1 truncate text-foreground-dimmed text-xs">
              {row.original.accountLabel}
            </p>
          </div>
        ),
      }),
      column.accessor("channel", {
        header: t("columns.channel"),
        meta: { className: "w-28" },
        cell: ({ row }) =>
          row.original.channels
            .map((channel) => t(`channel.${channel}`))
            .join(" · "),
      }),
      column.accessor("stage", {
        header: t("columns.stage"),
        meta: { className: "w-36" },
        cell: ({ row }) => (
          <ConversationStageBadge
            stage={row.original.stage}
            needsReply={row.original.needsReply}
            archivedAt={row.original.archivedAt}
          />
        ),
      }),
      column.accessor("updatedAt", {
        header: t("columns.updated"),
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
                href={`/replies/${row.original.id}?thread=${row.original.threadId}`}
                prefetch={false}
              />
            }
          >
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        ),
      }),
    ],
    [t, format],
  );
  const channels = [
    { value: "all" as const, label: t("allChannels") },
    { value: "email" as const, label: t("channel.email") },
    { value: "linkedin" as const, label: t("channel.linkedin") },
  ];
  const stages = [
    { value: "all" as const, label: t("allStages") },
    ...CONVERSATION_STAGES.map((value) => ({
      value,
      label: t(`stage.${value}`),
    })),
  ];
  const filtered = Boolean(
    query.q ||
      query.channel !== "all" ||
      query.stage !== "all" ||
      ("needsReply" in query && query.needsReply),
  );
  const pages = Math.max(1, Math.ceil(queue.total / queue.pageSize));
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
          defaultValues={{ q: query.q ?? "" }}
          onSubmit={({ q }) => navigate({ ...query, q, page: 1 })}
          className="flex min-w-0 basis-full items-start gap-2 space-y-0 sm:flex-1 sm:basis-72"
        >
          <Button
            className="h-10 shrink-0 self-start text-sm"
            type="submit"
            variant="soft"
            color="neutral"
            disabled={pending}
          >
            {navigation("action.quaternary")}
          </Button>
        </InferredForm>
        <Select
          value={query.channel ?? "all"}
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
        <Select
          value={query.stage ?? "all"}
          items={stages}
          disabled={pending}
          onValueChange={(stage) =>
            navigate({ ...query, stage: stage ?? "all", page: 1 })
          }
        >
          <SelectTrigger
            aria-label={t("columns.stage")}
            className="h-10 w-full shrink-0 text-sm sm:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectPositioner align="start" className="z-40">
            <SelectPopup>
              {stages.map((item) => (
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
            onClick={() => navigate({ archived: query.archived })}
          >
            {navigation("action.tertiary")}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-b px-4 py-3 sm:px-6">
        <p
          aria-live="polite"
          className="font-medium text-foreground-rich text-sm"
        >
          {t("count", { count: queue.total })}
        </p>
        <Button
          variant="soft"
          color="neutral"
          disabled={pending}
          render={<Link href="/replies?needsReply=1" />}
        >
          {t("needsReply")} · {format.number(queue.needsReplyCount)}
        </Button>
      </div>
      <DataTableProvider
        rows={rows}
        columns={columns}
        handler="server"
        pageIndex={queue.page}
        pageSize={queue.pageSize}
        rowCount={queue.total}
        onPaginationChange={({ pageIndex }) =>
          navigate({ ...query, page: pageIndex })
        }
      >
        <div
          className={`max-w-full overflow-x-auto ${pending ? "opacity-60" : ""}`}
          inert={pending}
        >
          <DataTable
            className="w-full min-w-[60rem] table-fixed border-b-0"
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
        <div className="px-6 py-14 text-center">
          <h2 className="font-medium text-foreground-rich">
            {t(filtered ? "noMatches" : "emptyTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-foreground-dimmed text-sm leading-6">
            {t("emptyDescription")}
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-t px-4 py-4 sm:px-6">
        <p className="text-foreground-dimmed text-xs">
          {navigation("pagination.page", {
            page: String(queue.page),
            pages: String(pages),
          })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="soft"
            color="neutral"
            disabled={pending || queue.page <= 1}
            onClick={() => navigate({ ...query, page: queue.page - 1 })}
          >
            <ChevronLeftIcon aria-hidden className="size-4" />
            {navigation("pagination.previous")}
          </Button>
          <Button
            variant="soft"
            color="neutral"
            disabled={pending || queue.page >= pages}
            onClick={() => navigate({ ...query, page: queue.page + 1 })}
          >
            {navigation("pagination.next")}
            <ChevronRightIcon aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
