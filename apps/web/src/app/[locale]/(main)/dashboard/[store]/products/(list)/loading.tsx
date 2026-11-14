import {
  AddActionSkeleton,
  ProductsShell,
  StatsSkeleton,
  TableSkeleton,
} from "../_components/shell";

export default () => (
  <ProductsShell
    action={<AddActionSkeleton />}
    stats={<StatsSkeleton />}
    table={<TableSkeleton />}
  />
);
