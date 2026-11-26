"use client";

import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  LoaderIcon,
  SearchIcon,
  XIcon,
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
import { useCallback, useMemo, useState, useTransition } from "react";
import { z } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import {
  REVIEW_STATUSES,
  type ReviewQuery,
  type ReviewQueue,
  type ReviewQueueRow,
  reviewQueueHref,
} from "@/lib/outbound-review";
import { Empty, Status } from "../../_components/status";
import { ReviewSheet } from "./review-sheet";

type QueueRow = ReviewQueueRow & { _id: string };
const columnHelper = createColumnHelper<QueueRow>();

export const ReviewQueueTable = ({
  queue,
  query,
}: {
  queue: ReviewQueue;
  query: ReviewQuery;
}) => {
  const t = useTranslations("outbound");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);
  const currentQuery = { ...query, page: queue.page };
  const currentHref = reviewQueueHref(currentQuery);
  const activeFilter = Boolean(query.q) || query.status !== "all";
  const pages = Math.max(1, Math.ceil(queue.total / queue.pageSize));
  const navigate = useCallback(
    (next: ReviewQuery) => {
      const href = reviewQueueHref(next);
      if (href === currentHref) return;
      startTransition(() => router.push(href, { scroll: false }));
    },
    [currentHref, router],
  );
  const clear = () =>
    navigate({ ...currentQuery, q: "", status: "all", page: 1 });
  const detailHref = useCallback(
    (id: string) => {
      const search = new URLSearchParams({
        ...(query.campaign ? { campaign: query.campaign } : {}),
        q: query.q,
        status: query.status,
        page: String(queue.page),
      });
      return `/review/${encodeURIComponent(id)}?${search.toString()}`;
    },
    [query.q, query.status, query.campaign, queue.page],
  );
  const statusItems: { value: ReviewQuery["status"]; label: string }[] = [
    { value: "all", label: t("review.queue.allStatuses") },
    ...REVIEW_STATUSES.map((value) => ({
      value,
      label: t(`status.${value}`),
    })),
  ];
  const rows = useMemo(
    () => queue.rows.map((row) => ({ ...row, _id: row.id })),
    [queue.rows],
  );
  const columns = useMemo(
    () => [
      columnHelper.accessor("company", {
        header: t("prospect.fields.company"),
        meta: { className: "md:w-48" },
        cell: ({ row }) => (
          <Link
            href={detailHref(row.original.id)}
            prefetch={false}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              setSelected(row.original.id);
            }}
            className="block min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span
              className="block truncate font-medium text-foreground-rich hover:text-primary-text"
              title={row.original.company}
            >
              {row.original.company}
            </span>
            <span
              className="mt-1 block truncate text-foreground-dimmed text-xs xl:hidden"
              title={row.original.name}
            >
              {row.original.name}
            </span>
            <span
              className="mt-1 hidden truncate text-foreground-dimmed text-xs md:block"
              title={row.original.domain}
            >
              {row.original.domain}
            </span>
          </Link>
        ),
      }),
      columnHelper.accessor("name", {
        header: t("prospect.fields.name"),
        meta: { className: "hidden w-52 xl:table-cell" },
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate" title={row.original.name}>
              {row.original.name}
            </p>
            <p
              className="mt-1 truncate text-foreground-dimmed text-xs"
              title={row.original.email}
            >
              {row.original.email || t("common.emptyValue")}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor("subject", {
        header: t("review.queue.subject"),
        meta: { className: "hidden md:table-cell" },
        cell: ({ getValue }) => (
          <p className="truncate text-foreground-dimmed" title={getValue()}>
            {getValue() || t("common.emptyValue")}
          </p>
        ),
      }),
      columnHelper.accessor("status", {
        header: t("review.queue.statusColumn"),
        meta: { className: "w-28 px-2 xl:w-32 xl:px-4" },
        cell: ({ getValue }) => <Status value={getValue()} />,
      }),
      columnHelper.accessor("updatedAt", {
        header: t("review.queue.updated"),
        meta: { className: "hidden w-36 2xl:table-cell" },
        cell: ({ getValue }) => (
          <time
            dateTime={getValue()}
            className="whitespace-nowrap text-foreground-dimmed text-xs"
          >
            {format.dateTime(new Date(getValue()), {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })}
          </time>
        ),
      }),
      columnHelper.display({
        id: "review",
        header: () => (
          <span className="sr-only">{t("review.queue.action.primary")}</span>
        ),
        meta: { className: "w-16 px-2 xl:w-40 xl:px-4" },
        cell: ({ row }) => (
          <Button
            variant="ghost"
            color="neutral"
            onClick={() => setSelected(row.original.id)}
            aria-label={`${t("review.queue.action.primary")}: ${row.original.company}`}
          >
            <span className="hidden xl:inline">
              {t("review.queue.action.primary")}
            </span>
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        ),
      }),
    ],
    [detailHref, format, t],
  );

  return (
    <div aria-busy={pending} className="min-w-0">
      {selected && (
        <ReviewSheet
          key={selected}
          prospectId={selected}
          onClose={() => setSelected(null)}
        />
      )}
      <div className="flex flex-wrap items-start gap-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
        <InferredForm
          key={query.q}
          config={{
            q: field({
              shape: "text",
              validator: z
                .string()
                .trim()
                .max(200, { error: t("common.invalidField") }),
              label: t("review.queue.search"),
              placeholder: t("review.queue.search"),
              disabled: pending,
              leadingContent: (
                <SearchIcon
                  aria-hidden
                  className="ml-3 size-4 shrink-0 text-foreground-dimmed"
                />
              ),
              classList: {
                field: "min-w-0 flex-1",
                label: "sr-only",
              },
            }),
          }}
          defaultValues={{ q: query.q }}
          onSubmit={({ q }) => navigate({ ...currentQuery, q, page: 1 })}
          className="flex min-w-64 flex-1 items-start gap-2"
        >
          <Button
            type="submit"
            variant="outline"
            color="neutral"
            disabled={pending}
          >
            {pending && (
              <LoaderIcon
                aria-hidden
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            )}
            {t("review.queue.action.quaternary")}
          </Button>
        </InferredForm>
        <Select
          value={query.status}
          items={statusItems}
          disabled={pending}
          onValueChange={(value) =>
            navigate({ ...currentQuery, status: value ?? "all", page: 1 })
          }
        >
          <SelectTrigger
            aria-label={t("review.queue.status")}
            className="min-w-44 text-sm"
          >
            <FilterIcon aria-hidden className="size-4 text-foreground-dimmed" />
            <SelectValue />
          </SelectTrigger>
          <SelectPositioner align="start" className="z-40">
            <SelectPopup className="min-w-44">
              {statusItems.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="text-sm"
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </SelectPositioner>
        </Select>
        {activeFilter && (
          <Button
            variant="ghost"
            color="neutral"
            disabled={pending}
            onClick={clear}
          >
            <XIcon aria-hidden className="size-4" />
            {t("review.queue.action.tertiary")}
          </Button>
        )}
      </div>
      <p
        className="border-accent-foreground border-b px-4 py-4 font-medium text-foreground-rich text-sm tabular-nums sm:px-6"
        aria-live="polite"
      >
        {t("review.queue.count", { count: queue.total })}
      </p>
      <DataTableProvider
        rows={rows}
        columns={columns}
        handler="server"
        pageIndex={queue.page}
        pageSize={queue.pageSize}
        rowCount={queue.total}
        onPaginationChange={({ pageIndex }) =>
          navigate({ ...currentQuery, page: pageIndex })
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
              <Empty
                title={t(
                  activeFilter
                    ? "review.queue.emptyTitle"
                    : "review.emptyTitle",
                )}
                description={t(
                  activeFilter
                    ? "review.queue.emptyDescription"
                    : "review.emptyDescription",
                )}
              >
                {activeFilter ? (
                  <Button
                    variant="outline"
                    color="neutral"
                    disabled={pending}
                    onClick={clear}
                  >
                    {t("review.queue.action.tertiary")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    color="neutral"
                    render={<Link href="/prospects" />}
                  >
                    {t("nav.prospects")}
                  </Button>
                )}
              </Empty>
            </DataTableEmpty>
          </DataTable>
        </div>
      </DataTableProvider>
      <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-t px-4 py-4 sm:px-6">
        <p
          className="text-foreground-dimmed text-xs tabular-nums"
          aria-live="polite"
        >
          {t("review.queue.range", {
            start: queue.total ? (queue.page - 1) * queue.pageSize + 1 : 0,
            end: Math.min(queue.page * queue.pageSize, queue.total),
            total: queue.total,
          })}
        </p>
        <nav
          aria-label={t("review.queue.pagination")}
          className="flex items-center gap-2"
        >
          <span className="mr-2 text-foreground-dimmed text-xs tabular-nums">
            {t("review.queue.page", { page: queue.page, pages })}
          </span>
          <Button
            variant="outline"
            color="neutral"
            size="icon"
            aria-label={t("review.queue.previous")}
            disabled={pending || queue.page <= 1}
            onClick={() => navigate({ ...currentQuery, page: queue.page - 1 })}
          >
            <ChevronLeftIcon aria-hidden className="size-4" />
          </Button>
          <Button
            variant="outline"
            color="neutral"
            size="icon"
            aria-label={t("review.queue.next")}
            disabled={pending || queue.page >= pages}
            onClick={() => navigate({ ...currentQuery, page: queue.page + 1 })}
          >
            <ChevronRightIcon aria-hidden className="size-4" />
          </Button>
        </nav>
      </div>
    </div>
  );
};
