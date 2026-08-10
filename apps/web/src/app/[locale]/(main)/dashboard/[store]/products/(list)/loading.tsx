import { StatusPillSkeleton } from "../../../_components/chrome-skeletons";
import {
  AddActionSkeleton,
  ChartSkeleton,
  FiltersSkeleton,
  InsightsSkeleton,
  ProductsShell,
  StatsSkeleton,
  TableSkeleton,
  TrafficSkeleton,
} from "../_components/shell";

// The frame the page renders, with the placeholder each streamed section shows.
export default () => (
  <ProductsShell
    statusPill={<StatusPillSkeleton />}
    action={<AddActionSkeleton />}
    stats={<StatsSkeleton />}
    performance={<ChartSkeleton />}
    table={
      <div>
        <FiltersSkeleton />
        <TableSkeleton />
      </div>
    }
    traffic={<TrafficSkeleton />}
    insights={<InsightsSkeleton />}
  />
);
