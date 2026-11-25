import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  setSystemTime,
  test,
} from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";
import { IntegrationError } from "@/server/utils/outbound/http";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
const now = new Date("2026-11-16T17:00:00.000Z");
const modules: {
  database?: typeof import("@/server/database");
  store?: typeof import("@/server/app/outbound/store");
  campaigns?: typeof import("@/server/app/outbound/campaigns");
  linkedin?: typeof import("@/server/app/outbound/linkedin-automation");
  ledger?: typeof import("@/server/utils/outbound/linkedin-ledger");
} = {};
const active = () => {
  if (
    !modules.database ||
    !modules.store ||
    !modules.campaigns ||
    !modules.linkedin ||
    !modules.ledger
  )
    throw new Error("Fixture not loaded");
  return {
    ...modules.database,
    store: modules.store,
    campaigns: modules.campaigns,
    linkedin: modules.linkedin,
    ledger: modules.ledger,
  };
};
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const settings = {
  ...defaultPlaybook,
  automationEnabled: true,
  linkedinAutomationEnabled: true,
  linkedinAccountId: "acc_fixture",
  senderConfirmed: true,
  historyConfirmed: true,
  competingSendersPaused: true,
  senderTested: true,
};
const fixture = { prospectId: "", companyId: "", campaignId: "", sourceId: "" };
const provider = () => ({
  getAccount: mock(async () => ({
    success: true as const,
    data: {
      object: "Account" as const,
      id: "acc_fixture",
      user_id: "account_user",
      created_at: now.toISOString(),
      application_id: "application_fixture",
      provider: "linkedin" as const,
      status: "running" as const,
      is_locked: false,
      metadata: {},
    },
  })),
  resolveUser: mock(async () => ({
    success: true as const,
    data: {
      object: "UserProfile" as const,
      id: "recipient_fixture",
      type: "individual" as const,
      display_name: "Jane Smith",
      public_identifier: "jane-fixture",
      profile_url: "https://www.linkedin.com/in/jane-fixture",
      provider: "linkedin" as const,
      is_blocked: false,
      specifics: {
        network_distance: "SECOND_DEGREE" as "FIRST_DEGREE" | "SECOND_DEGREE",
      },
    },
  })),
  getUserChats: mock(async () => ({
    success: true as const,
    data: { object: "ChatLookup" as const, data: [] as { chat_id: string }[] },
  })),
  getChatMessages: mock(async () => ({
    success: true as const,
    data: {
      data: [] as import("@/server/utils/outbound/unipile").ChatMessage[],
    },
  })),
  sendInvitation: mock(async () => ({
    success: true as const,
    data: {
      object: "RelationRequest" as const,
      id: "invitation_fixture",
      type: "sent" as const,
    },
  })),
  startChat: mock(async () => ({
    success: true as const,
    data: {
      object: "ChatStarted" as const,
      chat_id: "chat_fixture",
      message_id: "message_fixture" as string | null,
    },
  })),
  sendMessage: mock(async () => ({
    success: true as const,
    data: {
      object: "MessageSent" as const,
      message_id: "message_fixture" as string | null,
    },
  })),
});
const rows = async () =>
  active()
    .db.select()
    .from(active().schema.outboundIntegrationJob)
    .where(eq(active().schema.outboundIntegrationJob.provider, "linkedin"));
const resetDue = async () =>
  active()
    .db.update(active().schema.outboundProspect)
    .set({ linkedinNextActionAt: null })
    .where(eq(active().schema.outboundProspect.id, fixture.prospectId));
const create = async () => {
  const { db, schema, store, campaigns } = active();
  value(await store.savePlaybook("fixture", settings));
  const campaign = value(
    await campaigns.create("fixture", { name: "LinkedIn fixture" }),
  );
  value(
    await campaigns.update("fixture", {
      id: campaign.id,
      name: "LinkedIn fixture",
      status: "active",
      expectedRevision: 1,
    }),
  );
  const companyId = randomUUID();
  const personId = randomUUID();
  const prospectId = randomUUID();
  const sourceId = randomUUID();
  const details = prospectSchema.parse({
    company: "Sample Goods",
    domain: "samplegoods.com",
    website: "https://samplegoods.com",
    country: "US",
    platform: "shopify",
    name: "Jane Smith",
    first: "Jane",
    title: "Head of Growth",
    email: "",
    linkedinUrl: "https://www.linkedin.com/in/jane-fixture",
    roleSource: "https://app.apollo.io/people/person_fixture",
    roleCheckedAt: now.toISOString(),
    timezone: "America/New_York",
    product: "Linen tote",
    productUrl: "https://samplegoods.com/products/tote",
    gap: "product-published-data",
    finding: "your product page lists Linen tote",
    productInsight: {
      sourceUrl: "https://samplegoods.com/products/tote",
      sourceQuote: "Made from durable woven linen for everyday carrying.",
      feature: "durable woven linen",
      kind: "material",
      relevance:
        "Material is useful for a shopper comparing everyday tote bags.",
    },
    evidence: "Observed named own-brand product and USD 25 offer.",
    evidenceCheckedAt: now.toISOString(),
    legitEvidence: "Established consumer product brand.",
    automationEvidenceId: sourceId,
  });
  await db.insert(schema.outboundCompany).values({
    id: companyId,
    domain: details.domain,
    name: details.company,
    website: details.website,
    country: details.country,
    source: "fixture",
  });
  await db.insert(schema.outboundPerson).values({
    id: personId,
    companyId,
    identityKey: "linkedin:fixture",
    name: details.name,
    linkedinUrl: details.linkedinUrl,
  });
  const policy = await store.policy();
  await db.insert(schema.outboundProspect).values({
    id: prospectId,
    companyId,
    personId,
    campaignId: campaign.id,
    details,
    revision: 0,
    playbookRevision: policy.revision,
    createdBy: "fixture",
  });
  await db.insert(schema.outboundCampaignCompany).values({
    campaignId: campaign.id,
    domain: details.domain,
    name: details.company,
    website: details.website,
    country: details.country,
    platform: "shopify",
    source: "apollo",
    status: "added",
    prospectId,
    criteriaRevision: 1,
  });
  await db.insert(schema.outboundIntegrationJob).values({
    id: sourceId,
    provider: "automation",
    prospectId,
    status: "pending",
    requestId: "automatic-fixture",
    input: {
      operation: "campaignAutomation",
      campaignId: campaign.id,
      campaignRevision: 1,
      playbookRevision: policy.revision,
    },
    output: {
      stage: "verify",
      prospectId,
      prospectRevision: 0,
      qualification: { status: "qualified", details },
      selection: {
        status: "selected",
        provisional: false,
        person: {
          name: details.name,
          first: details.first,
          title: details.title,
          email: details.email,
          domain: details.domain,
          linkedinUrl: details.linkedinUrl,
        },
        details,
      },
    },
  });
  await db.insert(schema.outboundLinkedinAccount).values({
    id: "acc_fixture",
    name: "Account Owner",
    providerUserId: "account_user",
    status: "running",
    isLocked: false,
    connectedBy: "fixture",
  });
  Object.assign(fixture, {
    prospectId,
    companyId,
    campaignId: campaign.id,
    sourceId,
  });
};

describe.skipIf(!endpoint)(
  "isolated LinkedIn automatic delivery ledger",
  () => {
    beforeAll(async () => {
      if (!endpoint) throw new Error("Disposable database required");
      const location = new URL(endpoint);
      if (
        !["localhost", "127.0.0.1"].includes(location.hostname) ||
        location.pathname !== "/outbound_test"
      )
        throw new Error("Local outbound_test only");
      Object.assign(process.env, {
        DATABASE_URL: endpoint,
        CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
      });
      mock.module("server-only", () => ({}));
      modules.database = await import("@/server/database");
      modules.store = await import("@/server/app/outbound/store");
      modules.campaigns = await import("@/server/app/outbound/campaigns");
      modules.linkedin = await import(
        "@/server/app/outbound/linkedin-automation"
      );
      modules.ledger = await import("@/server/utils/outbound/linkedin-ledger");
    });
    beforeEach(async () => {
      setSystemTime(now);
      await active().db.execute(sql`set client_min_messages to warning`);
      await active().db.execute(
        sql`truncate outbound_integration_job, outbound_campaign, outbound_company, outbound_person, outbound_prospect, outbound_event, outbound_revision, outbound_playbook, outbound_provider_credential, outbound_suppression, outbound_inbox, outbound_linkedin_account cascade`,
      );
      await create();
    });
    afterAll(() => setSystemTime());

    test("qualified contact can receive an invitation without email verification; immutable recipient/account/content are recorded", async () => {
      const transport = provider();
      transport.sendInvitation.mockImplementation(async () => {
        const [reserved] = await rows();
        expect(reserved?.status).toBe("starting");
        expect(reserved?.input["text"]).toBe("");
        return {
          success: true,
          data: {
            object: "RelationRequest",
            id: "invitation_fixture",
            type: "sent",
          },
        };
      });
      const result = value(await active().linkedin.run({}, transport));
      expect(result).toMatchObject({ attempted: 1, accepted: 1, uncertain: 0 });
      expect(transport.sendInvitation).toHaveBeenCalledWith(
        "acc_fixture",
        "recipient_fixture",
        "",
      );
      const [job] = await rows();
      expect(job?.status).toBe("complete");
      expect(job?.input["approvalHash"]).toHaveLength(64);
      expect(job?.input).toMatchObject({
        text: "",
        action: "invite",
        prospectRevision: 0,
        qualificationJobId: fixture.sourceId,
      });
      expect(job?.output?.["providerInvitationId"]).toBe("invitation_fixture");
      expect(
        (await active().db.select().from(active().schema.outboundProspect))[0]
          ?.linkedinStatus,
      ).toBe("invited");
    });
    test("concurrent workers reserve once and never send the same invitation twice", async () => {
      const transport = provider();
      await Promise.all([
        active().linkedin.run({}, transport),
        active().linkedin.run({}, transport),
      ]);
      expect(transport.sendInvitation).toHaveBeenCalledTimes(1);
      expect(await rows()).toHaveLength(1);
    });
    test("paused mode and forged qualification cannot reach Unipile", async () => {
      const transport = provider();
      const { store, linkedin, db, schema } = active();
      value(
        await store.savePlaybook("fixture", {
          ...settings,
          linkedinAutomationEnabled: false,
        }),
      );
      expect(value(await linkedin.run({}, transport)).enabled).toBe(false);
      expect(transport.getAccount).not.toHaveBeenCalled();
      value(await store.savePlaybook("fixture", settings));
      await db
        .update(schema.outboundIntegrationJob)
        .set({ output: { qualification: { status: "qualified" } } })
        .where(eq(schema.outboundIntegrationJob.id, fixture.sourceId));
      expect(value(await linkedin.run({}, transport)).accepted).toBe(0);
      expect(transport.sendInvitation).not.toHaveBeenCalled();
    });
    test("uncertain provider outcome blocks replay and does not pretend invitation succeeded", async () => {
      const transport = provider();
      transport.sendInvitation.mockImplementation(async () => {
        throw new IntegrationError("unipile", "uncertain", "fixture timeout");
      });
      expect(value(await active().linkedin.run({}, transport)).uncertain).toBe(
        1,
      );
      expect((await rows())[0]?.status).toBe("uncertain");
      expect(
        (await active().db.select().from(active().schema.outboundProspect))[0]
          ?.linkedinStatus,
      ).toBe("research");
      await active().linkedin.run({}, transport);
      expect(transport.sendInvitation).toHaveBeenCalledTimes(1);
    });
    test("accepted connection receives exactly one message after24h and never uses InMail", async () => {
      const transport = provider();
      const { linkedin } = active();
      value(await linkedin.run({}, transport));
      const first = value(await transport.resolveUser());
      transport.resolveUser.mockResolvedValue({
        success: true,
        data: { ...first, specifics: { network_distance: "FIRST_DEGREE" } },
      });
      await resetDue();
      expect(value(await linkedin.run({}, transport)).accepted).toBe(0);
      expect(transport.startChat).not.toHaveBeenCalled();
      setSystemTime(new Date(now.getTime() + 86_400_001));
      await resetDue();
      expect(value(await linkedin.run({}, transport)).accepted).toBe(1);
      expect(transport.startChat).toHaveBeenCalledTimes(1);
      const message = (await rows()).find(
        (job) => job.input["action"] === "message",
      );
      expect(message?.input["text"]).toContain("Linen tote");
      expect(message?.output?.["providerMessageId"]).toBe("message_fixture");
      await resetDue();
      await linkedin.run({}, transport);
      expect(transport.startChat).toHaveBeenCalledTimes(1);
    });
    test("incoming reply and opt-out stop both channels and create shared suppression", async () => {
      const transport = provider();
      const { linkedin, db, schema } = active();
      value(await linkedin.run({}, transport));
      transport.getUserChats.mockResolvedValue({
        success: true,
        data: { object: "ChatLookup", data: [{ chat_id: "chat_fixture" }] },
      });
      transport.getChatMessages.mockResolvedValue({
        success: true,
        data: {
          data: [
            {
              object: "Message",
              id: "reply_fixture",
              sender_id: "recipient_fixture",
              chat_id: "chat_fixture",
              timestamp: now.toISOString(),
              is_sender: false,
              is_event: false,
              text: "Please do not contact me",
            },
          ],
        },
      });
      expect(value(await linkedin.syncReplies({}, transport))).toMatchObject({
        checked: 1,
        replies: 1,
      });
      const [prospect] = await db.select().from(schema.outboundProspect);
      expect(prospect).toMatchObject({
        status: "optedOut",
        linkedinStatus: "closed",
        nextSendAt: null,
        approvalHash: null,
      });
      expect(
        (await db.select().from(schema.outboundSuppression)).some(
          (entry) =>
            entry.scope === "domain" && entry.value === "samplegoods.com",
        ),
      ).toBe(true);
      await resetDue();
      await linkedin.run({}, transport);
      expect(transport.startChat).not.toHaveBeenCalled();
    });
    test("existing conversation blocks initial outreach even if it contains only our old outbound message", async () => {
      const transport = provider();
      transport.getUserChats.mockResolvedValue({
        success: true,
        data: { object: "ChatLookup", data: [{ chat_id: "old_chat" }] },
      });
      transport.getChatMessages.mockResolvedValue({
        success: true,
        data: {
          data: [
            {
              object: "Message",
              id: "old_message",
              sender_id: "account_user",
              chat_id: "old_chat",
              timestamp: now.toISOString(),
              is_sender: true,
              is_event: false,
              text: "Previous conversation",
            },
          ],
        },
      });
      const result = value(await active().linkedin.run({}, transport));
      expect(result.held[0]?.reason).toBe("linkedin-existing-conversation");
      expect(transport.sendInvitation).not.toHaveBeenCalled();
    });
    test("campaign edit during read-only checks cannot approve an old candidate", async () => {
      const transport = provider();
      const { db, schema, linkedin } = active();
      transport.getUserChats.mockImplementation(async () => {
        await db
          .update(schema.outboundCampaign)
          .set({ revision: 2 })
          .where(eq(schema.outboundCampaign.id, fixture.campaignId));
        return { success: true, data: { object: "ChatLookup", data: [] } };
      });
      expect(value(await linkedin.run({}, transport)).accepted).toBe(0);
      expect(transport.sendInvitation).not.toHaveBeenCalled();
      expect(await rows()).toHaveLength(0);
    });
    test("recent email attempts and unowned historical company contact block LinkedIn", async () => {
      const { db, schema, linkedin } = active();
      const transport = provider();
      const [inbox] = await db
        .insert(schema.outboundInbox)
        .values({
          email: "sender@example.com",
          fromName: "Owner",
          signer: "Owner",
        })
        .returning();
      if (!inbox) throw new Error("Missing inbox");
      await db.insert(schema.outboundSendAttempt).values({
        prospectId: fixture.prospectId,
        inboxId: inbox.id,
        step: 1,
        revision: 0,
        messageId: "email_fixture",
        status: "uncertain",
        contentHash: "fixture",
        createdAt: now,
      });
      expect(value(await linkedin.run({}, transport)).held[0]?.reason).toBe(
        "linkedin-cross-channel-wait",
      );
      expect(transport.getAccount).not.toHaveBeenCalled();
      await db.delete(schema.outboundSendAttempt);
      await resetDue();
      await db
        .update(schema.outboundCompany)
        .set({ lastContactedAt: new Date(now.getTime() - 172_800_000) })
        .where(eq(schema.outboundCompany.id, fixture.companyId));
      expect(value(await linkedin.run({}, transport)).held[0]?.reason).toBe(
        "linkedin-company-history",
      );
    });
    test("email guard counts LinkedIn touch and requires fresh successful history afterward", async () => {
      const { db, linkedin, ledger } = active();
      const transport = provider();
      value(await linkedin.run({}, transport));
      const scope = {
        prospectId: fixture.prospectId,
        companyId: fixture.companyId,
      };
      expect(
        await db.transaction((transaction) =>
          ledger.hasRecentLinkedInTouch(transaction, scope),
        ),
      ).toBe(true);
      expect(
        await db.transaction((transaction) =>
          ledger.linkedinHistoryReady(transaction, scope),
        ),
      ).toBe(true);
      setSystemTime(new Date(now.getTime() + 86_400_001));
      expect(
        await db.transaction((transaction) =>
          ledger.hasRecentLinkedInTouch(transaction, scope),
        ),
      ).toBe(false);
      expect(
        await db.transaction((transaction) =>
          ledger.linkedinHistoryReady(transaction, scope),
        ),
      ).toBe(false);
      value(await linkedin.syncReplies({}, transport));
      expect(
        await db.transaction((transaction) =>
          ledger.linkedinHistoryReady(transaction, scope),
        ),
      ).toBe(true);
    });
    test("missing message receipt becomes uncertain instead of inviting replay", async () => {
      const transport = provider();
      const profile = value(await transport.resolveUser());
      transport.resolveUser.mockResolvedValue({
        success: true,
        data: { ...profile, specifics: { network_distance: "FIRST_DEGREE" } },
      });
      transport.startChat.mockResolvedValue({
        success: true,
        data: {
          object: "ChatStarted",
          chat_id: "chat_fixture",
          message_id: null,
        },
      });
      expect(value(await active().linkedin.run({}, transport)).uncertain).toBe(
        1,
      );
      expect((await rows())[0]?.status).toBe("uncertain");
    });
    test("rolling invite capacity is shared across every campaign on the account", async () => {
      const { db, schema, linkedin } = active();
      const transport = provider();
      await db.insert(schema.outboundIntegrationJob).values(
        Array.from({ length: 15 }, (_, index) => ({
          provider: "linkedin" as const,
          status: "complete" as const,
          requestId: `other-campaign-${index}`,
          input: { accountId: "acc_fixture", action: "invite" },
          createdAt: new Date(now.getTime() - 3_600_000),
          updatedAt: now,
        })),
      );
      const result = value(await linkedin.run({}, transport));
      expect(result.held[0]?.reason).toBe("linkedin-capacity");
      expect(transport.sendInvitation).not.toHaveBeenCalled();
    });
    test("LinkedIn templates cannot borrow the email founder story and signatures use the actual account", async () => {
      const { db, schema, linkedin } = active();
      const transport = provider();
      const person = value(await transport.resolveUser());
      transport.resolveUser.mockResolvedValue({
        success: true,
        data: { ...person, specifics: { network_distance: "FIRST_DEGREE" } },
      });
      await db.update(schema.outboundPlaybook).set({
        settings: {
          ...settings,
          linkedinTemplate: "Hi {first}. {founderLine}",
        },
      });
      expect(value(await linkedin.run({}, transport)).held[0]?.reason).toBe(
        "linkedin-persona-mismatch",
      );
      expect(transport.startChat).not.toHaveBeenCalled();
      await resetDue();
      await db.update(schema.outboundPlaybook).set({
        settings: {
          ...settings,
          linkedinTemplate: "Hi {first}. {signature}",
        },
      });
      expect(value(await linkedin.run({}, transport)).accepted).toBe(1);
      expect((await rows())[0]?.input["text"]).toBe("Hi Jane. Account Owner");
    });
    test("manual LinkedIn replies consume the same account message cap", async () => {
      const { db, schema, linkedin } = active();
      const transport = provider();
      const person = value(await transport.resolveUser());
      transport.resolveUser.mockResolvedValue({
        success: true,
        data: { ...person, specifics: { network_distance: "FIRST_DEGREE" } },
      });
      const [thread] = await db
        .insert(schema.outboundConversation)
        .values({
          prospectId: fixture.prospectId,
          channel: "linkedin",
          accountId: "acc_fixture",
          accountLabel: "Account Owner",
          providerThreadId: "prior_other_chat",
          counterpart: "different_person",
        })
        .returning();
      if (!thread) throw new Error("Missing conversation");
      await db.insert(schema.outboundConversationSend).values(
        Array.from(
          { length: settings.linkedinDailyMessages },
          (_, revision) => ({
            conversationId: thread.id,
            revision,
            status: "accepted" as const,
            input: { channel: "linkedin", accountId: "acc_fixture" },
            createdBy: "fixture",
            createdAt: new Date(now.getTime() - 3_600_000),
          }),
        ),
      );
      expect(value(await linkedin.run({}, transport)).held[0]?.reason).toBe(
        "linkedin-capacity",
      );
      expect(transport.startChat).not.toHaveBeenCalled();
    });
    test("abandoned reservation becomes uncertain and is never replayed", async () => {
      const { db, schema, linkedin } = active();
      const transport = provider();
      await db.insert(schema.outboundIntegrationJob).values({
        provider: "linkedin",
        prospectId: fixture.prospectId,
        status: "starting",
        requestId: `linkedin:${fixture.prospectId}:invite`,
        input: { accountId: "acc_fixture", action: "invite" },
        createdAt: new Date(now.getTime() - 180_000),
      });
      expect(value(await linkedin.run({}, transport)).attempted).toBe(0);
      expect((await rows())[0]?.status).toBe("uncertain");
      expect(transport.sendInvitation).not.toHaveBeenCalled();
    });
    test("stopped conversations cannot consume the reply synchronization page", async () => {
      const { db, schema, linkedin } = active();
      const transport = provider();
      value(await linkedin.run({}, transport));
      const [sent] = await rows();
      const [original] = await db.select().from(schema.outboundProspect);
      if (!sent || !original) throw new Error("Missing fixture");
      const companyId = randomUUID();
      const personId = randomUUID();
      const prospectId = randomUUID();
      await db.insert(schema.outboundCompany).values({
        id: companyId,
        domain: "closed-fixture.com",
        name: "Closed",
        website: "https://closed-fixture.com",
        country: "US",
        source: "fixture",
      });
      await db.insert(schema.outboundPerson).values({
        id: personId,
        companyId,
        identityKey: "closed-fixture",
        name: "Closed Person",
      });
      await db.insert(schema.outboundProspect).values({
        id: prospectId,
        companyId,
        personId,
        details: original.details,
        status: "replied",
        createdBy: "fixture",
      });
      await db.insert(schema.outboundIntegrationJob).values(
        ["invite", "message"].map((action) => ({
          provider: "linkedin" as const,
          prospectId,
          requestId: `closed:${action}`,
          status: "complete" as const,
          input: { ...sent.input, action, prospectId, companyId },
          output: { historyCheckedAt: new Date(0).toISOString() },
        })),
      );
      transport.getUserChats.mockClear();
      expect(
        value(await linkedin.syncReplies({ maxProspects: 1 }, transport))
          .checked,
      ).toBe(1);
      expect(transport.getUserChats).toHaveBeenCalledTimes(1);
    });
    test("pausing and resuming preserves qualified evidence but performs no work while paused", async () => {
      const { store, linkedin } = active();
      const transport = provider();
      const before = await store.policy();
      value(
        await store.savePlaybook("fixture", {
          ...settings,
          linkedinAutomationEnabled: false,
          automationEnabled: false,
        }),
      );
      expect(value(await linkedin.run({}, transport)).enabled).toBe(false);
      expect(transport.getAccount).not.toHaveBeenCalled();
      value(await store.savePlaybook("fixture", settings));
      expect((await store.policy()).revision).toBe(before.revision);
      expect(value(await linkedin.run({}, transport)).accepted).toBe(1);
    });
  },
);
