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

const columns: ColumnDef<CompetitorsTable.Row>[] = [
  {
    accessorKey: "brand",
    header: "Brand",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center bg-foreground/10 font-bold text-foreground text-xs">
          {row.original.brand.slice(0, 2).toUpperCase()}
        </div>
        <span className="font-medium text-foreground text-sm">
          {row.original.brand}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "products",
    header: "Products",
  },
  {
    accessorKey: "winRate",
    header: "Your Win Rate",
    cell: ({ row }) => {
      const rate = row.original.winRate;
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
          <div className="h-1.5 w-16 bg-accent-foreground">
            <div className={cn("h-full", bar)} style={{ width: `${rate}%` }} />
          </div>
          <span className={cn("font-medium text-xs", text)}>{rate}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: "simulations",
    header: "Simulations",
  },
  {
    accessorKey: "updatedAt",
    header: "Last Updated",
    cell: ({ row }) => (
      <span className="font-light text-foreground-dimmed text-xs">
        {formatRelativeTime(row.original.updatedAt.toISOString())}
      </span>
    ),
  },
  {
    id: "actions",
    header: undefined,
    cell: ({ row }) => (
      <Link
        href={`/dashboard/competitors/${row.original._id}`}
        className="flex items-center gap-1 whitespace-nowrap font-light text-primary text-xs hover:underline"
      >
        View Details <ArrowRightIcon className="size-3" />
      </Link>
    ),
  },
];

export const CompetitorsTable = ({ rows }: CompetitorsTable.Props) => (
  <div className="bg-background-rich">
    <div className="border-accent-foreground border-b px-4 py-3">
      <p className="font-medium text-foreground text-sm">Competitor Brands</p>
    </div>
    <DataTableProvider rows={rows} columns={columns} pageSize={10}>
      <DataTable>
        <DataTableEmpty>
          <p className="py-8 text-center font-light text-foreground-dimmed text-sm">
            No competitor brands found.
          </p>
        </DataTableEmpty>
      </DataTable>
      {rows.length > 10 && <DataTablePagination />}
    </DataTableProvider>
  </div>
);
export namespace CompetitorsTable {
  export type Props = {
    rows: Row[];
  };
  export type Row = {
    _id: string;
    brand: string;
    products: number;
    winRate: number;
    simulations: number;
    updatedAt: Date;
  };
}
