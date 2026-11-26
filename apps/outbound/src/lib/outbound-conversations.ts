import { z } from "zod";

export const CONVERSATION_STAGES = [
  "open",
  "interested",
  "question",
  "later",
  "notInterested",
  "meetingBooked",
  "meetingHeld",
  "closed",
] as const;
export type ConversationStage = (typeof CONVERSATION_STAGES)[number];
export type ConversationChannel = "email" | "linkedin";
export const conversationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  q: z.string().trim().max(200).default(""),
  channel: z.enum(["all", "email", "linkedin"]).default("all"),
  stage: z.enum(["all", ...CONVERSATION_STAGES]).default("all"),
  archived: z.boolean().default(false),
  needsReply: z
    .preprocess(
      (value) => value === true || value === "1" || value === "true",
      z.boolean(),
    )
    .default(false),
});
export type ConversationQuery = z.input<typeof conversationQuerySchema>;
export type ConversationSummary = {
  id: string;
  prospectId: string;
  company: string;
  person: string;
  channel: ConversationChannel;
  subject: string;
  accountLabel: string;
  counterpart: string;
  stage: ConversationStage;
  needsReply: boolean;
  archivedAt: string | null;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  updatedAt: string;
  revision: number;
};
export type ConversationMessage = {
  conversationId: string;
  channel: ConversationChannel;
  id: string;
  direction: "inbound" | "outbound";
  bodyText: string;
  subject: string;
  from: string;
  to: string;
  sentAt: string;
  providerMessageId: string;
  isAutomated: boolean;
  truncated: boolean;
};
export type ConversationList = {
  items: (ConversationSummary & {
    channels: ConversationChannel[];
    threadCount: number;
    threadId: string;
  })[];
  total: number;
  page: number;
  pageSize: 25;
  needsReplyCount: number;
};
export type ConversationDetail = {
  threads: ConversationSummary[];
  meetingBookingUrl: string;
  thread: ConversationSummary;
  messages: ConversationMessage[];
  total: number;
  page: number;
  pageSize: 50;
  draft: {
    body: string;
    generatedAt: string | null;
    basedOnMessageId: string | null;
  };
  sendAttempts: {
    id: string;
    status: "starting" | "accepted" | "failed" | "uncertain";
    body: string;
    createdAt: string;
    error: string | null;
  }[];
};
export const conversationStageSchema = z.object({
  id: z.string().uuid(),
  stage: z.enum(CONVERSATION_STAGES),
  expectedRevision: z.number().int().nonnegative(),
});
export const conversationArchiveSchema = z.object({
  id: z.string().uuid(),
  archived: z.boolean(),
  expectedRevision: z.number().int().nonnegative(),
});
export const conversationDraftSchema = z.object({
  id: z.string().uuid(),
  body: z.string().trim().min(1).max(10000),
  expectedRevision: z.number().int().nonnegative(),
});
export const conversationSendSchema = z.object({
  id: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
});
export const conversationGenerateSchema = conversationSendSchema.extend({
  requestId: z.string().uuid(),
});
