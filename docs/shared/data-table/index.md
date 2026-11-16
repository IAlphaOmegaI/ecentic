# @zenncore/data-table

Typed TanStack Table context and hooks. The [web DataTable](../../web/data-table.md) supplies the shared table renderer and controls.

## Exports

```tsx
import {
  DataTableProvider,
  useDataTable,
  useInterfacedTable,
  type DataTableFeatures,
  type Pagination,
  type TableRow,
} from "@zenncore/data-table";
```

`useInterfacedTable` is the public export of the internally named `useDataTableConfig` hook. Do not import `useDataTableConfig` from the package root.

## DataTableProvider

The provider passes its configuration to `useInterfacedTable` and exposes the result to descendants.

| Prop | Type | Contract |
|------|------|----------|
| `rows` | `Row[]` | Required; every row extends `TableRow` |
| `columns` | `ColumnDef[]` | Required; definitions bound to `DataTableFeatures` |
| `handler` | `"client" \| "server"` | Defaults to `"client"` |
| `pageIndex` | `number` | 1-based; defaults to `1` |
| `pageSize` | `number` | Defaults to `20` in client mode; required in server mode |
| `rowCount` | `number` | Server mode only; total rows across all pages |
| `pageCount` | `number` | Server-mode alternative to `rowCount` |
| `onPaginationChange` | `(value: PaginationState) => void` | Receives resolved state with a 1-based `pageIndex` |
| `onSortingChange` | `(value: SortingState) => void` | Receives resolved sort state |
| `onColumnsFilterChange` | `(value: ColumnFiltersState) => void` | Receives resolved filter state; note the plural **Columns** in the prop name |
| `onExpandedChange` | `(value: ExpandedState) => void` | Receives resolved expansion state |
| `children` | `ReactNode` | Provider descendants |

`data`, `total`, `initialState`, and `getRowId` are not exposed by this wrapper. Server mode requires `pageSize` and either `rowCount` or `pageCount`. Pass the current page as `rows`, not the entire server dataset.

Client mode owns pagination locally; `pageIndex`/`pageSize` initialize it. Server mode uses those incoming props as controlled state, so the caller must update them after `onPaginationChange`. The wrapper converts to TanStack's 0-based index internally; do not subtract one at its public boundary.

Sorting and filtering are state-only in both modes: no sorted or filtered row models are registered. The caller supplies appropriately processed rows, including applying server sorting/filtering before pagination. Pagination, expansion, faceting, row selection, and column visibility features are registered.

## Basic setup

```tsx
"use client";

import { DataTableProvider } from "@zenncore/data-table";
import {
  createColumnHelper,
  DataTable,
  DataTableEmpty,
  DataTablePagination,
} from "@zenncore/web/components/data-table";

type User = { _id: string; name: string; email: string };
const columnHelper = createColumnHelper<User>();
const columns = [
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor("email", { header: "Email" }),
];

export const UsersTable = ({ rows }: { rows: User[] }) => (
  <DataTableProvider rows={rows} columns={columns}>
    <DataTable>
      <DataTableEmpty>No users found.</DataTableEmpty>
    </DataTable>
    <DataTablePagination />
  </DataTableProvider>
);
```

Use localized headings, empty copy, and `DataTablePagination.labels` in app screens. Custom table renderers use the shared `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, and `TableCell` components from `@zenncore/web/components/table`.

## useDataTable

Call inside the provider:

```tsx
const { table, pagination } = useDataTable<User>();
```

The return value has exactly these two properties. `table` is the TanStack `Table<DataTableFeatures, User>` instance; sorting, filtering, selection, and visibility are accessed through that instance. There are no top-level `sorting` or `rowSelection` context properties.

`pagination` exposes the wrapper's 1-based state and helpers:

```ts
type Pagination = {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  canGoNextPage: boolean;
  canGoPreviousPage: boolean;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  goToPage: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
};
```

For example, `pagination.goToPage(1)` requests the first page. In server mode, these helpers invoke `onPaginationChange`; they do not fetch rows.

## useInterfacedTable

Use directly when building a custom context/rendering layer. It accepts the same configuration as the provider, excluding `children`, and returns `{ table, pagination }`.

```tsx
const { table, pagination } = useInterfacedTable<User>({
  rows: users,
  columns,
  pageSize: 20,
});
```

The hook alone does not provide context to `DataTable`; use `DataTableProvider` with the standard web renderer.

## Row and column types

Rows combine their domain fields with these wrapper properties:

```ts
type User = {
  _id: string | number;
  name: string;
  email: string;
  subrows?: User[];
  href?: string;
};
```

`subrows` supplies expandable children. `href` is optional metadata; the web renderer does not automatically turn it into navigation. Define links/actions in column cells.

The raw TanStack v9 types require a feature generic. For application columns, use the pre-bound `ColumnDef<Row>` and `createColumnHelper<Row>()` exports from `@zenncore/web/components/data-table`. The wrapper's column metadata accepts `className?: string`, which the web renderer applies to header and body cells.
