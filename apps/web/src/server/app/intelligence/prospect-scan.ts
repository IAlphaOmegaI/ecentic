"use server";

import { UserRole } from "@/server/database/validators";
import * as AI from "../../utils/ai";
import { withAuthorization } from "../../utils/authorization";
import * as Discovery from "./discovery-run";
import { type ProspectEvent, scanProspect } from "./prospect";

/**
 * The call-sheet scan, gated on ecentic staff.
 *
 * The gate is on the action and not only on the route: `proxy.ts` guards page
 * requests, but a server action is reachable by POST from anywhere its module
 * is bundled, so the route gate alone would not hold it.
 */
export const runProspectScan = withAuthorization(
  [UserRole.STAFF],
  async (_context, { store }: { store: string }) => {
    const stream = AI.streamable<ProspectEvent>(async (update) => {
      await scanProspect({ store }, update);
    });

    return { success: true as const, data: { output: stream.output } };
  },
  "Prospect.runProspectScan",
);

/**
 * The AI-shelf run: which stores four models name for a shopper's query, and
 * where this prospect lands. Reproducible on the call, but a model's opinion
 * rather than something the prospect can check in their page source — the page
 * labels it that way and never counts it among the verified findings.
 *
 * Separate from the scan on purpose: the scan is pure HTTP and lands in
 * seconds, this is four models per query and takes far longer. Nothing fast
 * should wait on it.
 */
export const runAgentShelf = withAuthorization(
  [UserRole.STAFF],
  async (_context, input: { targetStore: string; queries: string[] }) =>
    Discovery.executeDiscovery(input),
  "Prospect.runAgentShelf",
);
