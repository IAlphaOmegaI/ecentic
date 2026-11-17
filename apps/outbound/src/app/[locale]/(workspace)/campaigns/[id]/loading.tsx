import { CampaignShell } from "../_components/shell";
import { CampaignDetailSkeleton } from "../_components/skeletons";
export default function Loading() {
  return (
    <CampaignShell mode="detail">
      <CampaignDetailSkeleton />
    </CampaignShell>
  );
}
