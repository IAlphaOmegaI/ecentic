import {
  ChartSkeleton,
  CompetitorTableSkeleton,
  StatsSkeleton,
  StatusPillSkeleton,
  TableSkeleton,
} from "../../_components/chrome-skeletons";
import { OverviewActionsSkeleton, OverviewShell } from "./_components/shell";

// The frame the page renders, with the placeholder each streamed region shows.
// Replaces a generic full-page skeleton, so a navigation now lands on the real
// heading and the real tab rail rather than an anonymous block of grey.
export default () => (
  <OverviewShell
    statusPill={<StatusPillSkeleton className="w-42" />}
    actions={<OverviewActionsSkeleton />}
    stats={<StatsSkeleton />}
    performance={<ChartSkeleton />}
    products={<TableSkeleton />}
    competitors={<CompetitorTableSkeleton />}
    agents={<TableSkeleton />}
  />
);
