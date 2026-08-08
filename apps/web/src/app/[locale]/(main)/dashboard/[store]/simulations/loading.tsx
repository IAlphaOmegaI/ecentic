import { StatusPillSkeleton } from "../../_components/chrome-skeletons";
import { SimulationsShell, SimulationsSkeleton } from "./_components/shell";

// The frame the page renders, with the placeholders it shows while the latest
// scan and the roster stream in.
export default () => (
  <SimulationsShell statusPill={<StatusPillSkeleton />}>
    <SimulationsSkeleton />
  </SimulationsShell>
);
