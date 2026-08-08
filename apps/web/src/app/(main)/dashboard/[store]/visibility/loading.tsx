import { AuditSkeleton, VisibilityShell } from "./_components/shell";

// The frame the page renders, with the placeholders it shows while the
// readiness audit and the rank check run.
export default () => (
  <VisibilityShell audit={<AuditSkeleton />} rank={<AuditSkeleton />} />
);
