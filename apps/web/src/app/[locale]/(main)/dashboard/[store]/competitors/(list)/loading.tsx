import {
  AddActionSkeleton,
  CompetitorSummarySkeleton,
  CompetitorsShell,
  LandscapeSkeleton,
  TableSkeleton,
} from "../_components/shell";
export default () => (
  <CompetitorsShell
    action={<AddActionSkeleton />}
    stats={<CompetitorSummarySkeleton />}
    landscape={<LandscapeSkeleton />}
    table={<TableSkeleton />}
  />
);
