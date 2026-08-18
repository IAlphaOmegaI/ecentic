"use client";

import {
  type ColumnHelper,
  createColumnHelper as createTanStackColumnHelper,
  flexRender,
  type PaginationState,
  type RowData,
  type ColumnDef as TanStackColumnDef,
} from "@tanstack/react-table";
import {
  type DataTableFeatures,
  DataTableProvider,
  type TableRow as TableRowType,
  useDataTable,
} from "@zenncore/data-table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleChevronLeftIcon,
  DoubleChevronRightIcon,
} from "@zenncore/icons";
import { type ClassList, cn } from "@zenncore/utils";
import { createSlot, useSlot } from "@zenncore/utils/hooks";
import type { ComponentType, JSX, ReactNode } from "react";
import { Pagination, PaginationContent, PaginationItem } from "./pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

export { DataTableProvider, type PaginationState, useDataTable };

// Pre-bound to the wrapper's feature set so consumers keep the v8-style
// ColumnDef<TData, TValue> signature instead of threading TFeatures everywhere.
export type ColumnDef<
  TData extends RowData,
  TValue = unknown,
> = TanStackColumnDef<DataTableFeatures, TData, TValue>;

export const createColumnHelper = <TData extends RowData>(): ColumnHelper<
  DataTableFeatures,
  TData
> => createTanStackColumnHelper<DataTableFeatures, TData>();

type SlotComponent = ComponentType<{ children?: ReactNode | undefined }>;

export const DataTableHeader: SlotComponent = createSlot("DataTableHeader");
export const DataTableFooter: SlotComponent = createSlot("DataTableFooter");
export const DataTableEmpty: SlotComponent = createSlot("DataTableEmpty");

export const DataTable = <T extends TableRowType>({
  children,
  className,
  classList,
}: DataTable.Props): JSX.Element => {
  const { table } = useDataTable<T>();

  const header = useSlot(children, DataTableHeader);
  const footer = useSlot(children, DataTableFooter);
  const empty = useSlot(children, DataTableEmpty);

  // console.log("empty", empty, children);

  return (
    <Table className={className}>
      <TableHeader>
        {header ||
          table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      classList?.["header-cell"],
                      header.column.columnDef.meta?.className,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows?.length
          ? table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.original._id}
                data-expanded={row.getIsExpanded()}
                data-selected={row.getIsSelected()}
                className={cn("hover:bg-background", classList?.["body-row"])}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      classList?.["body-cell"],
                      cell.column.columnDef.meta?.className,
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          : empty && (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="text-left"
                >
                  {empty}
                </TableCell>
              </TableRow>
            )}
      </TableBody>
      {footer && <TableFooter>{footer}</TableFooter>}
    </Table>
  );
};
export namespace DataTable {
  export type Props = {
    className?: string;
    classList?: ClassList<"header-cell" | "body-row" | "body-cell">;
    children?: ReactNode;
  };
}

export const DataTablePagination = <T extends TableRowType>({
  labels,
}: DataTablePagination.Props = {}): JSX.Element => {
  const { pagination } = useDataTable<T>();

  // The package has no i18n runtime, so consumers pass translated labels;
  // the English defaults keep the component usable standalone.
  const page =
    labels?.page ??
    ((pageIndex: number, pageCount: number) =>
      `Page ${pageIndex} of ${pageCount}`);

  const isFirstPage = pagination.pageIndex <= 1;
  const isLastPage = pagination.pageIndex >= pagination.pageCount;

  return (
    <Pagination aria-label={labels?.navigation}>
      {/* Rendered as div > button so the controls are real, keyboard-reachable
          buttons instead of clickable list items. */}
      <PaginationContent render={<div />} className="w-full p-4">
        <div className="mr-auto text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
          {page(pagination.pageIndex, pagination.pageCount)}
        </div>
        <PaginationItem
          render={<button type="button" disabled={isFirstPage} />}
          className="disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={labels?.firstPage ?? "First page"}
          onClick={() => {
            pagination.goToPage(1);
          }}
        >
          <DoubleChevronLeftIcon />
        </PaginationItem>
        {pagination.pageIndex > 1 && (
          <PaginationItem
            render={<button type="button" />}
            aria-label={labels?.previousPage ?? "Previous page"}
            onClick={() => {
              pagination.goToPage(pagination.pageIndex - 1);
            }}
          >
            <ChevronLeftIcon />
          </PaginationItem>
        )}
        {pagination.pageIndex < pagination.pageCount && (
          <PaginationItem
            render={<button type="button" />}
            aria-label={labels?.nextPage ?? "Next page"}
            onClick={() => {
              pagination.goToPage(pagination.pageIndex + 1);
            }}
          >
            <ChevronRightIcon />
          </PaginationItem>
        )}
        <PaginationItem
          render={<button type="button" disabled={isLastPage} />}
          aria-label={labels?.lastPage ?? "Last page"}
          className="disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            pagination.goToPage(pagination.pageCount);
          }}
        >
          <DoubleChevronRightIcon />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
export namespace DataTablePagination {
  export type Props = {
    labels?: {
      navigation?: string;
      page?: (pageIndex: number, pageCount: number) => ReactNode;
      firstPage?: string;
      previousPage?: string;
      nextPage?: string;
      lastPage?: string;
    };
  };
}
