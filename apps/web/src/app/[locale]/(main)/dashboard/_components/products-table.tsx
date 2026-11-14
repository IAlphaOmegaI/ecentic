"use client";

import {
  ArrowRightIcon,
  BoxMinusIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronYIcon,
  FilterIcon,
  SearchIcon,
  XIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import { Button } from "@zenncore/web/components/button";
import type { ColumnDef } from "@zenncore/web/components/data-table";
import {
  DataTable,
  DataTableEmpty,
  DataTablePagination,
  DataTableProvider,
  useDataTable,
} from "@zenncore/web/components/data-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zenncore/web/components/dropdown-menu";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { usePaginationChangeHandler } from "@/hooks/pagination";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/currency";
import { formatRelativeTime } from "@/lib/date";

const WinRateBar = ({ rate }: { rate: number }) => {
  const { bar, text } = (() => {
    switch (true) {
      case rate >= 60:
        return { bar: "bg-success", text: "text-success" };
      case rate >= 30:
        return { bar: "bg-warning", text: "text-warning" };
      default:
        return { bar: "bg-error", text: "text-error" };
    }
  })();

  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-24 rounded-full bg-accent-foreground">
        <div
          className={cn("h-full rounded-full", bar)}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className={cn("font-medium tabular-nums", text)}>{rate}%</span>
    </div>
  );
};

const QualityBar = ({ score }: { score: number }) => {
  const color = (() => {
    switch (true) {
      case score >= 75:
        return "bg-success";
      case score >= 50:
        return "bg-warning";
      default:
        return "bg-error";
    }
  })();

  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-24 rounded-full bg-accent-foreground">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-foreground-dimmed tabular-nums">{score}/100</span>
    </div>
  );
};

const buildColumns = (
  locale: string,
  store: string,
  fields: {
    product: string;
    price: string;
    winRate: string;
    quality: string;
    lastScan: string;
    noData: string;
  },
): ColumnDef<ProductsTable.Row>[] => [
  {
    accessorKey: "title",
    header: fields.product,
    enableHiding: false,
    meta: { className: "min-w-65 overflow-hidden" },
    cell: ({ row }) => (
      <Link
        href={`/dashboard/${store}/products/${row.original._id}`}
        className="group flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <Avatar className="size-11 shrink-0 rounded-lg border border-accent-foreground bg-background-rich">
          <AvatarImage
            src={row.original.image ?? "/images/fallback.png"}
            alt=""
          />
          <AvatarFallback className="relative">
            <Image src="/images/fallback.png" alt="" fill sizes="44px" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate font-semibold text-foreground-rich transition-colors group-hover:text-primary">
            {row.original.title}
          </p>
          {row.original.sku && (
            <p className="mt-0.5 truncate text-foreground-dimmed text-xs">
              {row.original.sku}
            </p>
          )}
        </div>
      </Link>
    ),
  },
  {
    accessorKey: "price",
    header: fields.price,
    meta: { className: "w-24" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-foreground tabular-nums">
        {formatPrice(row.original.price, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "winRate.total",
    header: fields.winRate,
    meta: { className: "w-40" },
    cell: ({ row }) =>
      row.original.simulations > 0 ? (
        <WinRateBar rate={row.original.winRate.total} />
      ) : (
        <span className="text-foreground-dimmed" title={fields.noData}>
          —
        </span>
      ),
  },
  {
    accessorKey: "winRate.gpt4",
    header: "ChatGPT",
    meta: { className: "w-20" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-foreground tabular-nums">
        {row.original.simulations > 0 ? `${row.original.winRate.gpt4}%` : "—"}
      </span>
    ),
  },
  {
    accessorKey: "winRate.claude",
    header: "Claude",
    meta: { className: "w-20" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-foreground tabular-nums">
        {row.original.simulations > 0 ? `${row.original.winRate.claude}%` : "—"}
      </span>
    ),
  },
  {
    accessorKey: "winRate.gemini",
    header: "Gemini",
    meta: { className: "w-20" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-foreground tabular-nums">
        {row.original.simulations > 0 ? `${row.original.winRate.gemini}%` : "—"}
      </span>
    ),
  },
  {
    accessorKey: "quality",
    header: fields.quality,
    meta: { className: "w-40" },
    cell: ({ row }) => <QualityBar score={row.original.quality} />,
  },
  {
    accessorKey: "updatedAt",
    header: fields.lastScan,
    meta: { className: "w-32" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-foreground-dimmed">
        {formatRelativeTime(row.original.updatedAt, locale)}
      </span>
    ),
  },
  {
    id: "actions",
    header: undefined,
    enableHiding: false,
    meta: { className: "w-12 text-right" },
    cell: ({ row }) => (
      <Button
        size="icon"
        color="accent"
        className="size-7"
        render={
          <Link href={`/dashboard/${store}/products/${row.original._id}`} />
        }
      >
        <ArrowRightIcon className="size-4" />
      </Button>
    ),
  },
];

const sortableColumns = (
  columns: ColumnDef<ProductsTable.Row>[],
): ColumnDef<ProductsTable.Row>[] =>
  columns.map((column) => {
    const label = column.header;
    if (typeof label !== "string") return column;

    return {
      ...column,
      id:
        column.id ??
        ("accessorKey" in column
          ? String(column.accessorKey).replaceAll(".", "_")
          : label),
      header: ({ column: selected, table }) => {
        const direction = selected.getIsSorted();

        return (
          <Button
            variant="ghost"
            color="accent"
            className="-ml-2 h-8 gap-1.5 px-2 font-medium text-xs"
            onClick={() => {
              selected.toggleSorting(direction === "asc");
              table.setPageIndex(0);
            }}
          >
            {label}
            {direction ? (
              <ChevronDownIcon
                className={cn(
                  "size-3 text-primary",
                  direction === "asc" && "rotate-180",
                )}
              />
            ) : (
              <ChevronYIcon className="size-3 text-foreground-dimmed" />
            )}
          </Button>
        );
      },
    };
  });

const useColumnLabels = () => {
  const translate = useTranslations("dashboard.products.table.fields");

  return {
    title: translate("product"),
    price: translate("price"),
    winRate_total: translate("winRate"),
    winRate_gpt4: "ChatGPT",
    winRate_claude: "Claude",
    winRate_gemini: "Gemini",
    quality: translate("quality"),
    updatedAt: translate("lastScan"),
  } satisfies Record<string, string>;
};

const ColumnsMenu = ({ compact = false }: { compact?: boolean }) => {
  const { table } = useDataTable<ProductsTable.Row>();
  const translate = useTranslations("dashboard.products.table.columns");
  const labels: Record<string, string> = useColumnLabels();

  const columns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="soft"
            color="accent"
            className={compact ? "h-9 px-3 text-sm" : undefined}
          />
        }
      >
        {translate("trigger")}
        <ChevronDownIcon className="size-3.5 text-foreground-dimmed" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-48 overflow-hidden rounded-lg border border-accent-foreground bg-background-rich p-1"
      >
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(checked) => column.toggleVisibility(checked)}
            closeOnClick={false}
          >
            {labels[column.id] ?? column.id}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator className="bg-accent-foreground" />
        <DropdownMenuItem onClick={() => table.resetColumnVisibility()}>
          {translate("reset")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type ComparisonFilter = "all" | "compared" | "notCompared";
type ProductSorting = { id: string; desc: boolean }[];

const OverviewTools = ({
  search,
  onSearchChange,
  comparison,
  onComparisonChange,
  sorting: order,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  comparison: ComparisonFilter;
  onComparisonChange: (value: ComparisonFilter) => void;
  sorting: ProductSorting;
}) => {
  const translate = useTranslations("dashboard.products.table");
  const { table, pagination } = useDataTable<ProductsTable.Row>();
  const labels: Record<string, string> = useColumnLabels();
  const sorting = order[0];
  const columns = table.getAllLeafColumns();

  const updateSearch = (value: string) => {
    onSearchChange(value);
    pagination.goToFirstPage();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-accent-foreground border-b px-4 py-3">
      <TextField
        value={search}
        onValueChange={updateSearch}
        className="h-9 min-w-48 flex-1 bg-background-rich sm:max-w-sm"
      >
        <SearchIcon className="size-4 shrink-0 text-foreground-dimmed" />
        <TextFieldInput
          aria-label={translate("search.placeholder")}
          placeholder={translate("search.placeholder")}
          maxLength={200}
          className="text-sm placeholder:text-foreground-dimmed"
        />
        {search && (
          <Button
            variant="ghost"
            color="accent"
            size="icon"
            className="size-6 shrink-0"
            aria-label={translate("search.clear")}
            onClick={() => updateSearch("")}
          >
            <XIcon className="size-3.5" />
          </Button>
        )}
      </TextField>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="soft"
                color="accent"
                className="h-9 px-3 text-sm"
                aria-label={translate("overviewTools.comparison")}
              />
            }
          >
            <FilterIcon className="size-4" />
            {translate("filters.addFilter")}
            {comparison !== "all" && (
              <span className="size-1.5 rounded-full bg-primary" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="relative z-50 min-w-48 border border-accent-foreground bg-background-rich"
          >
            <DropdownMenuRadioGroup
              value={comparison}
              onValueChange={(value) => {
                if (
                  value !== "all" &&
                  value !== "compared" &&
                  value !== "notCompared"
                )
                  return;
                onComparisonChange(value);
                pagination.goToFirstPage();
              }}
            >
              {(["all", "compared", "notCompared"] as const).map((value) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {translate(`overviewTools.${value}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="soft"
                color="accent"
                className="h-9 px-3 text-sm"
              />
            }
          >
            <ChevronYIcon className="size-4" />
            {translate("overviewTools.sort")}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="relative z-50 min-w-52 border border-accent-foreground bg-background-rich"
          >
            <DropdownMenuRadioGroup
              value={sorting?.id ?? "default"}
              onValueChange={(value) => {
                table.setSorting(
                  value === "default" ? [] : [{ id: value, desc: false }],
                );
                pagination.goToFirstPage();
              }}
            >
              <DropdownMenuRadioItem value="default">
                {translate("overviewTools.defaultOrder")}
              </DropdownMenuRadioItem>
              {columns.map((column) => (
                <DropdownMenuRadioItem key={column.id} value={column.id}>
                  {labels[column.id] ?? column.id}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {sorting && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sorting.desc ? "descending" : "ascending"}
                  onValueChange={(value) => {
                    table.setSorting([
                      { id: sorting.id, desc: value === "descending" },
                    ]);
                    pagination.goToFirstPage();
                  }}
                >
                  <DropdownMenuRadioItem value="ascending">
                    {translate("overviewTools.ascending")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="descending">
                    {translate("overviewTools.descending")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <ColumnsMenu compact />
      </div>
    </div>
  );
};

const OverviewPagination = ({ count }: { count: number }) => {
  const translate = useTranslations("dashboard.shared");
  const { pagination } = useDataTable<ProductsTable.Row>();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-t px-4 py-3 text-sm">
      <p className="text-foreground-dimmed" aria-live="polite">
        {translate("count.products", { count })}
      </p>
      <nav
        aria-label={translate("pagination.navigation")}
        className="flex items-center gap-3"
      >
        <p className="text-foreground-dimmed tabular-nums">
          {translate("pagination.page", {
            page: pagination.pageIndex,
            pages: Math.max(1, pagination.pageCount),
          })}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="soft"
            color="accent"
            size="icon"
            className="size-8"
            disabled={!pagination.canGoPreviousPage}
            aria-label={translate("pagination.previous")}
            onClick={pagination.goToPreviousPage}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="soft"
            color="accent"
            size="icon"
            className="size-8"
            disabled={!pagination.canGoNextPage}
            aria-label={translate("pagination.next")}
            onClick={pagination.goToNextPage}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </nav>
    </div>
  );
};

export const ProductsTable = ({
  rows,
  title,
  action,
  paginated,
  columnsMenu,
  filtered,
  pageCount,
  preview = false,
  ...props
}: ProductsTable.Props) => {
  const locale = useLocale();

  const { store } = useParams<{ store: string }>();
  const translate = useTranslations("dashboard.products.table");
  const pagination = useTranslations("dashboard.shared.pagination");
  const stats = useTranslations("dashboard.shared.stats");
  const handlePaginationChange = usePaginationChangeHandler();
  const [search, setSearch] = useState("");
  const [comparison, setComparison] = useState<ComparisonFilter>("all");
  const [sorting, setSorting] = useState<ProductSorting>([]);

  const columns = buildColumns(locale, store, {
    product: translate("fields.product"),
    price: translate("fields.price"),
    winRate: translate("fields.winRate"),
    quality: translate("fields.quality"),
    lastScan: translate("fields.lastScan"),
    noData: stats("noDataYet"),
  }).filter((column) => {
    if (!preview) return true;
    if (!("accessorKey" in column)) return false;
    return ["title", "price", "winRate.total", "quality"].includes(
      String(column.accessorKey),
    );
  });

  const resolvedTitle = title ?? translate("title");
  const visibleRows = (() => {
    if (!preview) return rows;

    const query = search.trim().toLocaleLowerCase(locale);
    const matching = rows.filter((row) => {
      const matchesSearch = `${row.title} ${row.sku ?? ""}`
        .toLocaleLowerCase(locale)
        .includes(query);
      const matchesComparison =
        comparison === "all" ||
        (comparison === "compared"
          ? row.simulations > 0
          : row.simulations === 0);
      return matchesSearch && matchesComparison;
    });
    const order = sorting[0];
    if (!order) return matching;

    const collator = new Intl.Collator(locale, {
      numeric: true,
      sensitivity: "base",
    });
    const value = (row: ProductsTable.Row): string | number | null => {
      switch (order.id) {
        case "title":
          return row.title;
        case "price":
          return row.price === null || !Number.isFinite(Number(row.price))
            ? null
            : Number(row.price);
        case "winRate_total":
          return row.simulations > 0 ? row.winRate.total : null;
        case "quality":
          return row.quality;
        default:
          return null;
      }
    };

    return matching.sort((first, second) => {
      const firstValue = value(first);
      const secondValue = value(second);
      if (firstValue === null) return secondValue === null ? 0 : 1;
      if (secondValue === null) return -1;

      const result =
        typeof firstValue === "number" && typeof secondValue === "number"
          ? firstValue - secondValue
          : collator.compare(String(firstValue), String(secondValue));
      return order.desc ? -result : result;
    });
  })();

  return (
    <DataTableProvider
      rows={visibleRows}
      columns={preview ? sortableColumns(columns) : columns}
      {...(preview
        ? {
            handler: "client" as const,
            pageSize: 10,
            onSortingChange: setSorting,
          }
        : {
            handler: "server" as const,
            pageSize: 20,
            pageCount,
            onPaginationChange: paginated ? handlePaginationChange : undefined,
            ...props,
          })}
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-accent-foreground border-b p-4">
        <div>
          <p className="font-semibold text-foreground-rich text-lg">
            {resolvedTitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {action}
          {columnsMenu && !preview && <ColumnsMenu />}
        </div>
      </div>
      {preview && (
        <OverviewTools
          search={search}
          onSearchChange={setSearch}
          comparison={comparison}
          onComparisonChange={setComparison}
          sorting={sorting}
        />
      )}
      <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
        <DataTable
          className={cn(
            "table-fixed",
            preview ? "min-w-170" : "min-w-288",
            (!paginated || preview) && "border-b-0",
          )}
          classList={{
            "header-cell":
              "bg-background-dimmed/50 font-medium text-xs normal-case tracking-normal",
            "body-row": "transition-colors hover:bg-primary/3",
            "body-cell": "py-3 font-normal",
          }}
        >
          <DataTableEmpty>
            <div className="p-8 text-center">
              <BoxMinusIcon className="mx-auto mb-6 size-24" />
              <p className="text-foreground text-lg">
                {translate(
                  filtered ||
                    (preview &&
                      (Boolean(search.trim()) || comparison !== "all"))
                    ? "states.noMatches.primary"
                    : "states.empty.primary",
                )}
              </p>
              <p className="mt-1 text-foreground-dimmed text-sm">
                {translate(
                  filtered ||
                    (preview &&
                      (Boolean(search.trim()) || comparison !== "all"))
                    ? "states.noMatches.secondary"
                    : "states.empty.secondary",
                )}
              </p>
            </div>
          </DataTableEmpty>
        </DataTable>
      </div>
      {preview && <OverviewPagination count={visibleRows.length} />}
      {paginated && !preview && (
        <DataTablePagination
          variant="soft"
          labels={{
            navigation: pagination("navigation"),
            page: (page, pages) => pagination("page", { page, pages }),
            firstPage: pagination("first"),
            previousPage: pagination("previous"),
            nextPage: pagination("next"),
            lastPage: pagination("last"),
          }}
        />
      )}
    </DataTableProvider>
  );
};

export namespace ProductsTable {
  export type Props = Omit<
    DataTableProvider.Props<Row>,
    "columns" | "handler"
  > & {
    rows: Row[];
    title?: string;
    action?: ReactNode;
    paginated?: boolean;
    preview?: boolean;
    columnsMenu?: boolean;
    filtered?: boolean;
    pageCount: number;
  };

  export type Row = {
    _id: string;
    title: string;
    image?: string | null;
    price: string | null;
    currency: string | null;
    sku: string | null;
    winRate: {
      total: number;
      gpt4: number;
      claude: number;
      gemini: number;
    };
    quality: number;
    simulations: number;
    updatedAt: Date;
  };
}
