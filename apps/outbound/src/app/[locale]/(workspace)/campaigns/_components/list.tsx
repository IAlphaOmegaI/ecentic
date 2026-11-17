"use client";

import { ArrowRightIcon, PlusIcon, SearchIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import {
  createColumnHelper,
  DataTable,
  DataTableEmpty,
  DataTablePagination,
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
import { useTransition } from "react";
import { z } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import type { Campaign } from "@/lib/outbound-campaigns";
import { Empty } from "../../_components/common";
import { campaignListHref, type campaignQuery } from "./query";

type Row = Campaign & { _id: string };
const column = createColumnHelper<Row>();
const statuses = ["draft", "active", "paused", "archived"] as const;

export const CampaignList = ({
  queue,
  query,
}: {
  queue: { rows: Campaign[]; total: number; page: number; pageSize: number };
  query: ReturnType<typeof campaignQuery>;
}) => {
  const t = useTranslations("outbound.campaigns");
  const format = useFormatter();
  const router = useRouter();
  const [pending, transition] = useTransition();
  const navigate = (next: typeof query) =>
    transition(() => router.push(campaignListHref(next), { scroll: false }));
  const items = [
    { value: "all", label: t("allStatuses") },
    ...statuses.map((value) => ({ value, label: t(`statuses.${value}`) })),
  ];
  const columns = [
    column.accessor("name", {
      header: t("name"),
      meta: { className: "w-2/5 min-w-64" },
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link
            href={`/campaigns/${row.original.id}`}
            prefetch={false}
            className="block truncate font-medium text-foreground-rich underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {row.original.name}
          </Link>
          <p className="mt-1 truncate text-foreground-dimmed text-xs">
            {row.original.criteria.objective || t("criteriaMissing")}
          </p>
        </div>
      ),
    }),
    column.accessor("status", {
      header: t("status"),
      cell: ({ getValue }) => (
        <span className="inline-flex rounded-sm bg-background-dimmed px-2 py-1 font-medium text-xs">
          {t(`statuses.${getValue()}`)}
        </span>
      ),
    }),
    column.accessor("updatedAt", {
      header: t("updated"),
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap text-foreground-dimmed">
          {format.dateTime(new Date(getValue()), { dateStyle: "medium" })}
        </span>
      ),
    }),
    column.display({
      id: "open",
      header: "",
      meta: { className: "w-16" },
      cell: ({ row }) => (
        <Button
          variant="soft"
          color="neutral"
          size="icon"
          render={
            <Link href={`/campaigns/${row.original.id}`} prefetch={false} />
          }
          aria-label={t("openCampaign", { name: row.original.name })}
        >
          <ArrowRightIcon aria-hidden className="size-4" />
        </Button>
      ),
    }),
  ];
  return (
    <div aria-busy={pending}>
      <div className="flex flex-wrap items-start gap-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
        <InferredForm
          key={query.q}
          config={{
            q: field({
              shape: "text",
              validator: z.string().trim().max(200),
              label: t("search"),
              placeholder: t("search"),
              leadingContent: (
                <SearchIcon
                  aria-hidden
                  className="ml-4 size-4 text-foreground-dimmed"
                />
              ),
              classList: { label: "sr-only", field: "min-w-0 flex-1" },
            }),
          }}
          defaultValues={{ q: query.q }}
          onSubmit={({ q }) => navigate({ ...query, page: 1, q })}
          className="flex min-w-64 flex-1 items-start gap-2"
        >
          <Button
            variant="soft"
            color="neutral"
            type="submit"
            disabled={pending}
          >
            {t("searchAction")}
          </Button>
        </InferredForm>
        <Select
          value={query.status}
          items={items}
          disabled={pending}
          onValueChange={(value) =>
            navigate({
              ...query,
              page: 1,
              status: statuses.find((status) => status === value) ?? "all",
            })
          }
        >
          <SelectTrigger aria-label={t("status")} className="min-w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectPositioner>
            <SelectPopup>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </SelectPositioner>
        </Select>
        <Button render={<Link href="/campaigns/new" />}>
          <PlusIcon aria-hidden className="size-4" />
          {t("newTitle")}
        </Button>
      </div>
      <DataTableProvider
        rows={queue.rows.map((row) => ({ ...row, _id: row.id }))}
        columns={columns}
        handler="server"
        pageIndex={queue.page}
        pageSize={queue.pageSize}
        rowCount={queue.total}
        onPaginationChange={({ pageIndex }) =>
          navigate({ ...query, page: pageIndex })
        }
      >
        <div className="max-w-full overflow-x-auto" inert={pending}>
          <DataTable
            className="min-w-160 table-fixed"
            classList={{
              "header-cell":
                "h-10 bg-background-dimmed/50 px-4 font-medium text-xs normal-case tracking-normal",
              "body-cell": "px-4 py-4 text-sm",
              "body-row": "hover:bg-background/70",
            }}
          >
            <DataTableEmpty>
              <Empty
                title={t("emptyTitle")}
                description={t(
                  query.q || query.status !== "all"
                    ? "emptyFiltered"
                    : "emptyDescription",
                )}
              />
            </DataTableEmpty>
          </DataTable>
        </div>
        {queue.total > 0 && (
          <div className="sm:px-2">
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
          </div>
        )}
      </DataTableProvider>
    </div>
  );
};
