"use client";

import { ArrowRightIcon, BoxMinusIcon } from "@zenncore/icons";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@zenncore/web/components/dropdown-menu";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { usePaginationChangeHandler } from "@/hooks/pagination";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/currency";
import { formatRelativeTime } from "@/lib/date";
import { SectionKicker } from "./grid";

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
  store: string,
  fields: {
    product: string;
    price: string;
    winRate: string;
    quality: string;
    lastScan: string;
  },
): ColumnDef<ProductsTable.Row>[] => [
  {
    accessorKey: "title",
    header: fields.product,
    enableHiding: false,
    meta: { className: "overflow-hidden" },
    cell: ({ row }) => (
      <Link
        href={`/dashboard/${store}/products/${row.original._id}`}
        className="group flex w-full min-w-0 items-center gap-2 overflow-hidden"
      >
        <Avatar className="size-9 shrink-0 rounded-md bg-background-dimmed">
          <AvatarImage
            src={row.original.image ?? "/images/fallback.png"}
            alt={row.original.title}
          />
          <AvatarFallback className="relative">
            <Image src="/images/fallback.png" alt="Fallback" fill />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate font-medium text-foreground-rich transition-colors group-hover:text-primary">
            {row.original.title}
          </p>
          {row.original.sku && (
            <p className="truncate text-foreground-dimmed">
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
      <span className="text-foreground tabular-nums">
        {formatPrice(row.original.price, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "winRate.total",
    header: fields.winRate,
    meta: { className: "w-40" },
    cell: ({ row }) => <WinRateBar rate={row.original.winRate.total} />,
  },
  {
    accessorKey: "winRate.gpt4",
    header: "ChatGPT",
    meta: { className: "w-20" },
    cell: ({ row }) => (
      <span className="text-foreground tabular-nums">
        {row.original.winRate.gpt4}%
      </span>
    ),
  },
  {
    accessorKey: "winRate.claude",
    header: "Claude",
    meta: { className: "w-20" },
    cell: ({ row }) => (
      <span className="text-foreground tabular-nums">
        {row.original.winRate.claude}%
      </span>
    ),
  },
  {
    accessorKey: "winRate.gemini",
    header: "Gemini",
    meta: { className: "w-20" },
    cell: ({ row }) => (
      <span className="text-foreground tabular-nums">
        {row.original.winRate.gemini}%
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
        {formatRelativeTime(row.original.updatedAt)}
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

const ColumnsMenu = () => {
  const { table } = useDataTable<ProductsTable.Row>();
  const translate = useTranslations("dashboard.products.table.columns");

  const columns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" color="accent" />}>
        {translate("trigger")}
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
            {typeof column.columnDef.header === "string"
              ? column.columnDef.header
              : column.id}
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

export const ProductsTable = ({
  rows,
  title,
  kicker,
  action,
  paginated,
  columnsMenu,
  filtered,
  pageCount,
  ...props
}: ProductsTable.Props) => {
  const { store } = useParams<{ store: string }>();
  const translate = useTranslations("dashboard.products.table");
  const pagination = useTranslations("dashboard.shared.pagination");
  const handlePaginationChange = usePaginationChangeHandler();

  const columns = buildColumns(store, {
    product: translate("fields.product"),
    price: translate("fields.price"),
    winRate: translate("fields.winRate"),
    quality: translate("fields.quality"),
    lastScan: translate("fields.lastScan"),
  });

  const resolvedTitle = title ?? translate("title");

  return (
    <DataTableProvider
      rows={rows}
      columns={columns}
      pageSize={20}
      pageCount={pageCount}
      onPaginationChange={paginated ? handlePaginationChange : undefined}
      handler="server"
      {...props}
    >
      <div className="flex items-end justify-between border-accent-foreground border-b p-4">
        <div>
          {kicker && (
            <div className="mb-2">
              <SectionKicker>{kicker}</SectionKicker>
            </div>
          )}
          <p className="font-semibold text-foreground-rich text-lg">
            {resolvedTitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {action}
          {columnsMenu && <ColumnsMenu />}
        </div>
      </div>
      <div className="overflow-x-auto">
        <DataTable className={cn("table-fixed", !paginated && "border-b-0")}>
          <DataTableEmpty>
            <div className="p-8 text-center">
              <BoxMinusIcon className="mx-auto mb-6 size-24" />
              <p className="text-foreground text-lg">
                {translate(
                  filtered
                    ? "states.noMatches.primary"
                    : "states.empty.primary",
                )}
              </p>
              <p className="mt-1 text-foreground-dimmed text-sm">
                {translate(
                  filtered
                    ? "states.noMatches.secondary"
                    : "states.empty.secondary",
                )}
              </p>
            </div>
          </DataTableEmpty>
        </DataTable>
        {paginated && (
          <DataTablePagination
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
      </div>
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
    kicker?: string;
    action?: ReactNode;
    paginated?: boolean;
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
