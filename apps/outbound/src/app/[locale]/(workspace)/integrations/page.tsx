import * as Claude from "@/server/app/outbound/claude-actions";
import * as Connections from "@/server/app/outbound/integrations";
import { Environment } from "@/server/utils/environment";
import { Integrations } from "../_components/integrations";
import { WorkspacePage } from "../_components/workspace";
export default function Page() {
  return (
    <WorkspacePage section="integrations">
      <IntegrationData />
    </WorkspacePage>
  );
}
const IntegrationData = async () => {
  const [status, claude] = await Promise.all([
    Connections.getStatus(Environment.SERVER),
    Claude.getStatus(Environment.SERVER),
  ]);
  return (
    <Integrations
      status={status.success ? status.data : null}
      inboxes={status.success ? status.data.inboxes : []}
      claude={claude.success ? claude.data : null}
    />
  );
};
