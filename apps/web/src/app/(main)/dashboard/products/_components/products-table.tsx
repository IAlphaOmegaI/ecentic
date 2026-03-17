"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import type { ColumnDef } from "@zenncore/web/components/data-table";
import {
  DataTable,
  DataTableEmpty,
  DataTablePagination,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import Link from "next/link";
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
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-12 bg-accent-foreground">
        <div className={cn("h-full", bar)} style={{ width: `${rate}%` }} />
      </div>
      <span className={cn("font-medium text-xs", text)}>{rate}%</span>
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
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-10 bg-accent-foreground">
        <div className={cn("h-full", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="font-light text-foreground-dimmed text-xs">{score}</span>
    </div>
  );
};

const columns: ColumnDef<ProductsTable.Row>[] = [
  {
    accessorKey: "title",
    header: "Product",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/products/${row.original._id}`}
        className="group flex items-center gap-3"
      >
        <div className="flex size-9 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary text-xs">
          {row.original.title.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-foreground text-sm transition-colors group-hover:text-primary">
            {row.original.title}
          </p>
          {row.original.sku && (
            <p className="font-light text-foreground-dimmed text-xs">
              {row.original.sku}
            </p>
          )}
        </div>
      </Link>
    ),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => (
      <span className="font-light text-foreground text-sm">
        {row.original.price
          ? `${row.original.currency ?? "$"}${row.original.price}`
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "winRate.total",
    header: "Win Rate",
    cell: ({ row }) => <WinRateBar rate={row.original.winRate.total} />,
  },
  {
    accessorKey: "winRate.gpt4",
    header: "GPT-4",
    cell: ({ row }) => (
      <span className="font-light text-foreground text-xs">
        {row.original.winRate.gpt4}%
      </span>
    ),
  },
  {
    accessorKey: "winRate.claude",
    header: "Claude",
    cell: ({ row }) => (
      <span className="font-light text-foreground text-xs">
        {row.original.winRate.claude}%
      </span>
    ),
  },
  {
    accessorKey: "winRate.gemini",
    header: "Gemini",
    cell: ({ row }) => (
      <span className="font-light text-foreground text-xs">
        {row.original.winRate.gemini}%
      </span>
    ),
  },
  {
    accessorKey: "quality",
    header: "Quality",
    cell: ({ row }) => <QualityBar score={row.original.quality} />,
  },
  {
    accessorKey: "updatedAt",
    header: "Last Scan",
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-light text-foreground-dimmed text-xs">
        {formatRelativeTime(row.original.updatedAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: undefined,
    cell: ({ row }) => (
      <Link
        href={`/dashboard/products/${row.original._id}`}
        className="flex items-center gap-1 whitespace-nowrap font-light text-primary text-xs hover:underline"
      >
        View <ArrowRightIcon className="size-3" />
      </Link>
    ),
  },
];

export const ProductsTable = ({ rows }: ProductsTable.Props) => (
  <DataTableProvider rows={rows} columns={columns} pageSize={10}>
    <DataTable
      classList={{
        "body-cell": "text-left",
      }}
    >
      <DataTableEmpty>
        <p className="py-8 text-center font-light text-foreground-dimmed text-sm">
          No products found.
        </p>
      </DataTableEmpty>
    </DataTable>
    {rows.length > 10 && <DataTablePagination />}
  </DataTableProvider>
);
export namespace ProductsTable {
  export type Props = {
    rows: Row[];
  };

  export type Row = {
    _id: string;
    title: string;
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
