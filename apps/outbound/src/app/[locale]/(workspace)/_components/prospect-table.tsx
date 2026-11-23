"use client";

import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { Avatar, AvatarFallback } from "@zenncore/web/components/avatar";
import { Button } from "@zenncore/web/components/button";
import {
  type ColumnDef,
  DataTable,
  DataTablePagination,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { ProspectList } from "@/lib/outbound-prospects";
import { sentHref } from "@/lib/outbound-sent";
import { Status } from "./status";

export const ProspectTable = ({
  queue,
  pending,
  onPageChange,
  children,
}: ProspectTable.Props) => {
  const translate = useTranslations("outbound");
  const columns: ColumnDef<ProspectTable.Row>[] = [
    {
      id: "company",
      header: translate("prospect.fields.company"),
      meta: { className: "w-72" },
      cell: ({ row: { original: prospect } }) => (
        <Link
          href={`/prospects/${prospect.id}`}
          prefetch={false}
          className="flex min-w-0 items-center gap-4 rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Avatar className="size-8 shrink-0 rounded-lg border border-accent-foreground bg-background text-foreground-dimmed">
            <AvatarFallback>
              {prospect.company.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span
              className="block truncate font-medium text-foreground-rich group-hover:text-primary-text"
              title={prospect.company}
            >
              {prospect.company}
            </span>
            <span
              className="block truncate text-foreground-dimmed text-xs"
              title={prospect.domain}
            >
              {prospect.domain}
            </span>
          </span>
        </Link>
      ),
    },
    {
      id: "contact",
      header: translate("prospect.list.contact"),
      meta: { className: "w-64" },
      cell: ({ row: { original: prospect } }) => (
        <div className="min-w-0">
          <p className="truncate font-medium" title={prospect.name}>
            {prospect.name}
          </p>
          <p
            className="truncate text-foreground-dimmed text-xs"
            title={prospect.email}
          >
            {prospect.email || translate("common.emptyValue")}
          </p>
          <p
            className="truncate text-foreground-dimmed text-xs"
            title={prospect.title}
          >
            {prospect.title}
          </p>
        </div>
      ),
    },
    {
      id: "email",
      header: translate("prospect.progress.emailProgress"),
      meta: { className: "w-48" },
      cell: ({ row: { original: prospect } }) => {
        const progress = (
          ["held", "researching", "scheduled", "sent", "replied"] as const
        ).find(
          (value) =>
            value !== prospect.status && prospect.lifecycles.includes(value),
        );
        return (
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-2">
              <Status value={prospect.status} />
              {progress && (
                <p className="text-foreground-dimmed text-xs">
                  {translate(`prospect.progress.lifecycle.${progress}`)}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              color="neutral"
              size="icon"
              aria-label={`${translate("prospect.editTitle")}: ${prospect.company}`}
              render={
                <Link href={`/prospects/${prospect.id}`} prefetch={false} />
              }
            >
              <ArrowRightIcon aria-hidden />
            </Button>
          </div>
        );
      },
    },
    {
      id: "linkedin",
      header: translate("nav.linkedin"),
      meta: { className: "w-40" },
      cell: ({ row: { original: prospect } }) =>
        prospect.linkedinUrl
          ? translate(`linkedin.status.${prospect.linkedinStatus}`)
          : translate("common.emptyValue"),
    },
    {
      id: "history",
      header: translate("nav.sent"),
      meta: { className: "w-40" },
      cell: ({ row: { original: prospect } }) => (
        <Button
          variant="soft"
          color="neutral"
          render={
            <Link href={sentHref({ prospect: prospect.id })} prefetch={false} />
          }
        >
          {translate("prospect.progress.action.secondary")}
        </Button>
      ),
    },
  ];
  return (
    <DataTableProvider
      columns={columns}
      rows={queue.rows.map((prospect) => ({ ...prospect, _id: prospect.id }))}
      handler="server"
      pageIndex={queue.page}
      pageSize={queue.pageSize}
      rowCount={queue.total}
      onPaginationChange={({ pageIndex }) => {
        if (!pending) onPageChange(pageIndex);
      }}
    >
      <div className="relative" aria-busy={pending}>
        <div
          inert={pending}
          data-pending={pending || undefined}
          className="transition-opacity data-pending:opacity-50 motion-reduce:transition-none"
        >
          {queue.rows.length ? (
            <section
              // biome-ignore lint/a11y/noNoninteractiveTabindex: The wide table needs keyboard scrolling.
              tabIndex={0}
              className="max-w-full overflow-x-auto"
              aria-label={translate("nav.prospects")}
            >
              <DataTable
                className="min-w-264 table-fixed border-b-0"
                classList={{
                  "header-cell":
                    "h-12 bg-background-dimmed/50 px-4 font-medium text-xs normal-case tracking-normal sm:px-6",
                  "body-row": "group",
                  "body-cell": "px-4 py-4 font-normal sm:px-6",
                }}
              />
            </section>
          ) : (
            children
          )}
        </div>
        {pending && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <LoaderIcon className="size-8 animate-spin text-primary motion-reduce:animate-none" />
          </div>
        )}
      </div>
      <div className="border-accent-foreground border-t" aria-busy={pending}>
        <DataTablePagination
          variant="soft"
          labels={{
            navigation: translate("prospect.list.pagination"),
            page: () =>
              translate("prospect.list.range", {
                start: queue.total ? (queue.page - 1) * queue.pageSize + 1 : 0,
                end: Math.min(queue.page * queue.pageSize, queue.total),
                total: queue.total,
              }),
            firstPage: translate("prospect.list.action.quinary"),
            previousPage: translate("prospect.list.action.primary"),
            nextPage: translate("prospect.list.action.secondary"),
            lastPage: translate("prospect.list.action.senary"),
          }}
        />
      </div>
    </DataTableProvider>
  );
};

export namespace ProspectTable {
  export type Row = ProspectList["rows"][number] & { _id: string };
  export type Props = {
    queue: ProspectList;
    pending: boolean;
    onPageChange: (page: number) => void;
    children: ReactNode;
  };
}
