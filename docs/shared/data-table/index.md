# @zenncore/data-table

TanStack Table context and hooks for building data tables.

## Installation

```bash
bun add @zenncore/data-table
```

## Usage

```tsx
import {
  DataTableProvider,
  useDataTable,
  useInterfacedTable,
} from '@zenncore/data-table';
```

## Components

### DataTableProvider

Provides table state context to child components.

```tsx
<DataTableProvider
  columns={columns}
  data={data}
  pageCount={totalPages}
>
  <DataTable />
  <DataTablePagination />
</DataTableProvider>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `columns` | `ColumnDef[]` | TanStack Table columns |
| `data` | `T[]` | Table data |
| `pageCount` | `number` | Total pages |
| `initialState` | `InitialTableState` | Initial table state |
| `getRowId` | `(row) => string` | Row ID function |

### useDataTable

Hook to access table state and methods.

```tsx
const { table, pagination, sorting, rowSelection } = useDataTable();
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `table` | `Table<T>` | TanStack Table instance |
| `pagination` | `Pagination` | Pagination state & methods |
| `sorting` | `SortingState` | Sort state |
| `rowSelection` | `RowSelectionState` | Row selection |

---

## Hooks

### useInterfacedTable (useDataTableConfig)

Creates typed table configuration.

```tsx
const config = useInterfacedTable<User>({
  columns: columnHelper.columns,
  data: users,
});
```

---

## Types

### Pagination

```ts
type Pagination = {
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  canNextPage: boolean;
  canPreviousPage: boolean;
};
```

### TableRow

```ts
type TableRow = {
  _id: string;
  [key: string]: any;
};
```

---

## Examples

### Basic Setup

```tsx
import { DataTableProvider, useDataTable } from '@zenncore/data-table';
import { createColumnHelper } from '@tanstack/react-table';

type User = { _id: string; name: string; email: string };
const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('email', { header: 'Email' }),
];

function UserTable() {
  const { table, pagination } = useDataTable<User>();

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map(group => (
          <tr key={group.id}>
            {group.headers.map(header => (
              <th key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.original._id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

<DataTableProvider columns={columns} data={users} pageCount={10}>
  <UserTable />
</DataTableProvider>
```

---

## Notes

- Built on `@tanstack/react-table` v8
- Provides pagination, sorting, row selection
- Used by `@zenncore/web` DataTable component
- Type-safe with generics
