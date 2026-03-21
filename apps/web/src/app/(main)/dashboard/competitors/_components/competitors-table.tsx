"use client";

import { ArrowRightIcon, BoxMinusIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { ColumnDef } from "@zenncore/web/components/data-table";
import {
  DataTable,
  DataTableEmpty,
  DataTablePagination,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { formatRelativeTime } from "@/lib/date";
import type { Paginated } from "@/server/utils/pagination";

const WinRateBar = ({ rate }: { rate: number }) => {
  const color = (() => {
    switch (true) {
      case rate >= 60:
        return "bg-success";
      case rate >= 30:
        return "bg-warning";
      default:
        return "bg-error";
    }
  })();

  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-24 bg-accent-foreground">
        <div className={cn("h-full", color)} style={{ width: `${rate}%` }} />
      </div>
      <span className="font-medium text-foreground">{rate}%</span>
    </div>
  );
};

const columns: ColumnDef<CompetitorsTable.Row>[] = [
  {
    accessorKey: "brand",
    header: "Brand",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary text-xs">
          {row.original.brand.slice(0, 2).toUpperCase()}
        </div>
        <p className="font-medium text-foreground text-sm">
          {row.original.brand}
        </p>
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
    cell: ({ row }) => <WinRateBar rate={row.original.winRate} />,
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
        {formatRelativeTime(new Date(row.original.updatedAt))}
      </span>
    ),
  },
  {
    id: "actions",
    header: undefined,
    cell: ({ row }) => (
      <Button
        variant="outline"
        color="accent"
        size="icon"
        render={<Link href={`/dashboard/competitors/${row.original._id}`} />}
      >
        <ArrowRightIcon className="size-4" />
      </Button>
    ),
  },
];

export const CompetitorsTable = ({
  rows,
  pagination,
}: CompetitorsTable.Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePaginationChange = useCallback(
    (state: { pageIndex: number; pageSize: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(state.pageIndex));
      params.set("size", String(state.pageSize));
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <>
      <div className="flex items-center justify-between border-accent-foreground border-b p-4">
        <p className="mt-1 font-light text-2xl text-foreground-dimmed">
          Competitor Brands
        </p>
      </div>
      <div className="overflow-x-auto bg-background-rich">
        <DataTableProvider
          rows={rows}
          columns={columns}
          handler="server"
          pageSize={pagination.size}
          pageIndex={pagination.page}
          rowCount={pagination.total}
          onPaginationChange={handlePaginationChange}
        >
          <DataTable>
            <DataTableEmpty>
              <div className="p-8 text-center">
                <BoxMinusIcon className="mb-6 size-24" />
                <p className="text-foreground text-lg">
                  No competitors tracked yet
                </p>
                <p className="mt-1 font-light text-foreground-dimmed text-sm">
                  Add competitors to start analyzing your competitive landscape.
                </p>
              </div>
            </DataTableEmpty>
          </DataTable>
          {pagination.total > pagination.size && <DataTablePagination />}
        </DataTableProvider>
      </div>
    </>
  );
};

export namespace CompetitorsTable {
  export type Props = {
    rows: Row[];
    pagination: Paginated<Row>["pagination"];
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
