import {
  StatsSkeleton,
  StatusPillSkeleton,
} from "../../../_components/chrome-skeletons";
import {
  AddActionSkeleton,
  CompetitorsShell,
  InsightsSkeleton,
  LandscapeSkeleton,
  TableSkeleton,
} from "../_components/shell";

// The frame the page renders, with the placeholder each streamed section shows.
export default () => (
  <CompetitorsShell
    statusPill={<StatusPillSkeleton />}
    action={<AddActionSkeleton />}
    stats={<StatsSkeleton />}
    landscape={<LandscapeSkeleton />}
    table={<TableSkeleton />}
    insights={<InsightsSkeleton />}
  />
);
