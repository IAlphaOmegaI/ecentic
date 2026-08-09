"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  columnFacetingFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createPaginatedRowModel,
  type ExpandedState,
  type PaginationState,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  type SortingState,
  type Table,
  type TableFeatures,
  tableFeatures,
  type Updater,
  useTable,
} from "@tanstack/react-table";
import { useState } from "react";
import type { TableRow } from "../utils/types/row";

export type DataTableFeatures = Required<
  Pick<
    TableFeatures,
    | "columnFacetingFeature"
    | "columnFilteringFeature"
    | "columnVisibilityFeature"
    | "rowExpandingFeature"
    | "rowPaginationFeature"
    | "rowSelectionFeature"
    | "rowSortingFeature"
    | "expandedRowModel"
    | "facetedRowModel"
    | "facetedUniqueValues"
    | "paginatedRowModel"
  >
>;

// Sorting and filtering are state-only: their row models are intentionally not
// registered because processing is always delegated (manual mode server-side,
// no-op client-side). Selection and visibility carry no row models but gate the
// row.getIsSelected/row.getVisibleCells APIs the DataTable component renders.
const dataTableFeatures: DataTableFeatures = tableFeatures({
  columnFacetingFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  expandedRowModel: createExpandedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  paginatedRowModel: createPaginatedRowModel(),
});

export type UseDataTableConfigParams<T extends TableRow> = {
  rows: T[];
  // biome-ignore lint/suspicious/noExplicitAny: needed
  columns: ColumnDef<DataTableFeatures, T, any>[];
  onPaginationChange?: (pagination: PaginationState) => void;
  onSortingChange?: (sorting: SortingState) => void;
  onColumnsFilterChange?: (filter: ColumnFiltersState) => void;
  onExpandedChange?: (expanded: ExpandedState) => void;
  pageIndex?: number;
  pageSize?: number;
} & (
  | {
      handler?: "client";
    }
  | {
      handler: "server";
      pageSize: number;
      rowCount: number;
    }
  | {
      handler: "server";
      pageSize: number;
      pageCount: number;
    }
);

const getUpdaterValue = <P>(updater: Updater<P>, previousState: P) => {
  return typeof updater === "function"
    ? (updater as (value: P) => P)(previousState)
    : updater;
};
const normalizePagination = (pagination: PaginationState) => {
  return {
    ...pagination,
    // due to the nature of the tanstack useTable hook, we need to move to a 0 base index instead of 1 base that we use to interface with the client
    pageIndex: pagination.pageIndex - 1,
  };
};

type DataTablePaginationState = {
  canGoNextPage: boolean;
  canGoPreviousPage: boolean;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  goToPage: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
  pageCount: number;
};

type UseDataTableConfigReturn<T extends TableRow> = {
  table: Table<DataTableFeatures, T>;
  pagination: PaginationState & DataTablePaginationState;
};

export const useDataTableConfig = <T extends TableRow>({
  rows,
  columns,
  onPaginationChange,
  onSortingChange,
  onColumnsFilterChange,
  onExpandedChange,
  // 1-based indexing for the pagination interfacing
  pageIndex = 1,
  pageSize = 20,
  ...params
}: UseDataTableConfigParams<T>): UseDataTableConfigReturn<T> => {
  // this is a special implementation as it is not a direct interface with the tanstack useTable hook, it uses 1-based indexing
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex,
    pageSize,
  });

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const isServerSide = params.handler === "server";

  const pageCount = isServerSide
    ? "pageCount" in params
      ? params.pageCount
      : // biome-ignore lint/style/noNonNullAssertion: if row count is undefined, row count will always be defined
        Math.ceil(params.rowCount! / pageSize)
    : Math.ceil(rows.length / pageSize);

  const table = useTable<DataTableFeatures, T>({
    features: dataTableFeatures,
    data: rows,
    columns,
    manualPagination: isServerSide,
    manualSorting: isServerSide,
    manualFiltering: isServerSide,
    getSubRows: (row) => row.subrows as T[],
    onPaginationChange: (updater) => {
      const value = getUpdaterValue(updater, normalizePagination(pagination));
      // when we interface with the onPaginationChange callback, we will need to move to a 1 base index instead of 0 base that tanstack uses
      const newValue = { ...value, pageIndex: value.pageIndex + 1 };

      setPagination(newValue);
      onPaginationChange?.(newValue);
    },
    onColumnFiltersChange: (updater) => {
      const value = getUpdaterValue(updater, columnFilters);

      setColumnFilters(value);
      onColumnsFilterChange?.(value);
    },
    onSortingChange: (updater) => {
      const value = getUpdaterValue(updater, sorting);

      setSorting(value);
      onSortingChange?.(value);
    },
    onExpandedChange: (updater) => {
      const value = getUpdaterValue(updater, expanded);

      setExpanded(value);
      onExpandedChange?.(value);
    },
    state: {
      pagination: normalizePagination(pagination),
      sorting,
      columnFilters,
      expanded,
    },
    ...params,
  });

  return {
    table,
    pagination: Object.assign<PaginationState, DataTablePaginationState>(
      pagination,
      {
        canGoNextPage: table.getCanNextPage(),
        canGoPreviousPage: table.getCanPreviousPage(),
        goToNextPage: table.nextPage,
        goToPreviousPage: table.previousPage,
        goToFirstPage: table.firstPage,
        goToLastPage: table.lastPage,
        // accounting for the fact that our outside interface is 1-based
        goToPage: (pageIndex) => table.setPageIndex(pageIndex - 1),
        setPageSize: table.setPageSize,
        pageCount,
      },
    ),
  };
};
