"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  type Table,
  type Updater,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import type { TableRow } from "../utils/types/row";

export type UseDataTableConfigParams<T extends TableRow> = {
  rows: T[];
  // biome-ignore lint/suspicious/noExplicitAny: needed
  columns: ColumnDef<T, any>[];
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
    // due to the nature of the tanstack useReactTable hook, we need to move to a 0 base index instead of 1 base that we use to interface with the client
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
  table: Table<T>;
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
  // this is a special implementation as it is not a direct interface with the tanstack useReactTable hook, it uses 1-based indexing
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

  const table = useReactTable<T>({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: isServerSide ? getFilteredRowModel() : undefined,
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: isServerSide ? getSortedRowModel() : undefined,
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getExpandedRowModel: getExpandedRowModel(),
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
