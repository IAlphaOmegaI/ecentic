"use client";

import { BoxMinusIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import type { ColumnDef } from "@zenncore/web/components/data-table";
import {
  DataTable,
  DataTableEmpty,
  DataTablePagination,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePaginationChangeHandler } from "@/hooks/pagination";
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

const buildColumns = (
  fields: {
    brand: string;
    winRate: string;
    simulations: string;
    lastUpdated: string;
  },
  productCount: (count: number) => string,
): ColumnDef<CompetitorsTable.Row>[] => [
  {
    accessorKey: "brand",
    header: fields.brand,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="size-9 rounded-md bg-background-dimmed">
          <AvatarImage
            src={row.original.image ?? "/images/fallback.png"}
            alt={row.original.brand}
          />
          <AvatarFallback className="relative">
            <Image src="/images/fallback.png" alt="Fallback" fill />
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-foreground-rich">
            {row.original.brand}
          </p>
          <p className="text-foreground-dimmed text-sm">
            {productCount(row.original.products)}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "winRate",
    header: fields.winRate,
    cell: ({ row }) => <WinRateBar rate={row.original.winRate} />,
  },
  {
    accessorKey: "simulations",
    header: fields.simulations,
    cell: ({ row }) => (
      <span className="text-foreground-dimmed tabular-nums">
        {row.original.simulations}
      </span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: fields.lastUpdated,
    cell: ({ row }) => (
      <span className="text-foreground-dimmed">
        {formatRelativeTime(new Date(row.original.updatedAt))}
      </span>
    ),
  },
];

export const CompetitorsTable = ({
  rows,
  pageCount,
  title,
  kicker,
  action,
  paginated = false,
  ...props
}: CompetitorsTable.Props) => {
  const translate = useTranslations("dashboard.competitors.table");
  const pagination = useTranslations("dashboard.shared.pagination");
  const handlePaginationChange = usePaginationChangeHandler();
  const columns = buildColumns(
    {
      brand: translate("fields.brand"),
      winRate: translate("fields.winRate"),
      simulations: translate("fields.simulations"),
      lastUpdated: translate("fields.lastUpdated"),
    },
    (count) => translate("productCount", { count }),
  );
  const resolvedTitle = title ?? translate("title");

  return (
    <>
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
          {...props}
        >
          <DataTable className={cn(!paginated && "border-b-0")}>
            <DataTableEmpty>
              <div className="flex flex-col items-center justify-center p-8 py-24 text-center">
                <BoxMinusIcon className="mb-6 size-24" />
                <p className="font-medium text-2xl text-foreground">
                  {translate("states.empty.primary")}
                </p>
                <p className="mt-1 text-foreground-dimmed text-lg">
                  {translate("states.empty.secondary")}
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
    kicker?: string;
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
