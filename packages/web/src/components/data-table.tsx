"use client";

import { flexRender } from "@tanstack/react-table";
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

export { DataTableProvider, useDataTable };

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
            <TableRow key={group.id} className="bg-background-dimmed">
              {group.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "text-foreground-dimmed",
                      classList?.["header-cell"],
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
                className={cn("relative z-10", classList?.["body-row"])}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn("relative", classList?.["body-cell"])}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          : empty && (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className={cn("max-w-full bg-red-500 text-left")}
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
      <PaginationContent className="w-full px-2">
        <div className="mr-auto">
          {pagination.pageIndex} / {pagination.pageCount}
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

// const DataTableEmpty = ({ children }: DataTableEmpty.Props) => {
//   return (
//     <TableRow>
//       <TableCell
//         className={cn("text-center bg-red-500 max-w-full text-left")}
//         colSpan={table.getAllColumns().length}
//       >
//         {children}
//       </TableCell>
//     </TableRow>
//   );
// };
// export namespace DataTableEmpty {
//   export type Props = {
//     children: ReactNode;
//   };
// }
