"use server";

import type { z } from "zod";
import type {
  ConversationQuery,
  conversationDraftSchema,
  conversationGenerateSchema,
  conversationSendSchema,
  conversationStageSchema,
} from "@/lib/outbound-conversations";
import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import * as Sending from "./conversation-send";
import * as Conversations from "./conversations";

export const listConversations = withAuthorization(
  [UserRole.STAFF],
  async (_, input: ConversationQuery = {}) => Conversations.list(input),
  "Outbound.listConversations",
);
export const getConversation = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { id: string; threadId?: string; page?: number }) =>
    Conversations.get(input),
  "Outbound.getConversation",
);
export const updateConversationStage = withAuthorization(
  [UserRole.STAFF],
  async ({ session }, input: z.infer<typeof conversationStageSchema>) =>
    Conversations.updateStage(session.user.id, input),
  "Outbound.updateConversationStage",
);
export const generateConversationReply = withAuthorization(
  [UserRole.STAFF],
  async ({ session }, input: z.infer<typeof conversationGenerateSchema>) =>
    Conversations.generateReply(session.user.id, input),
  "Outbound.generateConversationReply",
);
export const saveConversationReply = withAuthorization(
  [UserRole.STAFF],
  async ({ session }, input: z.infer<typeof conversationDraftSchema>) =>
    Conversations.saveDraft(session.user.id, input),
  "Outbound.saveConversationReply",
);
export const sendConversationReply = withAuthorization(
  [UserRole.STAFF],
  async ({ session }, input: z.infer<typeof conversationSendSchema>) =>
    Sending.send(session.user.id, input),
  "Outbound.sendConversationReply",
);
