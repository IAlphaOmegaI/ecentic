"use client";

import type { Table } from "@tanstack/react-table";
import { createContext } from "@zenncore/utils/hooks";
import type { Context, JSX, PropsWithChildren } from "react";
import {
  type UseDataTableConfigParams,
  useDataTableConfig,
} from "../hooks/use-interfaced-table";
import type { Pagination } from "../utils/types/pagination";
import type { TableRow } from "../utils/types/row";

type DataTableContext<R extends TableRow> = {
  table: Table<R>;
  pagination: Pagination;
};

// biome-ignore lint/suspicious/noExplicitAny: we do an assertion later
const dataTableContext = createContext<DataTableContext<any>>({
  name: "DataTable",
});
// biome-ignore lint/suspicious/noExplicitAny: we do an assertion later
const DataTableContext: Context<DataTableContext<any> | undefined> =
  dataTableContext[0];
export const useDataTable: <R extends TableRow>() => DataTableContext<R> =
  dataTableContext[1];

export const DataTableProvider = <R extends TableRow>({
  children,
  ...props
}: DataTableProvider.Props<R>): JSX.Element => {
  const value = useDataTableConfig<R>(props);

  // value.pagination.pageCount

  const Context: Context<DataTableContext<R> | undefined> = DataTableContext;

  return <Context value={value}>{children}</Context>;
};
export namespace DataTableProvider {
  export type Props<R extends TableRow> = PropsWithChildren<
    UseDataTableConfigParams<R>
  >;
}
