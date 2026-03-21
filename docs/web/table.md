# Table

HTML table components for displaying data in rows and columns.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@zenncore/web';
```

## Components

### Table

Main table element.

### TableHeader

Table head container (`<thead>`).

### TableBody

Table body container (`<tbody>`).

### TableFooter

Table footer container (`<tfoot>`).

### TableRow

Table row (`<tr>`).

### TableHead

Header cell (`<th>`).

### TableCell

Data cell (`<td>`).

### TableCaption

Table caption.

---

## Examples

### Basic Table

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John</TableCell>
      <TableCell>john@example.com</TableCell>
    </TableRow>
    <TableRow>
      <TableCell>Jane</TableCell>
      <TableCell>jane@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### With Caption

```tsx
<Table>
  <TableCaption>User List</TableCaption>
  <TableHeader>
    {/* ... */}
  </TableHeader>
  <TableBody>
    {/* ... */}
  </TableBody>
</Table>
```

---

## Notes

- Uses Base UI's `useRender` for flexibility
- All components support `RenderComponentProps`
- Integrates with `DataTable` for enhanced functionality
