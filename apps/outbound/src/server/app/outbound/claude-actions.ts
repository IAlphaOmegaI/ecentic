"use server";

import type { ClaudeModel } from "@/lib/outbound-claude";
import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import * as Claude from "./claude";

export const getStatus = withAuthorization(
  [UserRole.STAFF],
  async (_) => Claude.getStatus(),
  "Outbound.getClaudeStatus",
);
export const saveKey = withAuthorization(
  [UserRole.STAFF],
  async (
    context,
    input: { apiKey: string; model?: ClaudeModel; workspaceId?: string },
  ) => Claude.saveKey(context.session.user.id, input),
  "Outbound.saveClaudeKey",
);
export const generate = withAuthorization(
  [UserRole.STAFF],
  async (context, input: Claude.GenerateInput) =>
    Claude.generate(context.session.user.id, input),
  "Outbound.generateClaudeCriteria",
);
export const getGeneration = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { requestId: string }) => Claude.getGeneration(input),
  "Outbound.getClaudeGeneration",
);
