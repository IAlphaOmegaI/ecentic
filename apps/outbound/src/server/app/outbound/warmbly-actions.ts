"use server";

import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import * as Warmbly from "./warmbly-control";

export const saveKey = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { apiKey: string }) =>
    Warmbly.saveKey(context.session.user.id, input),
  "Outbound.saveWarmblyKey",
);
export const getNetwork = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { cursor?: string } = {}) => Warmbly.getNetwork(input),
  "Outbound.getWarmblyNetwork",
);
export const control = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { id: string; action: Warmbly.Action }) =>
    Warmbly.control(context.session.user.id, input),
  "Outbound.controlWarmbly",
);
