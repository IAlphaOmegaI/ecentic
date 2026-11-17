import { WarmupShell } from "../_components/shell";
import { WarmupSkeleton } from "../_components/skeletons";
export default function Loading() {
  return (
    <WarmupShell detail>
      <WarmupSkeleton />
    </WarmupShell>
  );
}
