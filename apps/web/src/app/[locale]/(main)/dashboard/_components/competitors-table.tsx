"use client";

import { cn } from "@zenncore/utils";
import type { ColumnDef } from "@zenncore/web/components/data-table";
import {
  DataTable,
  DataTableEmpty,
  DataTablePagination,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import { useLocale, useTranslations } from "next-intl";
import { usePaginationChangeHandler } from "@/hooks/pagination";
import { normalizePrice } from "@/lib/currency";
import { formatRelativeTime } from "@/lib/date";
import { EntityMark } from "../[store]/brand/_components/entity-mark";

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
  locale: string,
  fields: {
    brand: string;
    price: string;
    measured: string;
    unmeasured: string;
    winRate: string;
    simulations: string;
    lastUpdated: string;
  },
  productCount: (count: number) => string,
): ColumnDef<CompetitorsTable.Row>[] => [
  {
    accessorKey: "brand",
    header: () => (
      <span className="normal-case tracking-normal">{fields.brand}</span>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <EntityMark name={row.original.brand} className="size-9" />
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
    accessorKey: "lowestPrice",
    header: () => (
      <span className="normal-case tracking-normal">{fields.price}</span>
    ),
    cell: ({ row }) => {
      // Deliberately shows the OBSERVED price only. A brand whose rows all came
      // from a model has a price stored, but rendering it here beside measured
      // ones would present a recollection and an observation as the same kind
      // of fact — which is exactly the confusion this column exists to remove.
      const price = row.original.lowestPrice;
      if (!price)
        return (
          <span className="text-foreground-dimmed/50">{fields.unmeasured}</span>
        );

      return (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground-rich tabular-nums">
            {normalizePrice(price)}
          </span>
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
            {fields.measured}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "winRate",
    header: () => (
      <span className="normal-case tracking-normal">{fields.winRate}</span>
    ),
    cell: ({ row }) =>
      row.original.simulations > 0 ? (
        <WinRateBar rate={row.original.winRate} />
      ) : (
        <span className="text-foreground-dimmed">—</span>
      ),
  },
  {
    accessorKey: "simulations",
    header: () => (
      <span className="normal-case tracking-normal">{fields.simulations}</span>
    ),
    cell: ({ row }) => (
      <span className="text-foreground-dimmed tabular-nums">
        {row.original.simulations}
      </span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: () => (
      <span className="normal-case tracking-normal">{fields.lastUpdated}</span>
    ),
    cell: ({ row }) => (
      <span className="text-foreground-dimmed">
        {formatRelativeTime(new Date(row.original.updatedAt), locale)}
      </span>
    ),
  },
];

export const CompetitorsTable = ({
  rows,
  pageCount,
  title,
  kicker: _kicker,
  action,
  paginated = false,
  ...props
}: CompetitorsTable.Props) => {
  const locale = useLocale();

  const translate = useTranslations("dashboard.competitors.table");
  const pagination = useTranslations("dashboard.shared.pagination");
  const handlePaginationChange = usePaginationChangeHandler();
  const columns = buildColumns(
    locale,
    {
      brand: translate("fields.brand"),
      price: translate("fields.price"),
      measured: translate("fields.measured"),
      unmeasured: translate("fields.unmeasured"),
      winRate: translate("fields.winRate"),
      simulations: translate("fields.simulations"),
      lastUpdated: translate("fields.lastUpdated"),
    },
    (count) => translate("productCount", { count }),
  );
  const resolvedTitle = title ?? translate("title");

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 border-accent-foreground border-b px-4 py-5 sm:px-6">
        <div>
          <h2 className="font-semibold text-foreground-rich text-lg">
            {resolvedTitle}
          </h2>
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
              <div className="px-4 py-8 sm:px-6">
                <p className="font-semibold text-foreground-rich text-lg">
                  {translate("states.empty.primary")}
                </p>
                <p className="mt-2 text-foreground-dimmed text-sm leading-6">
                  {translate("states.empty.secondary")}
                </p>
              </div>
            </DataTableEmpty>
          </DataTable>
          {paginated && (
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
    /**
     * Provenance. Optional so the two callers that do not aggregate it yet keep
     * compiling — a row without these renders no price and no badge rather than
     * an empty column.
     */
    measured?: number;
    /** Cheapest OBSERVED price for this brand. Null when nothing was measured. */
    lowestPrice?: string | null;
    measuredAt?: Date | null;
  };
}
