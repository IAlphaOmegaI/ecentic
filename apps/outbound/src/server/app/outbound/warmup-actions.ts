"use server";

import type { WarmupPlan } from "@/lib/outbound-warmup";
import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import * as Warmup from "./warmup";

export const getWorkspace = withAuthorization(
  [UserRole.STAFF],
  async () => Warmup.getWorkspace(),
  "Outbound.warmupWorkspace",
);
export const checkMailbox = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { email: string; dkimSelectors: string[] }) =>
    Warmup.checkMailbox(context.session.user.id, input),
  "Outbound.checkMailboxReadiness",
);
export const savePlan = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { email: string; plan: WarmupPlan }) =>
    Warmup.savePlan(context.session.user.id, input),
  "Outbound.saveWarmupPlan",
);
