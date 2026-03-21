"use client";

import { ArrowRightIcon, BoxMinusIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { ColumnDef } from "@zenncore/web/components/data-table";
import {
  DataTable,
  DataTableEmpty,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import Link from "next/link";

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
      <span className="font-light text-foreground-dimmed">{score}%</span>
    </div>
  );
};

const columns: ColumnDef<OverviewTable.Row>[] = [
  {
    accessorKey: "title",
    header: "Product",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary text-xs">
          {row.original.title.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-foreground text-sm">
            {row.original.title}
          </p>
          {row.original.price && (
            <p className="font-light text-foreground-dimmed text-xs">
              {row.original.currency === "USD"
                ? "$"
                : (row.original.currency ?? "")}
              {row.original.price}
            </p>
          )}
        </div>
      </div>
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
    cell: (cell) => `${cell.getValue()}%`,
  },
  {
    accessorKey: "winRate.claude",
    header: "Claude",
    cell: (cell) => `${cell.getValue()}%`,
  },
  {
    accessorKey: "winRate.gemini",
    header: "Gemini",
    cell: (cell) => `${cell.getValue()}%`,
  },
  {
    accessorKey: "quality",
    header: "Quality",
    cell: ({ row }) => <QualityBar score={row.original.quality} />,
  },
  {
    id: "actions",
    header: undefined,
    cell: ({ row }) => (
      <Button
        variant="outline"
        color="accent"
        size={"icon"}
        render={<Link href={`/dashboard/products/${row.original._id}`} />}
      >
        <ArrowRightIcon className="size-4" />
      </Button>
    ),
  },
];

export const OverviewTable = ({ products }: OverviewTable.Props) => (
  <>
    <div className="flex items-center justify-between border-accent-foreground border-b p-4">
      <p className="mt-1 font-light text-2xl text-foreground-dimmed">
        Product Win Rates
      </p>
      <Button
        variant="outline"
        color="primary"
        render={<Link href="/dashboard/products" />}
      >
        View all products <ArrowRightIcon className="size-4" />
      </Button>
    </div>
    <div className="overflow-x-auto bg-background-rich">
      <DataTableProvider rows={products} columns={columns} pageSize={10}>
        <DataTable>
          <DataTableEmpty>
            <div className="p-8 text-center">
              <BoxMinusIcon className="mb-6 size-24" />
              <p className="text-foreground text-lg">No products scanned yet</p>
              <p className="mt-1 font-light text-foreground-dimmed text-sm">
                Import products and run a simulation to see win rates here.
              </p>
            </div>
          </DataTableEmpty>
        </DataTable>
      </DataTableProvider>
    </div>
  </>
);

export namespace OverviewTable {
  export type Props = {
    products: Row[];
  };

  export type Row = {
    _id: string;
    title: string;
    price: string | null;
    currency: string | null;
    winRate: { total: number; gpt4: number; claude: number; gemini: number };
    quality: number;
  };
}
