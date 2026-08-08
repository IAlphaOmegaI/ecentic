import { PlaygroundShell, PlaygroundSkeleton } from "./_components/shell";

// The frame the page renders, with the placeholder it shows while the
// connection status streams in.
export default () => (
  <PlaygroundShell>
    <PlaygroundSkeleton />
  </PlaygroundShell>
);
