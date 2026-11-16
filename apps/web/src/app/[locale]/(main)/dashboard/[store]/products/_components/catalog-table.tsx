"use client";

import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronYIcon,
  DoubleChevronLeftIcon,
  DoubleChevronRightIcon,
  DownloadIcon,
  XIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import { Button } from "@zenncore/web/components/button";
import { Checkbox } from "@zenncore/web/components/checkbox";
import {
  type ColumnDef,
  DataTable,
  DataTableHeader,
  DataTableProvider,
  flexRender,
  useDataTable,
} from "@zenncore/web/components/data-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zenncore/web/components/dropdown-menu";
import {
  Pagination,
  PaginationContent,
} from "@zenncore/web/components/pagination";
import { TableHead, TableRow } from "@zenncore/web/components/table";
import {
  Tooltip,
  TooltipPopup,
  TooltipPositioner,
  TooltipTrigger,
} from "@zenncore/web/components/tooltip";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { useQueryTransition } from "@/components/query-transition";
import { usePaginationChangeHandler } from "@/hooks/pagination";
import { Link } from "@/i18n/navigation";
import { formatRelativeTime } from "@/lib/date";
import type { ProductSort } from "@/lib/products-catalog";
import type { ProductsTable } from "../../../_components/products-table";
import { CatalogTransition } from "./catalog-transition";
import { ProductsFilters, ProductsSearch } from "./products-filters";
import { CatalogFeedback } from "./shell";

const optionalFields = [
  "price",
  "winRate",
  "quality",
  "gpt4",
  "claude",
  "gemini",
  "updatedAt",
] as const;
type OptionalField = (typeof optionalFields)[number];
type CatalogRow = ProductsTable.Row & {
  modelCounts?: { gpt4: number; claude: number; gemini: number };
};

const Metric = ({ value, label }: { value: number; label: string }) => {
  const formatter = useFormatter();
  return (
    <div className="flex items-center gap-3" role="img" aria-label={label}>
      <span className="w-11 shrink-0 font-medium text-foreground-rich tabular-nums">
        {formatter.number(value / 100, {
          style: "percent",
          maximumFractionDigits: 0,
        })}
      </span>
      <span
        aria-hidden
        className="h-1 w-12 overflow-hidden rounded-full bg-accent-foreground"
      >
        <span
          className="block h-full rounded-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </span>
    </div>
  );
};

/** Neutralizes spreadsheet formulas while retaining quoted UTF-8 catalog text. */
const csvCell = (value: string | number | null) => {
  const text = String(value ?? "");
  const safe = /^[\s\p{Cc}]*[=+\-@]|^[\t\r]/u.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

const CatalogHeaders = ({ sort }: { sort: ProductSort }) => {
  const { table } = useDataTable<CatalogRow>();
  return table.getHeaderGroups().map((group) => (
    <TableRow key={group.id}>
      {group.headers.map((header) => (
        <TableHead
          key={header.id}
          aria-sort={
            header.column.id === sort.field
              ? sort.direction === "asc"
                ? "ascending"
                : "descending"
              : undefined
          }
          className={cn(
            "h-10 bg-background-dimmed/50 font-medium text-xs normal-case tracking-normal",
            header.column.columnDef.meta?.className,
          )}
        >
          {header.isPlaceholder
            ? null
            : flexRender(header.column.columnDef.header, header.getContext())}
        </TableHead>
      ))}
    </TableRow>
  ));
};

const SelectionActions = () => {
  const { table } = useDataTable<CatalogRow>();
  const translate = useTranslations("dashboard.products.catalog");
  const selected = table
    .getRowModel()
    .rows.filter((row) => row.getIsSelected());
  if (!selected.length) return null;
  const download = () => {
    const fields = [
      translate("fields.product"),
      translate("fields.sku"),
      translate("fields.price"),
      translate("fields.currency"),
      translate("fields.winRate"),
      translate("fields.quality"),
    ];
    const rows = selected.map(({ original: row }) => [
      row.title,
      row.sku,
      row.price,
      row.currency,
      row.simulations > 0 ? row.winRate.total : null,
      row.quality,
    ]);
    const content = [fields, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ecentic-products.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div
      className="flex flex-wrap items-center gap-3 border-accent-foreground border-b bg-primary/5 px-4 py-3 sm:px-6"
      aria-live="polite"
    >
      <p className="mr-auto font-medium text-foreground-rich text-sm">
        {translate("selection.count", { count: selected.length })}
      </p>
      <Button
        variant="soft"
        color="neutral"
        className="h-8 text-sm"
        onClick={download}
      >
        <DownloadIcon className="size-4" />
        {translate("action.export")}
      </Button>
      <Button
        variant="ghost"
        color="neutral"
        size="icon"
        className="size-8"
        onClick={() => table.resetRowSelection()}
        aria-label={translate("action.deselect")}
      >
        <XIcon className="size-4" />
      </Button>
    </div>
  );
};

const CatalogPagination = ({ total }: { total: number }) => {
  const { pagination } = useDataTable<CatalogRow>();
  const translate = useTranslations("dashboard.products.catalog");
  const paging = useTranslations("dashboard.shared.pagination");
  const formatter = useFormatter();
  const firstPage = pagination.pageIndex <= 1;
  const lastPage = pagination.pageIndex >= pagination.pageCount;
  const actions = [
    {
      label: paging("first"),
      page: 1,
      disabled: firstPage,
      icon: DoubleChevronLeftIcon,
    },
    {
      label: paging("previous"),
      page: pagination.pageIndex - 1,
      disabled: firstPage,
      icon: ChevronLeftIcon,
    },
    {
      label: paging("next"),
      page: pagination.pageIndex + 1,
      disabled: lastPage,
      icon: ChevronRightIcon,
    },
    {
      label: paging("last"),
      page: pagination.pageCount,
      disabled: lastPage,
      icon: DoubleChevronRightIcon,
    },
  ];
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
      <p className="text-foreground-dimmed text-sm tabular-nums">
        {translate("range", {
          from: formatter.number(
            (pagination.pageIndex - 1) * pagination.pageSize + 1,
          ),
          to: formatter.number(
            Math.min(pagination.pageIndex * pagination.pageSize, total),
          ),
          total: formatter.number(total),
        })}
      </p>
      <Pagination aria-label={paging("navigation")} className="mx-0 w-auto">
        <PaginationContent render={<div />} className="gap-1">
          <span className="mr-3 text-foreground-dimmed text-sm tabular-nums">
            {paging("page", {
              page: pagination.pageIndex,
              pages: pagination.pageCount,
            })}
          </span>
          {actions.map(({ label, page, disabled, icon: Icon }) => (
            <Button
              key={label}
              variant="soft"
              color="accent"
              size="icon"
              disabled={disabled}
              aria-label={label}
              onClick={() => pagination.goToPage(page)}
            >
              <Icon className="size-4" />
            </Button>
          ))}
        </PaginationContent>
      </Pagination>
    </footer>
  );
};

export const CatalogTable = ({
  rows,
  store,
  sort,
  total,
  pageCount,
  pageSize,
  pageIndex,
  filtered,
  missingFields,
}: {
  rows: CatalogRow[];
  store: string;
  sort: ProductSort;
  total: number;
  pageCount: number;
  pageSize: number;
  pageIndex: number;
  filtered: boolean;
  missingFields?: ReactNode;
}) => {
  const translate = useTranslations("dashboard.products.catalog");
  const locale = useLocale();
  const formatter = useFormatter();
  const router = useRouter();
  const query = useSearchParams();
  const { pending, startTransition } = useQueryTransition();
  const paginate = usePaginationChangeHandler();
  const [visible, setVisible] = useState<OptionalField[]>([
    "price",
    "winRate",
    "quality",
  ]);
  const [expanded, setExpanded] = useState(false);
  const priceLabel = (value: string | null, currency: string | null) => {
    if (value === null || value.trim() === "") return "—";
    const amount = Number(value.trim().replace(",", "."));
    if (!Number.isFinite(amount)) return "—";
    const code = currency?.trim().toUpperCase();
    return formatter.number(
      amount,
      code && /^[A-Z]{3}$/.test(code)
        ? { style: "currency", currency: code }
        : { maximumFractionDigits: 2 },
    );
  };
  const fieldLabel = (field: OptionalField) => {
    if (field === "gpt4") return "ChatGPT";
    if (field === "claude") return "Claude";
    if (field === "gemini") return "Gemini";
    return translate(`fields.${field}`);
  };
  const changeSort = (field: ProductSort["field"]) => {
    const parameters = new URLSearchParams(query);
    parameters.set("sort", field);
    parameters.set(
      "direction",
      sort.field === field && sort.direction === "asc" ? "desc" : "asc",
    );
    parameters.delete("page");
    startTransition(() =>
      router.push(`?${parameters.toString()}`, { scroll: false }),
    );
  };
  const heading = (field: ProductSort["field"], label: string) => (
    <Button
      variant="ghost"
      color="neutral"
      className="-ml-2 h-8 gap-1 px-2 font-medium text-xs"
      onClick={() => changeSort(field)}
      aria-label={translate("sortBy", { field: label })}
    >
      {label}
      {sort.field === field ? (
        <ChevronDownIcon
          className={cn(
            "size-3 text-primary-text",
            sort.direction === "asc" && "rotate-180",
          )}
        />
      ) : (
        <ChevronYIcon className="size-3 text-foreground-dimmed" />
      )}
    </Button>
  );
  const allColumns: ColumnDef<CatalogRow>[] = [
    {
      id: "selection",
      meta: { className: "w-12" },
      header: ({ table }) => {
        const pageRows = table.getRowModel().rows;
        const selectedCount = pageRows.filter((row) =>
          row.getIsSelected(),
        ).length;
        return (
          <Checkbox
            aria-label={translate("selection.all")}
            checked={pageRows.length > 0 && selectedCount === pageRows.length}
            indeterminate={selectedCount > 0 && selectedCount < pageRows.length}
            onCheckedChange={(checked) =>
              table.toggleAllPageRowsSelected(checked)
            }
            className="rounded-sm"
          />
        );
      },
      cell: ({ row }) => (
        <Checkbox
          aria-label={translate("selection.product", {
            product: row.original.title,
          })}
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(checked)}
          className="rounded-sm"
        />
      ),
    },
    {
      id: "title",
      accessorKey: "title",
      header: () => heading("title", translate("fields.product")),
      meta: { className: "min-w-65 overflow-hidden" },
      cell: ({ row }) => (
        <Link
          href={`/dashboard/${store}/products/${row.original._id}`}
          className="group flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
        >
          <Avatar className="size-11 shrink-0 rounded-lg border border-accent-foreground bg-background">
            <AvatarImage src={row.original.image ?? undefined} alt="" />
            <AvatarFallback className="font-semibold text-foreground-dimmed text-sm">
              {row.original.title.slice(0, 2).toLocaleUpperCase(locale)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span
              className="block truncate font-semibold text-foreground-rich group-hover:text-primary-text"
              title={row.original.title}
            >
              {row.original.title}
            </span>
            <span className="mt-1 block truncate text-foreground-dimmed text-xs">
              {row.original.sku || translate("noSku")}
            </span>
          </span>
        </Link>
      ),
    },
    {
      id: "price",
      accessorKey: "price",
      header: () => heading("price", translate("fields.price")),
      meta: { className: "w-28" },
      cell: ({ row }) => (
        <span
          className="block truncate text-foreground tabular-nums"
          title={priceLabel(row.original.price, row.original.currency)}
        >
          {priceLabel(row.original.price, row.original.currency)}
        </span>
      ),
    },
    {
      id: "winRate",
      accessorKey: "winRate.total",
      header: () => heading("winRate", translate("fields.winRate")),
      meta: { className: "w-36" },
      cell: ({ row }) =>
        row.original.simulations > 0 ? (
          <div>
            <Metric
              value={row.original.winRate.total}
              label={translate("rate", {
                value: formatter.number(row.original.winRate.total),
              })}
            />
            <span className="mt-1 block text-foreground-dimmed text-xs">
              {translate("comparisons", { count: row.original.simulations })}
            </span>
          </div>
        ) : (
          <span className="text-foreground-dimmed text-sm">
            {translate("unmeasured")}
          </span>
        ),
    },
    {
      id: "quality",
      accessorKey: "quality",
      header: () => (
        <Tooltip>
          <TooltipTrigger className="h-auto w-auto" render={<span />}>
            {heading("quality", translate("fields.quality"))}
          </TooltipTrigger>
          <TooltipPositioner side="top" sideOffset={8}>
            <TooltipPopup className="max-w-72 rounded-lg bg-emphasis text-background-rich">
              {translate("coverageHint")}
            </TooltipPopup>
          </TooltipPositioner>
        </Tooltip>
      ),
      meta: { className: "w-36" },
      cell: ({ row }) => (
        <Metric
          value={row.original.quality}
          label={translate("coverage", {
            value: formatter.number(row.original.quality),
          })}
        />
      ),
    },
    ...(["gpt4", "claude", "gemini"] as const).map(
      (model) =>
        ({
          id: model,
          header: () => (
            <span className="flex items-center gap-2">
              <Image
                src={`/images/${model === "gpt4" ? "chatgpt" : model}.svg`}
                alt=""
                width={16}
                height={16}
              />
              {fieldLabel(model)}
            </span>
          ),
          meta: { className: "w-28" },
          cell: ({ row }) => (
            <span className="text-foreground tabular-nums">
              {(row.original.modelCounts?.[model] ?? 0) > 0
                ? formatter.number(row.original.winRate[model] / 100, {
                    style: "percent",
                    maximumFractionDigits: 0,
                  })
                : "—"}
            </span>
          ),
        }) satisfies ColumnDef<CatalogRow>,
    ),
    {
      id: "updatedAt",
      accessorKey: "updatedAt",
      header: () => heading("updatedAt", translate("fields.updatedAt")),
      meta: { className: "w-36" },
      cell: ({ row }) => (
        <span className="text-foreground-dimmed text-xs">
          {formatRelativeTime(row.original.updatedAt, locale)}
        </span>
      ),
    },
    {
      id: "actions",
      meta: { className: "w-12 text-right" },
      cell: ({ row }) => (
        <Button
          variant="ghost"
          color="neutral"
          size="icon"
          className="size-8"
          aria-label={translate("action.open", { product: row.original.title })}
          render={
            <Link href={`/dashboard/${store}/products/${row.original._id}`} />
          }
        >
          <ArrowRightIcon className="size-4" />
        </Button>
      ),
    },
  ];
  const columns = allColumns.filter(
    (column) =>
      column.id === "selection" ||
      column.id === "title" ||
      column.id === "actions" ||
      visible.includes(column.id as OptionalField),
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-accent-foreground border-b px-4 py-4 sm:px-6">
        <div className="flex min-w-48 flex-1 items-center">
          <ProductsSearch />
        </div>
        <ProductsFilters />
        <DropdownMenu open={expanded} onOpenChange={setExpanded}>
          <DropdownMenuTrigger
            render={
              <Button variant="soft" color="accent" className="h-10 shrink-0" />
            }
          >
            {translate("columns")}
            <ChevronDownIcon className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48 rounded-lg p-1">
            {optionalFields.map((field) => (
              <DropdownMenuCheckboxItem
                key={field}
                checked={visible.includes(field)}
                closeOnClick={false}
                onCheckedChange={(checked) =>
                  setVisible((current) =>
                    checked
                      ? [...current, field]
                      : current.filter((item) => item !== field),
                  )
                }
              >
                {fieldLabel(field)}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setVisible(["price", "winRate", "quality"])}
            >
              {translate("resetColumns")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <p
          role="status"
          className={cn(
            "w-full text-xs",
            pending
              ? "font-medium text-foreground-rich"
              : "text-foreground-dimmed",
          )}
        >
          {pending
            ? translate("loading")
            : rows.length > 0
              ? translate("selection.hint")
              : translate("results", { count: total })}
        </p>
      </div>
      {missingFields}
      <CatalogTransition>
        <DataTableProvider
          key={`${query.toString()}:${pageIndex}:${rows.map((row) => row._id).join(",")}`}
          rows={rows}
          columns={columns}
          handler="server"
          pageCount={pageCount}
          pageSize={pageSize}
          pageIndex={pageIndex}
          onPaginationChange={paginate}
        >
          <SelectionActions />
          {rows.length === 0 ? (
            <CatalogFeedback
              kind={filtered || total > 0 ? "noMatches" : "empty"}
              store={store}
            />
          ) : (
            <div className="max-w-full overflow-x-auto overscroll-x-contain border-accent-foreground border-b">
              <DataTable
                className={cn(
                  "table-fixed border-b-0",
                  visible.length <= 3
                    ? "min-w-190"
                    : visible.length === 4
                      ? "min-w-226"
                      : visible.length === 5
                        ? "min-w-262"
                        : visible.length === 6
                          ? "min-w-298"
                          : "min-w-334",
                )}
                classList={{
                  "header-cell":
                    "h-10 bg-background-dimmed/50 font-medium text-xs normal-case tracking-normal",
                  "body-cell": "py-3 font-normal",
                  "body-row":
                    "transition-colors hover:bg-primary/3 data-[selected=true]:bg-primary/5",
                }}
              >
                <DataTableHeader>
                  <CatalogHeaders sort={sort} />
                </DataTableHeader>
              </DataTable>
            </div>
          )}
          {rows.length > 0 && <CatalogPagination total={total} />}
        </DataTableProvider>
      </CatalogTransition>
    </>
  );
};
