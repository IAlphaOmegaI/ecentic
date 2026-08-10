import {
  QualityShell,
  RowsSkeleton,
  SummarySkeleton,
} from "./_components/shell";

// The frame the page renders, with the placeholders shown while the rule
// registry runs over the catalog.
export default () => (
  <QualityShell
    summary={<SummarySkeleton />}
    issues={<RowsSkeleton />}
    products={<RowsSkeleton />}
  />
);
