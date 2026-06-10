"use client";

import {
  type ColumnDef,
  createColumnHelper,
  flexRender,
  type PaginationState,
} from "@tanstack/react-table";
import {
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

export {
  type ColumnDef,
  createColumnHelper,
  DataTableProvider,
  type PaginationState,
  useDataTable,
};

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
                    className={classList?.["header-cell"]}
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
                  <TableCell key={cell.id} className={classList?.["body-cell"]}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          : empty && (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
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

export const DataTablePagination = <T extends TableRowType>(): JSX.Element => {
  const { pagination } = useDataTable<T>();

  return (
    <Pagination>
      <PaginationContent className="w-full p-4">
        <div className="mr-auto text-foreground-dimmed text-xs uppercase tracking-[0.2em]">
          Page {pagination.pageIndex} of {pagination.pageCount}
        </div>
        <PaginationItem
          onClick={() => {
            pagination.goToPage(1);
          }}
        >
          <DoubleChevronLeftIcon />
        </PaginationItem>
        {pagination.pageIndex > 1 && (
          <PaginationItem
            onClick={() => {
              pagination.goToPage(pagination.pageIndex - 1);
            }}
          >
            <ChevronLeftIcon />
          </PaginationItem>
        )}
        {pagination.pageIndex < pagination.pageCount && (
          <PaginationItem
            onClick={() => {
              pagination.goToPage(pagination.pageIndex + 1);
            }}
          >
            <ChevronRightIcon />
          </PaginationItem>
        )}
        <PaginationItem
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
