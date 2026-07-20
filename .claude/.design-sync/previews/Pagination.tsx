import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@zenncore/web";

// A page navigator for the product-catalog list. PaginationItem renders as a
// button-styled <li>; isActive paints the current page in primary.
export const Pages = () => (
  <div style={{ width: 360 }}>
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationLink>Prev</PaginationLink>
        </PaginationItem>
        <PaginationItem>1</PaginationItem>
        <PaginationItem isActive>2</PaginationItem>
        <PaginationItem>3</PaginationItem>
        <PaginationItem>4</PaginationItem>
        <PaginationItem>
          <PaginationLink>Next</PaginationLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  </div>
);

export const FirstPageActive = () => (
  <div style={{ width: 320 }}>
    <Pagination>
      <PaginationContent>
        <PaginationItem isActive>1</PaginationItem>
        <PaginationItem>2</PaginationItem>
        <PaginationItem>3</PaginationItem>
      </PaginationContent>
    </Pagination>
  </div>
);
