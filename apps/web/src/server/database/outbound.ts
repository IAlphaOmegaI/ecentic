// Retained for shared database migration ownership. The standalone app owns
// the typed runtime model in apps/outbound/src/server/database/outbound.ts.
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { encryptedText } from "./encrypted-text";

export const outboundProviderCredential = pgTable(
  "outbound_provider_credential",
  {
    provider: text("provider")
      .$type<"unipile" | "apollo" | "clay" | "google" | "warmbly" | "claude">()
      .primaryKey(),
    apiKey: encryptedText(
      "api_key",
      "outbound_provider_credential.apiKey",
    ).notNull(),
    configuration: jsonb("configuration")
      .$type<{ routineId?: string; clientId?: string; model?: "claude-sonnet-5-5" | "claude-opus-5-5"; workspaceId?: string }>()
      .notNull()
      .default({}),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    validatedAt: timestamp("validated_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
);

export const outboundLinkedinAccount = pgTable("outbound_linkedin_account", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  providerUserId: text("provider_user_id").notNull(),
  status: text("status")
    .$type<"running" | "errored" | "disconnected" | "degraded" | "partial">()
    .notNull(),
  isLocked: boolean("is_locked").notNull().default(false),
  connectedBy: text("connected_by").notNull(),
  lastCheckedAt: timestamp("last_checked_at", { mode: "date" })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const outboundPlaybook = pgTable("outbound_playbook", {
  id: text("id").primaryKey(),
  settings: jsonb("settings").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedBy: text("updated_by").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const outboundCampaign = pgTable("outbound_campaign", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  status: text("status").$type<"draft" | "active" | "paused" | "archived">().notNull().default("draft"),
  criteria: jsonb("criteria").notNull(),
  revision: integer("revision").notNull().default(1),
  answers: text("answers").notNull().default(""),
  discoveryState: jsonb("discovery_state").notNull().default({ apolloPage: 1, apolloExhausted: false, claySearchId: null, clayExhausted: false }),
  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => [index("outbound_campaign_status_idx").on(table.status)]);

export const outboundCompany = pgTable("outbound_company", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  domain: text("domain").notNull().unique(),
  name: text("name").notNull(),
  website: text("website").notNull(),
  country: text("country").notNull(),
  relationship: text("relationship").notNull().default("cold"),
  source: text("source").notNull(),
  lastContactedAt: timestamp("last_contacted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const outboundPerson = pgTable(
  "outbound_person",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    companyId: text("company_id")
      .notNull()
      .references(() => outboundCompany.id),
    identityKey: text("identity_key").notNull().unique(),
    name: text("name").notNull(),
    email: text("email").notNull().default(""),
    linkedinUrl: text("linkedin_url").notNull().default(""),
    title: text("title").notNull().default(""),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("outbound_person_company_idx").on(table.companyId),
    index("outbound_person_email_idx").on(table.email),
  ],
);

export const outboundProspect = pgTable(
  "outbound_prospect",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    campaignId: text("campaign_id").references(() => outboundCampaign.id),
    companyId: text("company_id")
      .notNull()
      .unique()
      .references(() => outboundCompany.id),
    personId: text("person_id")
      .notNull()
      .references(() => outboundPerson.id),
    details: jsonb("details").notNull(),
    status: text("status").notNull().default("candidate"),
    messages: jsonb("messages").notNull().default([]),
    revision: integer("revision").notNull().default(0),
    playbookRevision: integer("playbook_revision").notNull().default(0),
    approvedAt: timestamp("approved_at", { mode: "date" }),
    approvedBy: text("approved_by"),
    approvalHash: text("approval_hash"),
    holdReason: text("hold_reason").notNull().default(""),
    linkedinStatus: text("linkedin_status").notNull().default("research"),
    linkedinDraft: text("linkedin_draft").notNull().default(""),
    linkedinNextActionAt: timestamp("linkedin_next_action_at", {
      mode: "date",
    }),
    linkedinNote: text("linkedin_note").notNull().default(""),
    firstSentAt: timestamp("first_sent_at", { mode: "date" }),
    lastSentAt: timestamp("last_sent_at", { mode: "date" }),
    nextSendAt: timestamp("next_send_at", { mode: "date" }),
    sentStep: integer("sent_step").notNull().default(0),
    inboxId: text("inbox_id"),
    threadId: text("thread_id"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("outbound_prospect_campaign_idx").on(table.campaignId),
    index("outbound_prospect_status_idx").on(table.status),
    index("outbound_prospect_due_idx").on(table.nextSendAt),
  ],
);

export const outboundCampaignCompany = pgTable("outbound_campaign_company", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  campaignId: text("campaign_id").notNull().references(() => outboundCampaign.id),
  domain: text("domain").notNull(),
  name: text("name").notNull(),
  website: text("website").notNull(),
  country: text("country"),
  platform: text("platform").$type<"shopify" | "woocommerce" | null>(),
  teamSize: integer("team_size"),
  annualRevenue: bigint("annual_revenue", {mode: "number"}),
  source: text("source").$type<"apollo" | "clay">().notNull(),
  sourceId: text("source_id"),
  sourcePayload: jsonb("source_payload").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").$type<"candidate" | "added" | "excluded">().notNull().default("candidate"),
  reason: text("reason").notNull().default(""),
  prospectId: text("prospect_id").references(() => outboundProspect.id),
  criteriaRevision: integer("criteria_revision").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("outbound_campaign_company_domain_unique").on(table.campaignId, table.domain),
  index("outbound_campaign_company_queue_idx").on(table.campaignId, table.status),
  index("outbound_campaign_company_domain_idx").on(table.domain),
]);

export const outboundCampaignRun = pgTable("outbound_campaign_run", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  campaignId: text("campaign_id").notNull().references(() => outboundCampaign.id),
  requestId: text("request_id").notNull().unique(),
  provider: text("provider").$type<"apollo" | "clay">().notNull(),
  operation: text("operation").$type<"apolloPage" | "clayStart" | "clayPage">().notNull(),
  status: text("status").$type<"starting" | "completed" | "failed" | "uncertain">().notNull().default("starting"),
  criteriaRevision: integer("criteria_revision").notNull(),
  criteria: jsonb("criteria").notNull(),
  cursor: jsonb("cursor").$type<Record<string, unknown>>().notNull(),
  output: jsonb("output").$type<Record<string, unknown>>(),
  companyCount: integer("company_count").notNull().default(0),
  error: text("error"),
  createdBy: text("created_by").notNull(),
  startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { mode: "date" }),
}, (table) => [
  index("outbound_campaign_run_recent_idx").on(table.campaignId, table.startedAt),
  uniqueIndex("outbound_campaign_run_open_unique").on(table.campaignId).where(sql`${table.status} in ('starting', 'uncertain')`),
]);

export const outboundRevision = pgTable(
  "outbound_revision",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    prospectId: text("prospect_id")
      .notNull()
      .references(() => outboundProspect.id),
    revision: integer("revision").notNull(),
    messages: jsonb("messages").notNull(),
    manifest: jsonb("manifest")
      .$type<{
        recipient: string;
        sender: string;
        fromName: string;
        signature: string;
        postalAddress: string;
        playbookRevision: number;
        evidence: string;
        evidenceCheckedAt: string;
      }>()
      .notNull(),
    contentHash: text("content_hash").notNull(),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { mode: "date" }),
    revokedAt: timestamp("revoked_at", { mode: "date" }),
    revokeReason: text("revoke_reason"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("outbound_revision_prospect_revision_uidx").on(
      table.prospectId,
      table.revision,
    ),
  ],
);

export const outboundEvent = pgTable(
  "outbound_event",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    prospectId: text("prospect_id").references(() => outboundProspect.id),
    kind: text("kind").notNull(),
    detail: text("detail").notNull(),
    actor: text("actor").notNull(),
    externalId: text("external_id").unique(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("outbound_event_prospect_idx").on(table.prospectId)],
);

export const outboundSuppression = pgTable(
  "outbound_suppression",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    scope: text("scope").$type<"email" | "domain">().notNull(),
    value: text("value").notNull(),
    reason: text("reason").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("outbound_suppression_scope_value_uidx").on(
      table.scope,
      table.value,
    ),
  ],
);

export const outboundInbox = pgTable("outbound_inbox", {
  transport: text("transport")
    .$type<"gmail-oauth" | "google-app-password">()
    .notNull()
    .default("gmail-oauth"),
  connectionVersion: integer("connection_version").notNull().default(0),
  appPassword: encryptedText("app_password", "outbound_inbox.appPassword"),
  mailboxCheckpoint: jsonb("mailbox_checkpoint").$type<unknown>(),
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  email: text("email").notNull().unique(),
  fromName: text("from_name").notNull(),
  signer: text("signer").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  dailyCap: integer("daily_cap").notNull().default(15),
  refreshToken: encryptedText("refresh_token", "outbound_inbox.refreshToken"),
  accessToken: encryptedText("access_token", "outbound_inbox.accessToken"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date" }),
  historyId: text("history_id"),
  syncPageToken: text("sync_page_token"),
  syncStartHistoryId: text("sync_start_history_id"),
  syncMode: text("sync_mode").$type<"history" | "full">(),
  lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
  nextSendAt: timestamp("next_send_at", { mode: "date" }),
  error: text("error"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const outboundSendAttempt = pgTable(
  "outbound_send_attempt",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    prospectId: text("prospect_id")
      .notNull()
      .references(() => outboundProspect.id),
    inboxId: text("inbox_id")
      .notNull()
      .references(() => outboundInbox.id),
    step: integer("step").notNull(),
    revision: integer("revision").notNull(),
    messageId: text("message_id").notNull().unique(),
    providerMessageId: text("provider_message_id"),
    status: text("status")
      .$type<"claimed" | "accepted" | "failed" | "uncertain">()
      .notNull(),
    contentHash: text("content_hash").notNull(),
    error: text("error"),
    test: boolean("test").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { mode: "date" }),
  },
  (table) => [
    uniqueIndex("outbound_attempt_prospect_step_uidx").on(
      table.prospectId,
      table.step,
    ),
    index("outbound_attempt_inbox_created_idx").on(
      table.inboxId,
      table.createdAt,
    ),
  ],
);

export const outboundIntegrationJob = pgTable("outbound_integration_job", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  provider: text("provider").$type<"apollo" | "clay" | "warmbly" | "claude" | "automation" | "linkedin" | "conversation">().notNull(),
  prospectId: text("prospect_id").references(() => outboundProspect.id),
  requestId: text("request_id").unique(),
  status: text("status")
    .$type<"starting" | "pending" | "complete" | "failed" | "uncertain">()
    .notNull(),
  input: jsonb("input").$type<Record<string, unknown>>().notNull(),
  output: jsonb("output").$type<Record<string, unknown>>(),
  error: text("error"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const outboundMailboxReadiness = pgTable("outbound_mailbox_readiness", {
  id: text("email").primaryKey(),
  plan: jsonb("plan").$type<Record<string, unknown>>().notNull(),
  lastCheck: jsonb("last_check").$type<Record<string, unknown>>(),
  dkimSelectors: jsonb("dkim_selectors").$type<string[]>().notNull().default([]),
  checkedAt: timestamp("checked_at", { mode: "date" }),
  updatedBy: text("updated_by").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});


export const outboundConversation = pgTable("outbound_conversation", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  prospectId: text("prospect_id").notNull().references(() => outboundProspect.id),
  channel: text("channel").$type<"email" | "linkedin">().notNull(),
  accountId: text("account_id").notNull(),
  accountLabel: text("account_label").notNull(),
  providerThreadId: text("provider_thread_id").notNull(),
  counterpart: text("counterpart").notNull(),
  subject: text("subject").notNull().default(""),
  stage: text("stage").$type<"open" | "interested" | "question" | "later" | "notInterested" | "meetingBooked" | "meetingHeld" | "closed">().notNull().default("open"),
  needsReply: boolean("needs_reply").notNull().default(false),
  revision: integer("revision").notNull().default(0),
  draftBody: text("draft_body").notNull().default(""),
  draftGeneratedAt: timestamp("draft_generated_at", { mode: "date" }),
  draftBasedOnMessageId: text("draft_based_on_message_id"),
  lastInboundAt: timestamp("last_inbound_at", { mode: "date" }),
  lastOutboundAt: timestamp("last_outbound_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("outbound_conversation_provider_uidx").on(table.channel, table.accountId, table.providerThreadId),
  index("outbound_conversation_attention_idx").on(table.needsReply, table.updatedAt),
  index("outbound_conversation_prospect_idx").on(table.prospectId),
]);

export const outboundConversationMessage = pgTable("outbound_conversation_message", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  conversationId: text("conversation_id").notNull().references(() => outboundConversation.id),
  providerMessageId: text("provider_message_id").notNull(),
  direction: text("direction").$type<"inbound" | "outbound">().notNull(),
  bodyText: text("body_text").notNull(),
  subject: text("subject").notNull().default(""),
  from: text("from_address").notNull(),
  to: text("to_address").notNull(),
  rfcMessageId: text("rfc_message_id"),
  isAutomated: boolean("is_automated").notNull().default(false),
  truncated: boolean("truncated").notNull().default(false),
  sentAt: timestamp("sent_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("outbound_conversation_message_provider_uidx").on(table.conversationId, table.providerMessageId),
  index("outbound_conversation_message_thread_idx").on(table.conversationId, table.sentAt),
]);

export const outboundConversationSend = pgTable("outbound_conversation_send", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  conversationId: text("conversation_id").notNull().references(() => outboundConversation.id),
  revision: integer("revision").notNull(),
  status: text("status").$type<"starting" | "accepted" | "failed" | "uncertain">().notNull(),
  input: jsonb("input").$type<Record<string, unknown>>().notNull(),
  providerMessageId: text("provider_message_id"),
  error: text("error"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { mode: "date" }),
}, (table) => [uniqueIndex("outbound_conversation_send_revision_uidx").on(table.conversationId, table.revision)]);
