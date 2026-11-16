import { HubShell, StoresSkeleton } from "../_components/hub-shell";

// Keep navigation on the same frame while the account and store data resolve.
export default () => <HubShell stores={<StoresSkeleton />} />;
