import {
  ResearchBrandSkeleton,
  ResearchComparisonSkeleton,
  ResearchDirectionsSkeleton,
  ResearchShell,
} from "./_components/shell";
export default () => (
  <ResearchShell>
    <ResearchComparisonSkeleton />
    <ResearchBrandSkeleton />
    <ResearchDirectionsSkeleton />
  </ResearchShell>
);
