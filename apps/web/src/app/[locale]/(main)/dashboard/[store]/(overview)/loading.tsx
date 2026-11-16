import {
  OverviewPerformanceSkeleton,
  OverviewRecentScansSkeleton,
} from "./_components/performance-skeleton";
import {
  OverviewActionsSkeleton,
  OverviewShell,
  OverviewUpdatedSkeleton,
} from "./_components/shell";
import { OverviewSummarySkeleton } from "./_components/summary-skeleton";
import { OverviewTrafficSkeleton } from "./_components/traffic-summary";

// The frame the page renders, with the placeholder each streamed region shows.
// Replaces a generic full-page skeleton, so a navigation now lands on the real
// heading and the real tab rail rather than an anonymous block of grey.
export default () => (
  <OverviewShell
    statusPill={<OverviewUpdatedSkeleton />}
    actions={<OverviewActionsSkeleton />}
    stats={<OverviewSummarySkeleton />}
    performance={<OverviewPerformanceSkeleton />}
    traffic={<OverviewTrafficSkeleton />}
    recent={<OverviewRecentScansSkeleton />}
  />
);
