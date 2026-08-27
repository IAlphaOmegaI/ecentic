import {
  AgenticShell,
  ChecksSkeleton,
  CompetitorsSkeleton,
  MethodologySkeleton,
  ScanSkeleton,
  ScoreSkeleton,
} from "./_components/shell";

// The frame the page renders, with the placeholders it shows while the stored
// scan and its checks load.
export default () => (
  <AgenticShell
    scan={<ScanSkeleton />}
    score={<ScoreSkeleton />}
    competitors={<CompetitorsSkeleton />}
    checks={<ChecksSkeleton />}
    methodology={<MethodologySkeleton />}
  />
);
