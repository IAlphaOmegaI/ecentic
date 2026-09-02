import { CallSheetShell, CallSheetSkeleton } from "./_components/shell";

// The frame the page renders, with placeholders in the shapes the inputs and
// the two columns take, so navigation lands without a jump.
export default () => (
  <CallSheetShell>
    <CallSheetSkeleton />
  </CallSheetShell>
);
