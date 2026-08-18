"use server";

import { withAuthentication } from "@/server/utils/authentication";
import { Environment } from "@/server/utils/environment";
import { type DiscoveryInput, executeDiscovery } from "./discovery-run";

export type {
  DiscoveryInput,
  DiscoveryModelResult,
  DiscoveryQueryResult,
  DiscoveryRunResult,
  DiscoveryStore,
} from "./discovery-run";

/**
 * Session-guarded entry point for the `/dev/discovery` UI. The engine lives in
 * `discovery-run.ts` so the headless endpoint can run the same discovery behind
 * its own access-code check instead of a session.
 */
export const runDiscovery = withAuthentication(
  async (_context, input: DiscoveryInput) =>
    executeDiscovery(Environment.SERVER, input),
  "Discovery.runDiscovery",
);
