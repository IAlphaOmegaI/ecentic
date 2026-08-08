import { DiscoveryShell, DiscoverySkeleton } from "./_components/shell";

// The frame the page renders, with the placeholder it shows while the store
// resolves — so arriving by link looks like arriving by refresh.
export default () => (
  <DiscoveryShell>
    <DiscoverySkeleton />
  </DiscoveryShell>
);
