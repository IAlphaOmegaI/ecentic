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
} from "@zenncore/web/components/data-table";
import Image from "next/image";
import Link from "next/link";
import { usePaginationChangeHandler } from "@/hooks/pagination";
import { formatRelativeTime } from "@/lib/date";

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
      <span className="text-foreground">{rate}%</span>
    </div>
  );
};

const columns: ColumnDef<CompetitorsTable.Row>[] = [
  {
    accessorKey: "brand",
    header: "Brand",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="size-9 rounded-none bg-primary/10">
          <AvatarImage
            src={row.original.image ?? "/images/fallback.png"}
            alt={row.original.brand}
          />
          <AvatarFallback className="relative">
            <Image src="/images/fallback.png" alt="Fallback" fill />
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground">{row.original.brand}</p>
          <p className="font-light text-foreground-dimmed text-sm">
            {row.original.products}{" "}
            {row.original.products === 1 ? "product" : "products"}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "winRate",
    header: "Win Rate",
    cell: ({ row }) => <WinRateBar rate={row.original.winRate} />,
  },
  {
    accessorKey: "simulations",
    header: "Simulations",
    cell: ({ row }) => (
      <span className="text-foreground-dimmed">{row.original.simulations}</span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Last Updated",
    cell: ({ row }) => (
      <span className="font-light text-foreground-dimmed">
        {formatRelativeTime(new Date(row.original.updatedAt))}
      </span>
    ),
  },
  // {
  //   id: "actions",
  //   header: undefined,
  //   cell: ({ row }) => (
  //     <Button
  //       variant="flat"
  //       color="primary"
  //       size="icon"
  //       render={<Link href={`/dashboard/competitors/${row.original._id}`} />}
  //     >
  //       <ArrowRightIcon className="size-4" />
  //     </Button>
  //   ),
  // },
];

export const CompetitorsTable = ({
  rows,
  pageCount,
  title = "Competitor Brands",
  action,
  paginated = false,
}: CompetitorsTable.Props) => {
  const handlePaginationChange = usePaginationChangeHandler();

  return (
    <>
      <div className="flex items-end justify-between border-accent-foreground border-b p-4">
        <p className="font-medium text-2xl text-foreground">{title}</p>
        {action}
      </div>
      <div className="overflow-x-auto">
        <DataTableProvider
          rows={rows}
          columns={columns}
          handler="server"
          pageSize={10}
          pageCount={pageCount}
          onPaginationChange={paginated ? handlePaginationChange : undefined}
        >
          <DataTable className={cn(!paginated && "border-b-0")}>
            <DataTableEmpty>
              <div className="flex flex-col items-center justify-center p-8 py-24 text-center">
                <BoxMinusIcon className="mb-6 size-24" />
                <p className="font-medium text-2xl text-foreground">
                  No competitors tracked yet
                </p>
                <p className="mt-1 font-light text-foreground-dimmed text-lg">
                  Add competitors to start analyzing your competitive landscape.
                </p>
              </div>
            </DataTableEmpty>
          </DataTable>
          {paginated && <DataTablePagination />}
        </DataTableProvider>
      </div>
    </>
  );
};

export namespace CompetitorsTable {
  export type Props = Omit<
    DataTableProvider.Props<Row>,
    "columns" | "handler"
  > & {
    rows: Row[];
    title?: string;
    action?: React.ReactNode;
    paginated?: boolean;
    pageCount: number;
  };

  export type Row = {
    _id: string;
    brand: string;
    image?: string | null;
    products: number;
    winRate: number;
    simulations: number;
    updatedAt: Date;
  };
}
