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
import { eq, sql } from "drizzle-orm";
import { defaultPlaybook, prospectSchema, senderFor } from "@/lib/outbound";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
const enabled = Boolean(endpoint);
const now = new Date("2026-11-09T17:00:00Z");
const actor = "outbound-fixture-staff";
const modules: {
  store?: typeof import("@/server/app/outbound/store");
  database?: typeof import("@/server/database");
} = {};
const settings = {
  ...defaultPlaybook,
  senderConfirmed: true,
  historyConfirmed: true,
  competingSendersPaused: true,
  senderTested: true,
  senderEmails:
    "juri1@joinecentic.com\njuri2@joinecentic.com\njuri3@joinecentic.com\njuri4@joinecentic.com",
};
const details = (domain = "samplegoods.com") =>
  prospectSchema.parse({
    company: "Sample Goods",
    domain,
    country: "US",
    name: "Jane Smith",
    first: "Jane",
    title: "Head of Growth",
    email: `jane@${domain}`,
    emailStatus: "verified",
    emailVerifiedAt: now.toISOString(),
    emailSource: "fixture-verifier:receipt-123",
    roleSource: `https://${domain}/team`,
    roleCheckedAt: now.toISOString(),
    timezone: "America/New_York",
    mxProvider: "google",
    mxCheckedAt: now.toISOString(),
    product: "Linen tote",
    productUrl: `https://${domain}/products/tote`,
    finding: "The page lists one size, but does not give its dimensions.",
    evidence: "Product text and size options inspected.",
    evidenceCheckedAt: now.toISOString(),
    legitEvidence: "Active physical catalogue and company identity inspected.",
  });
const active = () => {
  if (!modules.store || !modules.database)
    throw new Error("Fixture database not initialized");
  return { store: modules.store, ...modules.database };
};
const required = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const approved = async () => {
  const { store, db, schema } = active();
  const created = required(await store.saveProspect(actor, details()));
  const draft = required(await store.generateDrafts(actor, created));
  required(
    await store.reviewProspect(actor, {
      ...created,
      revision: draft.revision,
      decision: "approve",
    }),
  );
  const inbox = (
    await db
      .select()
      .from(schema.outboundInbox)
      .where(
        eq(schema.outboundInbox.email, senderFor(created.prospect, settings)),
      )
  )[0];
  if (!inbox) throw new Error("Assigned sender not found");
  required(
    await store.savePlaybook(actor, { ...settings, sendingEnabled: true }),
  );
  return { ...created, inbox: inbox.id, revision: draft.revision };
};

describe.skipIf(!enabled)("outbound isolated Postgres service", () => {
  beforeAll(async () => {
    if (!endpoint) throw new Error("OUTBOUND_TEST_DATABASE_URL is required");
    const url = new URL(endpoint);
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.pathname !== "/outbound_test"
    )
      throw new Error(
        "Only the isolated local outbound_test database is permitted",
      );
    Object.assign(process.env, {
      DATABASE_URL: endpoint,
      CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
    });
    mock.module("server-only", () => ({}));
    modules.database = await import("@/server/database");
    modules.store = await import("@/server/app/outbound/store");
  }, 60000);
  beforeEach(async () => {
    setSystemTime(now);
    const { store, db, schema } = active();
    await db.execute(
      sql`truncate outbound_integration_job, outbound_send_attempt, outbound_event, outbound_revision, outbound_prospect, outbound_person, outbound_company, outbound_suppression, outbound_inbox, outbound_playbook cascade`,
    );
    required(await store.savePlaybook(actor, settings));
    for (const email of settings.senderEmails.split("\n"))
      await db.insert(schema.outboundInbox).values({
        email,
        fromName: settings.fromName,
        signer: settings.signature,
        enabled: true,
        refreshToken: "fixture-refresh-token",
        lastSyncedAt: now,
      });
  });
  afterAll(() => setSystemTime());

  test("repeat imports and subdomains produce one company and one prospect", async () => {
    const { store, db, schema } = active();
    const first = required(
      await store.importProspects(actor, {
        content: JSON.stringify([details()]),
      }),
    );
    const second = required(
      await store.importProspects(actor, {
        content: JSON.stringify([
          { ...details(), domain: "shop.samplegoods.com" },
        ]),
      }),
    );
    expect(first.imported).toBe(1);
    expect(second.duplicate).toBe(1);
    expect(await db.select().from(schema.outboundCompany)).toHaveLength(1);
    expect(await db.select().from(schema.outboundProspect)).toHaveLength(1);
  });
  test("incomplete historical rows still create scoped exclusions", async () => {
    const { store, db, schema } = active();
    required(
      await store.importProspects(actor, {
        content: JSON.stringify([
          {
            domain: "old.example.com",
            email: "person@example.com",
            status: "sent",
          },
          {
            domain: "bounce.com",
            email: "person@bounce.com",
            status: "bounced",
          },
        ]),
      }),
    );
    const values = await db.select().from(schema.outboundSuppression);
    expect(
      values.some(
        (value) => value.scope === "domain" && value.value === "example.com",
      ),
    ).toBe(true);
    expect(
      values.some(
        (value) => value.scope === "domain" && value.value === "bounce.com",
      ),
    ).toBe(false);
    expect(
      values.some(
        (value) =>
          value.scope === "email" && value.value === "person@bounce.com",
      ),
    ).toBe(true);
  });
  test("enabling delivery preserves approvals and the stable pool assignment", async () => {
    const { store } = active();
    const fixture = await approved();
    const row = required(await store.readProspect(fixture.prospect));
    expect(row?.status).toBe("approved");
    const claim = required(await store.claimDelivery(actor, fixture));
    expect(claim.manifest.sender).toBe(senderFor(fixture.prospect, settings));
    expect(claim.message.body).toContain(settings.postalAddress);
    expect((await store.claimDelivery(actor, fixture)).success).toBe(false);
  });
  test("editing a draft revokes its prior approval", async () => {
    const { store } = active();
    const fixture = await approved();
    const row = required(await store.readProspect(fixture.prospect));
    if (!row) throw new Error("Prospect missing");
    required(
      await store.saveDraft(actor, {
        ...fixture,
        subject: "Linen tote details",
        body: row.messages[0]?.body ?? "",
        followupOne: "Bumping this!",
        followupTwo: "Jane?",
      }),
    );
    expect(
      required(await store.readProspect(fixture.prospect))?.approvalHash,
    ).toBeNull();
    expect((await store.claimDelivery(actor, fixture)).success).toBe(false);
  });
  test("an altered concrete message cannot reuse the original approval hash", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const row = required(await store.readProspect(fixture.prospect));
    if (!row) throw new Error("Prospect missing");
    await db
      .update(schema.outboundProspect)
      .set({
        messages: row.messages.map((message) =>
          message.step === 1
            ? { ...message, subject: "Different product" }
            : message,
        ),
      })
      .where(eq(schema.outboundProspect.id, fixture.prospect));
    expect((await store.claimDelivery(actor, fixture)).success).toBe(false);
    expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(0);
  });
  test("opt-out committed after reservation stops dispatch across channels", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const claim = required(await store.claimDelivery(actor, fixture));
    required(
      await store.recordOutcome(actor, {
        prospect: fixture.prospect,
        kind: "optout",
        note: "Stop",
      }),
    );
    const send = mock(async () => ({
      success: true as const,
      data: { providerMessageId: "provider-1", threadId: "thread-1" },
    }));
    expect((await store.dispatchDelivery(actor, claim, send)).success).toBe(
      false,
    );
    expect(send).not.toHaveBeenCalled();
    expect(
      (await db.select().from(schema.outboundSuppression))
        .map((entry) => entry.scope)
        .sort(),
    ).toEqual(["domain", "email"]);
  });
  test("concurrent dispatches use a single committed reservation only once", async () => {
    const { store } = active();
    const fixture = await approved();
    const claim = required(await store.claimDelivery(actor, fixture));
    const send = mock(async () => ({
      success: true as const,
      data: { providerMessageId: "provider-1", threadId: "thread-1" },
    }));
    const results = await Promise.all([
      store.dispatchDelivery(actor, claim, send),
      store.dispatchDelivery(actor, claim, send),
    ]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(results.filter((result) => result.success)).toHaveLength(1);
    const row = required(await store.readProspect(fixture.prospect));
    expect(row?.sentStep).toBe(1);
    expect(row?.nextSendAt?.toISOString()).toBe("2026-11-12T17:00:00.000Z");
  });
  test("provider failure persists uncertainty and never blindly retries", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const claim = required(await store.claimDelivery(actor, fixture));
    const send = mock(async () => ({
      success: false as const,
      error: new Error("Connection dropped after acceptance may have occurred"),
    }));
    expect(
      required(await store.dispatchDelivery(actor, claim, send)).status,
    ).toBe("uncertain");
    expect((await store.dispatchDelivery(actor, claim, send)).success).toBe(
      false,
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(
      (await db.select().from(schema.outboundSendAttempt))[0]?.status,
    ).toBe("uncertain");
    expect(required(await store.readProspect(fixture.prospect))?.status).toBe(
      "held",
    );
  });
  test("all three steps keep the original sender, thread, footer and first-send schedule", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const first = required(await store.claimDelivery(actor, fixture));
    required(
      await store.dispatchDelivery(actor, first, async () => ({
        success: true,
        data: {
          providerMessageId: "provider-first",
          threadId: "thread-stable",
        },
      })),
    );
    for (const [step, date] of [
      [2, "2026-11-12T17:00:00Z"],
      [3, "2026-11-16T17:00:00Z"],
    ] as const) {
      setSystemTime(new Date(date));
      required(
        await store.patchProspect(
          actor,
          fixture.prospect,
          { mxCheckedAt: date, evidenceCheckedAt: date, emailVerifiedAt: date },
          fixture.revision,
        ),
      );
      await db
        .update(schema.outboundInbox)
        .set({ lastSyncedAt: new Date(date) })
        .where(eq(schema.outboundInbox.id, fixture.inbox));
      const followup = required(await store.claimDelivery(actor, fixture));
      expect(followup.step).toBe(step);
      expect(followup.threadId).toBe("thread-stable");
      expect(followup.manifest.sender).toBe(first.manifest.sender);
      expect(followup.message.body).toContain(`> ${settings.postalAddress}`);
      expect(followup.references).toContain(first.messageId);
      required(
        await store.dispatchDelivery(actor, followup, async () => ({
          success: true,
          data: {
            providerMessageId: `provider-${step}`,
            threadId: "thread-stable",
          },
        })),
      );
    }
    const row = required(await store.readProspect(fixture.prospect));
    expect(row?.sentStep).toBe(3);
    expect(row?.status).toBe("finished");
    expect(row?.nextSendAt).toBeNull();
  });
  test("OAuth follow-ups cannot submit an SMTP conversation key as a Gmail thread", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    await db
      .update(schema.outboundInbox)
      .set({
        transport: "google-app-password",
        appPassword: "abcdefghijklmnop",
        refreshToken: null,
      })
      .where(eq(schema.outboundInbox.id, fixture.inbox));
    const first = required(await store.claimDelivery(actor, fixture));
    required(
      await store.dispatchDelivery(actor, first, async () => ({
        success: true,
        data: { providerMessageId: first.messageId, threadId: first.messageId },
      })),
    );
    const date = "2026-11-12T17:00:00Z";
    setSystemTime(new Date(date));
    required(
      await store.patchProspect(
        actor,
        fixture.prospect,
        {
          mxCheckedAt: date,
          evidenceCheckedAt: date,
          emailVerifiedAt: date,
        },
        fixture.revision,
      ),
    );
    await db
      .update(schema.outboundInbox)
      .set({
        transport: "gmail-oauth",
        appPassword: null,
        refreshToken: "fixture-refresh-token",
        lastSyncedAt: new Date(date),
      })
      .where(eq(schema.outboundInbox.id, fixture.inbox));
    const followup = await store.claimDelivery(actor, fixture);
    expect(followup.success).toBe(false);
    if (!followup.success)
      expect(followup.error.message).toContain("direct mailbox");
    expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(1);
  });
  test("closed and replied prospects cannot be revived by drafting", async () => {
    const { store } = active();
    const created = required(await store.saveProspect(actor, details()));
    const draft = required(await store.generateDrafts(actor, created));
    const row = required(await store.readProspect(created.prospect));
    if (!row) throw new Error("Missing prospect");
    required(
      await store.recordOutcome(actor, {
        ...created,
        kind: "reply",
        note: "Human reply received",
      }),
    );
    expect((await store.generateDrafts(actor, created)).success).toBe(false);
    expect(
      (
        await store.saveDraft(actor, {
          ...created,
          revision: draft.revision,
          subject: row.messages[0]?.subject ?? "",
          body: row.messages[0]?.body ?? "",
          followupOne: "Bumping this!",
          followupTwo: "Jane?",
        })
      ).success,
    ).toBe(false);
    expect(required(await store.readProspect(created.prospect))?.status).toBe(
      "replied",
    );
  });
  test("follow-up quotes retain the original accepted address after a playbook change", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const first = required(await store.claimDelivery(actor, fixture));
    required(
      await store.dispatchDelivery(actor, first, async () => ({
        success: true,
        data: {
          providerMessageId: "first-accepted",
          threadId: "original-thread",
        },
      })),
    );
    const date = new Date("2026-11-12T17:00:00Z");
    setSystemTime(date);
    required(
      await store.patchProspect(
        actor,
        fixture.prospect,
        {
          mxCheckedAt: date.toISOString(),
          evidenceCheckedAt: date.toISOString(),
        },
        fixture.revision,
      ),
    );
    const changed = {
      ...settings,
      postalAddress: "ecentic, 100 New Office Road, Sunnyvale, CA 94085, USA",
    };
    required(await store.savePlaybook(actor, changed));
    const row = required(await store.readProspect(fixture.prospect));
    if (!row) throw new Error("Missing prospect");
    const draft = required(
      await store.saveDraft(actor, {
        ...fixture,
        subject: row.messages[0]?.subject ?? "",
        body: row.messages[0]?.body ?? "",
        followupOne: "Bumping this!",
        followupTwo: "Jane?",
      }),
    );
    required(
      await store.reviewProspect(actor, {
        ...fixture,
        revision: draft.revision,
        decision: "approve",
      }),
    );
    await db.update(schema.outboundInbox).set({ lastSyncedAt: date });
    required(
      await store.savePlaybook(actor, { ...changed, sendingEnabled: true }),
    );
    const next = required(await store.claimDelivery(actor, fixture));
    expect(next.message.body).toContain(`> ${settings.postalAddress}`);
    expect(next.message.body).not.toContain(changed.postalAddress);
    const snapshot = required(await store.getWorkspace()).prospects.find(
      (prospect) => prospect.id === fixture.prospect,
    );
    expect(snapshot?.sentPostalAddress).toBe(settings.postalAddress);
    expect(snapshot?.sentStep).toBe(1);
  });
  test("weekly report counts accepted attempts and unique human outcomes only", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const claim = required(await store.claimDelivery(actor, fixture));
    required(
      await store.dispatchDelivery(actor, claim, async () => ({
        success: true,
        data: {
          providerMessageId: "accepted-report",
          threadId: "report-thread",
        },
      })),
    );
    await db.insert(schema.outboundEvent).values([
      {
        prospectId: fixture.prospect,
        actor,
        kind: "reply",
        detail: "First receipt",
        createdAt: now,
      },
      {
        prospectId: fixture.prospect,
        actor,
        kind: "reply",
        detail: "Replayed receipt",
        createdAt: now,
      },
      {
        prospectId: fixture.prospect,
        actor,
        kind: "meeting",
        detail: "Confirmed",
        createdAt: now,
      },
    ]);
    const report = required(await store.getWeeklyReport());
    expect(report.totals.acceptedFirsts).toBe(1);
    expect(report.totals.acceptedFollowups).toBe(0);
    expect(report.totals.replies).toBe(1);
    expect(report.totals.meetings).toBe(1);
    expect(report.bySource[0]?.acceptedFirsts).toBe(1);
  });
  test("batch approval rejects repeated subjects and observations", async () => {
    const { store } = active();
    await approved();
    const other = required(
      await store.saveProspect(actor, details("anothergoods.com")),
    );
    const draft = required(await store.generateDrafts(actor, other));
    const review = await store.reviewProspect(actor, {
      ...other,
      revision: draft.revision,
      decision: "approve",
    });
    expect(review.success).toBe(false);
    if (!review.success)
      expect(review.error.message).toContain("duplicateSubject");
  });
  test("same-fact receipts preserve approval; changed findings revoke it", async () => {
    const { store } = active();
    const fixture = await approved();
    required(
      await store.patchProspect(
        actor,
        fixture.prospect,
        { evidenceCheckedAt: "2026-11-09T17:00:30.000Z" },
        fixture.revision,
      ),
    );
    expect(
      required(await store.readProspect(fixture.prospect))?.approvalHash,
    ).not.toBeNull();
    required(
      await store.patchProspect(
        actor,
        fixture.prospect,
        { finding: "The dimensions are now present." },
        fixture.revision,
      ),
    );
    expect(
      required(await store.readProspect(fixture.prospect))?.approvalHash,
    ).toBeNull();
  });
  test("accepted replies count toward the ramp and their bounces hold it", async () => {
    const { store, db, schema } = active();
    const prospect = required(await store.saveProspect(actor, details()));
    const inbox = (
      await db.update(schema.outboundInbox).set({ dailyCap: 50 }).returning()
    )[0];
    if (!inbox) throw new Error("Fixture inbox missing");
    const conversation = (
      await db
        .insert(schema.outboundConversation)
        .values({
          prospectId: prospect.prospect,
          channel: "email",
          accountId: inbox.id,
          accountLabel: inbox.email,
          providerThreadId: "capacity-fixture",
          counterpart: details().email,
        })
        .returning()
    )[0];
    if (!conversation) throw new Error("Fixture conversation missing");
    await db.insert(schema.outboundConversationSend).values(
      Array.from({ length: 15 }, (_, revision) => ({
        conversationId: conversation.id,
        revision,
        status: "accepted" as const,
        input: {
          channel: "email",
          accountId: inbox.id,
          prospectId: prospect.prospect,
        },
        createdBy: actor,
        completedAt: new Date(now.getTime() - 86400000),
      })),
    );
    expect(
      await store.inboxCapacity(inbox, { ...settings, dailyCap: 50 }),
    ).toEqual({ target: 50, dailyCap: 20, rampHeld: false });
    await db
      .update(schema.outboundProspect)
      .set({ status: "bounced" })
      .where(eq(schema.outboundProspect.id, prospect.prospect));
    expect(
      await store.inboxCapacity(inbox, { ...settings, dailyCap: 50 }),
    ).toEqual({ target: 50, dailyCap: 15, rampHeld: true });
  });
});
