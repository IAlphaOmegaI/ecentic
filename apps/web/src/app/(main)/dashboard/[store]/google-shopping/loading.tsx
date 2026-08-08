import {
  GoogleShoppingShell,
  ManagerSkeleton,
  SectionBox,
} from "./_components/shell";

// The same frame the page renders, with the same manager placeholder it shows
// while the status read streams in — so arriving by link looks like a refresh.
export default () => (
  <GoogleShoppingShell>
    <SectionBox>
      <ManagerSkeleton />
    </SectionBox>
  </GoogleShoppingShell>
);
