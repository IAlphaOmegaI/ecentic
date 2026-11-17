import { CampaignShell } from "../_components/shell";
import { CampaignFormSkeleton } from "../_components/skeletons";
export default function Loading() {
  return (
    <CampaignShell mode="new">
      <CampaignFormSkeleton />
    </CampaignShell>
  );
}
