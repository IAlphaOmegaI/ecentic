"use server";
import type { ActivityQuery } from "@/lib/outbound-conversation-activity";
import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import * as Activity from "./conversation-activity";
export const listActivity = withAuthorization(
  [UserRole.STAFF],
  async (_, input: ActivityQuery) => Activity.list(input),
  "Outbound.getConversationActivity",
);
