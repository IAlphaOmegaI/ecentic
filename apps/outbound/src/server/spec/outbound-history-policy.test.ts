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
import {
  contactHistoryReady,
  defaultPlaybook,
  playbookSchema,
  prospectSchema,
} from "@/lib/outbound";
import { assessMailboxReadiness } from "@/lib/outbound-warmup";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
const now = new Date("2026-11-09T17:00:00Z");
const actor = "history-policy-fixture";
const modules: {
  store?: typeof import("@/server/app/outbound/store");
  database?: typeof import("@/server/database");
} = {};
const settings = {
  ...defaultPlaybook,
  senderConfirmed: true,
  historyConfirmed: false,
  allowIncompleteHistory: false,
  competingSendersPaused: true,
  senderTested: true,
  senderEmails: "juri1@joinecentic.com",
};
const details = prospectSchema.parse({
  company: "Sample Goods",
  domain: "samplegoods.com",
  country: "US",
  name: "Jane Smith",
  first: "Jane",
  title: "Head of Growth",
  email: "jane@samplegoods.com",
  emailStatus: "verified",
  emailVerifiedAt: now.toISOString(),
  emailSource: "fixture-verifier:history-policy",
  roleSource: "https://samplegoods.com/team",
  roleCheckedAt: now.toISOString(),
  timezone: "America/New_York",
  mxProvider: "google",
  mxCheckedAt: now.toISOString(),
  product: "Linen tote",
  productUrl: "https://samplegoods.com/products/tote",
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
const required = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const approved = async (allowIncompleteHistory = false) => {
  const { store, db, schema } = active();
  const created = required(await store.saveProspect(actor, details));
  const draft = required(await store.generateDrafts(actor, created));
  required(
    await store.reviewProspect(actor, {
      ...created,
      revision: draft.revision,
      decision: "approve",
    }),
  );
  required(
    await store.savePlaybook(actor, {
      ...settings,
      allowIncompleteHistory,
      sendingEnabled: true,
    }),
  );
  const [inbox] = await db.select().from(schema.outboundInbox);
  if (!inbox) throw new Error("Fixture inbox missing");
  return { ...created, revision: draft.revision, inbox: inbox.id };
};

describe("external contact history policy", () => {
  test("existing settings require history unless an explicit exception is saved", () => {
    const { allowIncompleteHistory: _exception, ...previous } = defaultPlaybook;
    const parsed = playbookSchema.parse(previous);
    expect(parsed.allowIncompleteHistory).toBe(false);
    expect(contactHistoryReady(parsed)).toBe(false);
    expect(contactHistoryReady({ historyConfirmed: true })).toBe(true);
    expect(
      contactHistoryReady({
        historyConfirmed: false,
        allowIncompleteHistory: true,
      }),
    ).toBe(true);
  });
  test("readiness labels skipped history without claiming it was confirmed", () => {
    const observation = { state: "present" as const, records: ["fixture"] };
    const input = {
      domain: {
        domain: "samplegoods.com",
        checkedAt: now.toISOString(),
        mx: observation,
        spf: observation,
        dkim: { ...observation, selectors: ["fixture"] },
        dmarc: {
          ...observation,
          recordDomain: "samplegoods.com",
          inherited: false,
          policy: "reject" as const,
        },
        scope: "dns-records" as const,
        inboxPlacement: "unknown" as const,
      },
      connected: true,
      synchronized: true,
      providerError: false,
      historyConfirmed: false,
      allowIncompleteHistory: true,
      senderTested: true,
    };
    const report = assessMailboxReadiness(input);
    expect(report.checks).toContainEqual({
      key: "historyOptional",
      state: "present",
    });
    expect(report.checks.some((check) => check.key === "history")).toBe(false);
    expect(input.historyConfirmed).toBe(false);
    expect(report.inboxPlacement).toBe("unknown");
    expect(report.reputation).toBe("unknown");
    expect(
      assessMailboxReadiness({ ...input, allowIncompleteHistory: false })
        .checks,
    ).toContainEqual({ key: "history", state: "unknown" });
    expect(
      assessMailboxReadiness({ ...input, historyConfirmed: true }).checks,
    ).toContainEqual({ key: "history", state: "present" });
  });
});

describe.skipIf(!endpoint)("isolated external history delivery policy", () => {
  beforeAll(async () => {
    if (!endpoint) throw new Error("Local test database required");
    const location = new URL(endpoint);
    if (
      !["localhost", "127.0.0.1"].includes(location.hostname) ||
      location.pathname !== "/outbound_test"
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
    await db.execute(sql`set client_min_messages to warning`);
    await db.execute(
      sql`truncate outbound_integration_job, outbound_send_attempt, outbound_event, outbound_revision, outbound_prospect, outbound_person, outbound_company, outbound_suppression, outbound_inbox, outbound_playbook cascade`,
    );
    required(await store.savePlaybook(actor, settings));
    await db.insert(schema.outboundInbox).values({
      email: settings.senderEmails,
      fromName: settings.fromName,
      signer: settings.signature,
      enabled: true,
      refreshToken: "fixture-refresh-token",
      lastSyncedAt: now,
    });
  });
  afterAll(() => setSystemTime());

  test("missing history blocks both readiness and a delivery claim by default", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    expect(required(await store.automationDeliveryStatus()).blockers).toContain(
      "historyUnconfirmed",
    );
    const claim = await store.claimDelivery(actor, fixture);
    expect(claim.success).toBe(false);
    if (!claim.success) expect(claim.error.message).toContain("history");
    expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(0);
  });

  test("explicit acceptance permits an eligible claim without asserting history was imported", async () => {
    const { store, db, schema } = active();
    const fixture = await approved(true);
    expect(required(await store.automationDeliveryStatus()).ready).toBe(true);
    const claim = required(await store.claimDelivery(actor, fixture));
    expect(claim.prospect).toBe(fixture.prospect);
    const [policy] = await db.select().from(schema.outboundPlaybook);
    expect(policy?.settings.historyConfirmed).toBe(false);
    expect(policy?.settings.allowIncompleteHistory).toBe(true);
    const [attempt] = await db.select().from(schema.outboundSendAttempt);
    expect(attempt?.status).toBe("claimed");
    expect(attempt?.completedAt).toBeNull();
  });

  test("acceptance and reversal preserve exact approval and record the responsible actor", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const before = required(await store.readProspect(fixture.prospect));
    const initial = await store.policy();
    const accepted = required(
      await store.savePlaybook("fixture-owner-accepts", {
        ...settings,
        sendingEnabled: true,
        allowIncompleteHistory: true,
      }),
    );
    const restored = required(
      await store.savePlaybook("fixture-owner-restores", {
        ...settings,
        sendingEnabled: true,
      }),
    );
    const after = required(await store.readProspect(fixture.prospect));
    expect(accepted.revision).toBe(initial.revision);
    expect(restored.revision).toBe(initial.revision);
    expect(after?.status).toBe("approved");
    expect(after?.revision).toBe(before?.revision);
    expect(after?.approvalHash).toBe(before?.approvalHash);
    expect(after?.approvedAt).toEqual(before?.approvedAt);
    const events = await db
      .select()
      .from(schema.outboundEvent)
      .where(eq(schema.outboundEvent.kind, "historicalContactPolicyChanged"));
    expect(events.map((event) => event.actor).sort()).toEqual([
      "fixture-owner-accepts",
      "fixture-owner-restores",
    ]);
    expect((await store.claimDelivery(actor, fixture)).success).toBe(false);
  });

  test("revoking acceptance after a claim prevents dispatch", async () => {
    const { store } = active();
    const fixture = await approved(true);
    const claim = required(await store.claimDelivery(actor, fixture));
    required(
      await store.savePlaybook(actor, { ...settings, sendingEnabled: true }),
    );
    const send = mock(async () => ({
      success: true as const,
      data: {
        providerMessageId: "fixture-never-sent",
        threadId: "fixture-thread",
      },
    }));
    expect((await store.dispatchDelivery(actor, claim, send)).success).toBe(
      false,
    );
    expect(send).not.toHaveBeenCalled();
  });

  for (const reason of [
    "legacy opt-out",
    "legacy bounce",
    "historic contact: cold outreach excluded",
  ]) {
    test(`existing suppression still blocks with acceptance: ${reason}`, async () => {
      const { store, db, schema } = active();
      const fixture = await approved(true);
      await db.insert(schema.outboundSuppression).values({
        scope: "email",
        value: details.email,
        reason,
        createdBy: actor,
      });
      const claim = await store.claimDelivery(actor, fixture);
      expect(claim.success).toBe(false);
      if (!claim.success) expect(claim.error.message).toContain("suppressed");
      expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(
        0,
      );
    });
  }

  for (const kind of ["optout", "bounce", "reply"] as const) {
    test(`a current ${kind} cannot be overridden by history acceptance`, async () => {
      const { store } = active();
      const fixture = await approved(true);
      required(
        await store.recordOutcome(actor, {
          prospect: fixture.prospect,
          kind,
          note: "Fixture outcome",
        }),
      );
      expect((await store.claimDelivery(actor, fixture)).success).toBe(false);
    });
  }

  test("a deliberate hold remains stopped with history acceptance", async () => {
    const { store } = active();
    const fixture = await approved(true);
    required(
      await store.reviewProspect(actor, {
        ...fixture,
        decision: "hold",
        reason: "Owner paused this lead",
      }),
    );
    expect((await store.claimDelivery(actor, fixture)).success).toBe(false);
    expect(required(await store.readProspect(fixture.prospect))?.status).toBe(
      "held",
    );
  });

  for (const patch of [
    { syncMode: "full" as const },
    { enabled: false },
    { lastSyncedAt: new Date(now.getTime() - 11 * 60_000) },
  ]) {
    test(`mailbox readiness remains required with history acceptance: ${Object.keys(patch)[0]}`, async () => {
      const { store, db, schema } = active();
      const fixture = await approved(true);
      await db
        .update(schema.outboundInbox)
        .set(patch)
        .where(eq(schema.outboundInbox.id, fixture.inbox));
      expect(required(await store.automationDeliveryStatus()).ready).toBe(
        false,
      );
      expect((await store.claimDelivery(actor, fixture)).success).toBe(false);
      expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(
        0,
      );
    });
  }

  test("acceptance alone never enables sending or a disabled mailbox", async () => {
    const { store, db, schema } = active();
    await db.update(schema.outboundInbox).set({ enabled: false });
    required(
      await store.savePlaybook(actor, {
        ...settings,
        allowIncompleteHistory: true,
      }),
    );
    const state = required(await store.automationDeliveryStatus());
    expect(state.sendingEnabled).toBe(false);
    expect(state.blockers).toContain("inboxDisabled");
    expect(state.blockers).toContain("sendingPaused");
    expect(state.blockers).not.toContain("historyUnconfirmed");
  });
});
