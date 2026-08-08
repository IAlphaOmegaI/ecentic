import { StatusPillSkeleton } from "../../../_components/chrome-skeletons";
import {
  AddProductsShell,
  BackLinkSkeleton,
  SourcesSkeleton,
} from "./_components/shell";

// The frame the page renders, with the placeholders it shows while the store
// status, the back link and the source list stream in.
export default () => (
  <AddProductsShell
    statusPill={<StatusPillSkeleton />}
    action={<BackLinkSkeleton />}
  >
    <SourcesSkeleton />
  </AddProductsShell>
);
