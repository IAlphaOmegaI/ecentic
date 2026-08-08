import { StatusPillSkeleton } from "../../../_components/chrome-skeletons";
import {
  AddCompetitorsShell,
  BackLinkSkeleton,
  SourcesSkeleton,
} from "./_components/shell";

// The frame the page renders, with the placeholders it shows while the store
// status, the back link and the source list stream in.
export default () => (
  <AddCompetitorsShell
    statusPill={<StatusPillSkeleton />}
    action={<BackLinkSkeleton />}
  >
    <SourcesSkeleton />
  </AddCompetitorsShell>
);
