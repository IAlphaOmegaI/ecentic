# Pagination

A set of page numbers for navigating through paged content.

## Installation

```bash
bun add @zenncore/web
```

## Usage

```tsx
import { Pagination, PaginationContent, PaginationItem } from '@zenncore/web';
```

## Components

### Pagination

The root nav element.

### PaginationContent

UL container for items.

### PaginationItem

Individual page button (li).

### PaginationLink

The actual link/button.

```tsx
<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationLink href="?page=1">1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="?page=2" isActive>2</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="?page=3">3</PaginationLink>
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

---

## Examples

### Basic Pagination

```tsx
const [page, setPage] = useState(1);

<Pagination>
  <PaginationContent>
    {Array.from({ length: 5 }, (_, i) => (
      <PaginationItem key={i + 1}>
        <PaginationLink
          href={`?page=${i + 1}`}
          isActive={page === i + 1}
          onClick={(e) => {
            e.preventDefault();
            setPage(i + 1);
          }}
        >
          {i + 1}
        </PaginationLink>
      </PaginationItem>
    ))}
  </PaginationContent>
</Pagination>
```

---

## Notes

- Uses `buttonVariants` for styling
- `PaginationLink` accepts `isActive` prop
- Integrates with `DataTablePagination` for data tables
