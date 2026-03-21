# Data Table

A table component built on TanStack Table with pagination and row selection support.

## Installation

```bash
bun add @zenncore/web @zenncore/data-table
```

## Usage

```tsx
import {
  DataTable,
  DataTableProvider,
  DataTablePagination,
  DataTableHeader,
  DataTableFooter,
  DataTableEmpty,
} from '@zenncore/web';
```

## Components

### DataTableProvider

Provides table state context.

```tsx
<DataTableProvider
  columns={columns}
  data={data}
  pageCount={10}
>
  {/* table components */}
</DataTableProvider>
```

### DataTable

The table component that renders columns and rows.

```tsx
<DataTable onRowClick={(row) => console.log(row)} />
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `onRowClick` | `(row: T) => void` | Row click handler |
| `className` | `string` | Table class |
| `classList` | `ClassList` | Style `header-cell`, `body-row`, `body-cell` |

### DataTablePagination

Renders pagination controls.

### DataTableHeader

Custom header slot.

### DataTableFooter

Custom footer slot.

### DataTableEmpty

Empty state slot.

---

## Examples

### Basic Data Table

```tsx
import { createColumnHelper } from '@tanstack/react-table';

type User = { _id: string; name: string; email: string };
const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('email', { header: 'Email' }),
];

<DataTableProvider columns={columns} data={users} pageCount={pageCount}>
  <DataTable />
  <DataTablePagination />
</DataTableProvider>
```

### With Row Click

```tsx
<DataTableProvider columns={columns} data={data}>
  <DataTable onRowClick={(row) => navigate(`/user/${row._id}`)} />
</DataTableProvider>
```

### Custom Header/Footer

```tsx
<DataTableProvider columns={columns} data={data}>
  <DataTableHeader>
    <TableRow><TableHead colSpan={2}>Custom Header</TableHead></TableRow>
  </DataTableHeader>
  <DataTable />
  <DataTableFooter>
    <TableRow><TableCell colSpan={2}>Showing {data.length} items</TableCell></TableRow>
  </DataTableFooter>
</DataTableProvider>
```

---

## Notes

- Built on `@tanstack/react-table` (v8)
- Uses `DataTableProvider` from `@zenncore/data-table`
- Flex rendering via `flexRender`
- Supports row selection and expansion
- Integrates with pagination components
