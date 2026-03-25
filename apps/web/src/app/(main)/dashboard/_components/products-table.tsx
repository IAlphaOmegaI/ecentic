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
import Link from "next/link";
import type { ReactNode } from "react";
import { usePaginationChangeHandler } from "@/hooks/pagination";
import { formatRelativeTime } from "@/lib/date";
import Image from "next/image";

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
      <div className="h-1 w-24 bg-accent-foreground">
        <div className={cn("h-full", bar)} style={{ width: `${rate}%` }} />
      </div>
      <span className={cn("font-medium text-foreground", text)}>{rate}%</span>
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
      <div className="h-1 w-24 bg-accent-foreground">
        <div className={cn("h-full", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-foreground-dimmed">{score}/100</span>
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
        className="group flex items-center gap-2"
      >
        <Avatar className="size-9 rounded-none bg-primary/10">
          <AvatarImage
            src={row.original.image ?? "/images/fallback"}
            alt={row.original.title}
          />
          <AvatarFallback className="relative">
            <Image
              src={"/images/fallback"}
              alt={row.original.title}
              width={36}
              height={36}
              fill
            />
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground transition-colors group-hover:text-primary">
            {row.original.title}
          </p>
          {row.original.sku && (
            <p className="text-foreground-dimmed">{row.original.sku}</p>
          )}
        </div>
      </Link>
    ),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => (
      <span className="text-foreground">
        {row.original.price
          ? `${row.original.currency ?? "$"} ${row.original.price}`
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
      <span className="font-light text-foreground">
        {row.original.winRate.gpt4}%
      </span>
    ),
  },
  {
    accessorKey: "winRate.claude",
    header: "Claude",
    cell: ({ row }) => (
      <span className="font-light text-foreground">
        {row.original.winRate.claude}%
      </span>
    ),
  },
  {
    accessorKey: "winRate.gemini",
    header: "Gemini",
    cell: ({ row }) => (
      <span className="font-light text-foreground">
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
      <span className="whitespace-nowrap font-light text-foreground-dimmed">
        {formatRelativeTime(row.original.updatedAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: undefined,
    cell: ({ row }) => (
      <Button
        size={"icon"}
        color="primary"
        variant={"flat"}
        render={<Link href={`/dashboard/products/${row.original._id}`} />}
      >
        <ArrowRightIcon />
      </Button>
    ),
  },
];

export const ProductsTable = ({
  rows,
  title = "Product Catalog",
  action,
  paginated,
  pageCount,
  ...props
}: ProductsTable.Props) => {
  const handlePaginationChange = usePaginationChangeHandler("products/");
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
          pageSize={20}
          pageCount={pageCount}
          onPaginationChange={paginated ? handlePaginationChange : undefined}
          handler="server"
          {...props}
        >
          <DataTable className={cn(!paginated && "border-b-0")}>
            <DataTableEmpty>
              <div className="p-8 text-center">
                <BoxMinusIcon className="mx-auto mb-6 size-24" />
                <p className="text-foreground text-lg">No products found</p>
                <p className="mt-1 font-light text-foreground-dimmed text-sm">
                  Import products and run a simulation to see win rates here.
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

export namespace ProductsTable {
  export type Props = Omit<
    DataTableProvider.Props<Row>,
    "columns" | "handler"
  > & {
    rows: Row[];
    title?: string;
    action?: ReactNode;
    paginated?: boolean;
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
