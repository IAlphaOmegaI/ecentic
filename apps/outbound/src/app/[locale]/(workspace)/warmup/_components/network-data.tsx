import * as Network from "@/server/app/outbound/warmbly-actions";
import * as Warmup from "@/server/app/outbound/warmup-actions";
import { Environment } from "@/server/utils/environment";
import { WarmblyNetworkPanel } from "./network";

export const WarmblyNetworkData = async () => {
  const [network, workspace] = await Promise.all([
    Network.getNetwork(Environment.SERVER),
    Warmup.getWorkspace(Environment.SERVER),
  ]);
  return (
    <WarmblyNetworkPanel
      initial={network.success ? network.data : null}
      mailboxes={workspace.success ? workspace.data.mailboxes : []}
      failed={!network.success}
    />
  );
};

export const WarmblyNetworkSkeleton = () => (
  <div
    aria-hidden
    className="space-y-4 border-accent-foreground border-b px-4 py-6 motion-safe:animate-pulse sm:px-6"
  >
    <div className="h-6 w-64 rounded-sm bg-accent-foreground/40" />
    <div className="h-4 w-3/4 rounded-sm bg-accent-foreground/40" />
    <div className="h-10 w-48 rounded-sm bg-accent-foreground/40" />
  </div>
);
