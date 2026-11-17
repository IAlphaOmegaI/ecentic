"use server";

import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import * as Automation from "./automation";

export const getStatus = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { campaignId?: string } = {}) => Automation.getStatus(input),
  "Outbound.getAutomationStatus",
);
export const run = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { campaignId?: string } = {}) =>
    Automation.run({ campaignId: input.campaignId, maxSteps: 3 }),
  "Outbound.runAutomation",
);
