import { CampaignShell } from "./_components/shell";
import { CampaignTableSkeleton } from "./_components/skeletons";
export default function Loading() {
  return (
    <CampaignShell mode="list">
      <CampaignTableSkeleton />
    </CampaignShell>
  );
}
