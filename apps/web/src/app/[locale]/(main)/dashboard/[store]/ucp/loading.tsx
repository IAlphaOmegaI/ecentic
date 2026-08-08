import { UcpSectionSkeleton, UcpShell } from "./_components/shell";

// The frame the page renders, with the placeholder it shows while the
// structured-data section streams in.
export default () => (
  <UcpShell>
    <UcpSectionSkeleton />
  </UcpShell>
);
