# Data Table

The shared web renderer for TanStack Table, with column visibility, selection, expansion, and pagination state supplied by `@zenncore/data-table`.

## Basic usage

```tsx
"use client";

import {
  createColumnHelper,
  DataTable,
  DataTableEmpty,
  DataTablePagination,
  DataTableProvider,
} from "@zenncore/web/components/data-table";

type User = { _id: string; name: string; email: string };
const columnHelper = createColumnHelper<User>();
const columns = [
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor("email", { header: "Email" }),
];

export const UsersTable = ({ rows }: { rows: User[] }) => (
  <DataTableProvider rows={rows} columns={columns} pageSize={20}>
    <DataTable>
      <DataTableEmpty>No users found.</DataTableEmpty>
    </DataTable>
    <DataTablePagination />
  </DataTableProvider>
);
```

Localize column headings, empty states, and pagination labels in app screens. Every row must have a stable `_id` (`string | number`). The renderer uses this value as its row key.

## DataTableProvider

`rows` and `columns` are required. Client pagination is the default; `pageIndex` starts at **1** and `pageSize` defaults to **20**.

For server pagination, pass the current page's rows and its total size:

```tsx
<DataTableProvider
  rows={pageRows}
  columns={columns}
  handler="server"
  pageIndex={pageIndex}
  pageSize={pageSize}
  rowCount={rowCount}
  onPaginationChange={setPagination}
>
  <DataTable />
  <DataTablePagination />
</DataTableProvider>
```

`setPagination` receives `{ pageIndex, pageSize }` with a 1-based index. The caller updates its URL/state, fetches that page, and passes the resulting rows back. Server mode requires `pageSize` and either `rowCount` or `pageCount`; `pageCount` is a supported alternative when the server already returns the number of pages. There are no `data` or `total` props.

Sorting and filtering callbacks expose state changes but do not process the rows. Apply sorting/filtering before passing `rows` (before pagination for server data). See the [provider and hook contract](../shared/data-table/index.md) for callbacks and pagination methods.

## DataTable

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Header, footer, and empty-state slots |
| `className` | `string` | Class applied to the shared `Table` |
| `classList` | `ClassList<"header-cell" \| "body-row" \| "body-cell">` | Targeted cell/row styling |

`ColumnDef` and `createColumnHelper` are re-exported from `@zenncore/web/components/data-table`, pre-bound to the wrapper's TanStack v9 features. Use `ColumnDef<Row>` rather than the raw TanStack type, which also needs the feature generic. `columnDef.meta.className` applies to that column's header and body cells.

The renderer has no `onRowClick` prop and does not automatically navigate to a row's optional `href`. Render an accessible app `Link` or shared `Button` in a column cell for navigation/actions. Selection controls also belong in column definitions; selection state is available through `useDataTable().table`.

## Header, footer, and empty slots

Place slots inside `DataTable`. `DataTableHeader` replaces the default column headers; `DataTableFooter` supplies footer rows. Both use the shared table primitives:

```tsx
import {
  DataTable,
  DataTableEmpty,
  DataTableFooter,
  DataTableHeader,
} from "@zenncore/web/components/data-table";
import {
  TableCell,
  TableHead,
  TableRow,
} from "@zenncore/web/components/table";

<DataTable>
  <DataTableHeader>
    <TableRow>
      <TableHead colSpan={2}>Custom header</TableHead>
    </TableRow>
  </DataTableHeader>
  <DataTableEmpty>No matching users.</DataTableEmpty>
  <DataTableFooter>
    <TableRow>
      <TableCell colSpan={2}>Table notes</TableCell>
    </TableRow>
  </DataTableFooter>
</DataTable>
```

`DataTableEmpty` contains ordinary content: the renderer supplies its row and a cell spanning the visible columns. Without this slot, an empty row model renders an empty body.

## DataTablePagination

Pagination controls consume the provider context. An optional `variant` prop passes the shared Button variant to every page
control. The default remains `outline`; dashboard consumers use
`<DataTablePagination variant="soft" />`.

The optional `labels` prop accepts:

```ts
{
  navigation?: string;
  page?: (pageIndex: number, pageCount: number) => ReactNode;
  firstPage?: string;
  previousPage?: string;
  nextPage?: string;
  lastPage?: string;
}
```

Pass translated values and format the page/count through the app's locale formatter. The standalone component has English defaults and does not fetch data or choose a page size. Render an explicit empty state instead of pagination when there are no rows/pages.
