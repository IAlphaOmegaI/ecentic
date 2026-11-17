import { CampaignCreate } from "../_components/editor";
import { CampaignShell } from "../_components/shell";
export default function Page() {
  return (
    <CampaignShell mode="new">
      <CampaignCreate />
    </CampaignShell>
  );
}
