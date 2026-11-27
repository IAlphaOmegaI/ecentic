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
import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { defaultPlaybook, prospectSchema, senderFor } from "@/lib/outbound";
import { LEGACY_CONTACT_IMPORT_ACTOR } from "@/lib/outbound-saved-contact";
import { shoppingResearchSchema } from "@/lib/outbound-shopping-research";
import { IntegrationError } from "@/server/utils/outbound/http";
import { requireTestDatabase } from "./helpers/database";
import { draftSyntheticProspect } from "./helpers/outbound-shopping-db-fixture";
import { syntheticWritingPolicy } from "./helpers/outbound-shopping-fixture";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
const enabled = Boolean(endpoint);
const now = new Date("2026-11-09T17:00:00Z");
const actor = "outbound-fixture-staff";
const modules: {
  store?: typeof import("@/server/app/outbound/store");
  database?: typeof import("@/server/database");
  conversations?: typeof import("@/server/app/outbound/conversations");
} = {};
const settings = syntheticWritingPolicy({
  ...defaultPlaybook,
  senderConfirmed: true,
  historyConfirmed: true,
  competingSendersPaused: true,
  senderTested: true,
  senderEmails:
    "juri1@joinecentic.com\njuri2@joinecentic.com\njuri3@joinecentic.com\njuri4@joinecentic.com",
  senderProfiles: [1, 2, 3, 4].map((number) => ({
    email: `juri${number}@joinecentic.com`,
    fromName: defaultPlaybook.fromName,
    signature: defaultPlaybook.signature,
    founderLine: defaultPlaybook.founderLine,
    productCheckIntro: defaultPlaybook.productCheckIntro,
    voiceNotes: defaultPlaybook.voiceNotes,
  })),
});
const details = (domain = "samplegoods.com") =>
  prospectSchema.parse({
    company: "Sample Goods",
    domain,
    country: "US",
    platform: "shopify",
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
  if (!modules.store || !modules.database || !modules.conversations)
    throw new Error("Fixture database not initialized");
  return {
    store: modules.store,
    conversations: modules.conversations,
    ...modules.database,
  };
};
const required = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const approved = async (policySettings = settings) => {
  const { store, db, schema } = active();
  if (policySettings !== settings)
    required(await store.savePlaybook(actor, policySettings));
  const created = required(await store.saveProspect(actor, details()));
  const draft = required(await draftSyntheticProspect(actor, created));
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
    await store.savePlaybook(actor, {
      ...policySettings,
      sendingEnabled: true,
    }),
  );
  return { ...created, inbox: inbox.id, revision: draft.revision };
};
const sentSequence = async () => {
  const { store, conversations } = active();
  const fixture = await approved();
  const first = required(await store.claimDelivery(actor, fixture));
  required(
    await store.dispatchDelivery(actor, first, async () => ({
      success: true,
      data: { providerMessageId: "provider-first", threadId: "thread-stage" },
    })),
  );
  const detail = required(await conversations.get({ id: fixture.prospect }));
  return { ...fixture, thread: detail.thread };
};
const claimedFollowup = async () => {
  const { store, db, schema } = active();
  const fixture = await sentSequence();
  const date = "2026-11-12T17:00:00Z";
  setSystemTime(new Date(date));
  required(
    await store.patchProspect(
      actor,
      fixture.prospect,
      {
        mxCheckedAt: date,
        emailVerifiedAt: date,
      },
      fixture.revision,
    ),
  );
  await db
    .update(schema.outboundInbox)
    .set({ lastSyncedAt: new Date(date) })
    .where(eq(schema.outboundInbox.id, fixture.inbox));
  const claim = required(await store.claimDelivery(actor, fixture));
  expect(claim.step).toBe(2);
  return { ...fixture, claim };
};

describe.skipIf(!enabled)("outbound isolated Postgres service", () => {
  beforeAll(async () => {
    requireTestDatabase(endpoint);
    Object.assign(process.env, {
      DATABASE_URL: endpoint,
      CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
    });
    mock.module("server-only", () => ({}));
    modules.database = await import("@/server/database");
    modules.store = await import("@/server/app/outbound/store");
    modules.conversations = await import("@/server/app/outbound/conversations");
  }, 60000);
  beforeEach(async () => {
    setSystemTime(now);
    const { store, db, schema } = active();
    await db.execute(
      sql`truncate outbound_campaign_company, outbound_campaign, outbound_integration_job, outbound_send_attempt, outbound_event, outbound_revision, outbound_prospect, outbound_person, outbound_company, outbound_suppression, outbound_inbox, outbound_playbook cascade`,
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

  const savedContact = async () => {
    const { store } = active();
    required(
      await store.savePlaybook(actor, {
        ...settings,
        trustSavedContactVerification: true,
      }),
    );
    return required(
      await store.saveProspect(LEGACY_CONTACT_IMPORT_ACTOR, {
        ...details(),
        emailVerifiedAt: "",
        roleSource: "",
        roleCheckedAt: "",
        emailSource: "StoreInspect (verified)",
        source:
          "legacy W46: StoreInspect export 2026-11-10 (A: $500K-$10M, marketing/e-com contact)",
      }),
    );
  };

  test("saved contact acceptance keeps unknown dates and binds the source before approval", async () => {
    const { store, db, schema } = active();
    const imported = await savedContact();
    const accepted = required(await store.trustSavedContact(actor, imported));
    const repeated = required(await store.trustSavedContact(actor, accepted));
    expect(repeated.verificationId).toBe(accepted.verificationId);
    const stored = (
      await db
        .select()
        .from(schema.outboundProspect)
        .where(eq(schema.outboundProspect.id, imported.prospect))
    )[0];
    if (!stored) throw new Error("Saved prospect missing");
    expect(stored.details.emailVerifiedAt).toBe("");
    expect(stored.details.roleCheckedAt).toBe("");
    const draft = required(await draftSyntheticProspect(actor, repeated));
    expect(
      (
        await store.reviewProspect(actor, {
          ...imported,
          revision: draft.revision,
          decision: "approve",
        })
      ).success,
    ).toBe(true);
    const changed = required(
      await store.patchProspect(actor, imported.prospect, {
        title: "VP Marketing",
      }),
    );
    const changedDraft = await draftSyntheticProspect(actor, changed);
    expect(changedDraft.success).toBe(false);
    if (!changedDraft.success)
      expect(changedDraft.error.message).toContain(
        "research no longer matches",
      );
    expect(
      (await store.reviewProspect(actor, { ...changed, decision: "approve" }))
        .success,
    ).toBe(false);
    expect((await store.trustSavedContact(actor, changed)).success).toBe(false);
  });

  test("manual labels and disabled policy cannot accept an imported verification receipt", async () => {
    const { store } = active();
    const imported = await savedContact();
    required(await store.savePlaybook(actor, settings));
    expect((await store.trustSavedContact(actor, imported)).success).toBe(
      false,
    );
    required(
      await store.savePlaybook(actor, {
        ...settings,
        trustSavedContactVerification: true,
      }),
    );
    const manual = required(
      await store.saveProspect(actor, {
        ...details("anotherbrand.com"),
        source:
          "legacy W46: StoreInspect export 2026-11-10 (A: $500K-$10M, marketing/e-com contact)",
        emailSource: "StoreInspect (verified)",
      }),
    );
    expect((await store.trustSavedContact(actor, manual)).success).toBe(false);
  });

  test("automatic saved-contact drafting checks revision and respects an operator hold", async () => {
    const { store, db, schema } = active();
    const imported = await savedContact();
    const accepted = required(await store.trustSavedContact(actor, imported));
    await expect(
      db.transaction((transaction) =>
        store.generateDraftsWithin(transaction, actor, {
          prospect: imported.prospect,
          expectedRevision: imported.revision,
        }),
      ),
    ).rejects.toThrow("completed writing job");
    await expect(
      db.transaction((transaction) =>
        store.generateDraftsWithin(transaction, actor, {
          prospect: imported.prospect,
          expectedRevision: accepted.revision,
        }),
      ),
    ).rejects.toThrow("completed writing job");
    const draft = required(await draftSyntheticProspect(actor, accepted));
    expect(draft.revision).toBeGreaterThan(accepted.revision);
    await db
      .update(schema.outboundProspect)
      .set({ status: "held", holdReason: "operator hold" })
      .where(eq(schema.outboundProspect.id, imported.prospect));
    await expect(
      db.transaction((transaction) =>
        store.generateDraftsWithin(transaction, actor, {
          prospect: imported.prospect,
          expectedRevision: draft.revision,
        }),
      ),
    ).rejects.toThrow("completed writing job");
  });

  test("preparation reads suppression in its existing transaction", async () => {
    const { store, db, schema } = active();
    const imported = await savedContact();
    await db.transaction(async (transaction) => {
      await transaction.insert(schema.outboundSuppression).values({
        scope: "domain",
        value: "samplegoods.com",
        reason: "operator hold",
        createdBy: actor,
      });
      expect(
        required(
          await store.getEnrichmentContext(imported.prospect, transaction),
        ).suppressed,
      ).toBe(true);
    });
  });

  test("dispatch rechecks the accepted source and never invokes SMTP for a changed receipt", async () => {
    const { store, db, schema } = active();
    const imported = await savedContact();
    const accepted = required(await store.trustSavedContact(actor, imported));
    const draft = required(await draftSyntheticProspect(actor, accepted));
    required(
      await store.reviewProspect(actor, {
        ...imported,
        revision: draft.revision,
        decision: "approve",
      }),
    );
    required(
      await store.savePlaybook(actor, {
        ...settings,
        trustSavedContactVerification: true,
        sendingEnabled: true,
      }),
    );
    const inbox = (
      await db
        .select()
        .from(schema.outboundInbox)
        .where(
          eq(
            schema.outboundInbox.email,
            senderFor(imported.prospect, settings),
          ),
        )
    )[0];
    if (!inbox) throw new Error("Assigned inbox missing");
    const claim = required(
      await store.claimDelivery(actor, {
        ...imported,
        inbox: inbox.id,
      }),
    );
    await db
      .update(schema.outboundIntegrationJob)
      .set({ status: "failed" })
      .where(eq(schema.outboundIntegrationJob.id, accepted.verificationId));
    const send = mock(async () => ({
      success: true as const,
      data: { providerMessageId: "must-not-send", threadId: "must-not-send" },
    }));
    expect((await store.dispatchDelivery(actor, claim, send)).success).toBe(
      false,
    );
    expect(send).not.toHaveBeenCalled();
  });

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
  test("editing an unrelated sender profile preserves an exact existing approval", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const before = required(await store.readProspect(fixture.prospect));
    if (!before) throw new Error("Missing prospect");
    const policy = await store.policy();
    const added = {
      email: "mario@joinecentic.com",
      fromName: "Mario",
      signature: "Mario",
      founderLine: "I'm Mario from ecentic.",
      productCheckIntro: "I'm Mario from ecentic.",
      voiceNotes: "Speak plainly.",
    };
    required(
      await store.savePlaybook(actor, {
        ...policy.settings,
        inactiveSenderEmails: added.email,
        senderProfiles: [...policy.settings.senderProfiles, added],
      }),
    );
    const after = required(await store.readProspect(fixture.prospect));
    expect(after?.status).toBe("approved");
    expect(after?.approvalHash).toBe(before.approvalHash);
    expect(after?.revision).toBe(before.revision);
    expect((await store.policy()).revision).toBe(policy.revision);
    expect(after?.messages).toEqual(before.messages);
    const versions = await db
      .select()
      .from(schema.outboundRevision)
      .where(eq(schema.outboundRevision.prospectId, fixture.prospect));
    expect(versions.at(-1)?.revokedAt).toBeNull();
    expect((await store.claimDelivery(actor, fixture)).success).toBe(true);
  });
  test("four explicit sender activations preserve a legacy primary sender's exact active follow-up", async () => {
    const { store, db, schema } = active();
    const mailboxes = await import("@/server/app/outbound/transport-store");
    const profiles = ["Xhurian", "Mario", "Arbi", "Alvi"].map(
      (name, index) => ({
        email: `${["xhuri", "mario", "arbi", "alvi"][index]}@joinecentic.com`,
        fromName: name,
        signature: name,
        founderLine: `I'm ${name} from ecentic.`,
        productCheckIntro: `I'm ${name} from ecentic. We help stores with product details.`,
        voiceNotes: "Use clear, friendly wording.",
      }),
    );
    const legacy = {
      ...settings,
      fromEmail: "iseld@joinecentic.com",
      senderEmails: "iseld@joinecentic.com",
      inactiveSenderEmails: profiles.map((profile) => profile.email).join("\n"),
      senderProfiles: [],
      fromName: "Iseld",
      signature: "Iseld",
      founderLine: "I'm Iseld, formerly with Shopify Plus.",
      productCheckIntro: "I'm Iseld, formerly with Shopify Plus.",
    };
    required(await store.savePlaybook(actor, legacy));
    const primary = (
      await db
        .insert(schema.outboundInbox)
        .values({
          email: legacy.fromEmail,
          fromName: legacy.fromName,
          signer: legacy.signature,
          enabled: true,
          refreshToken: "fixture-refresh",
          lastSyncedAt: now,
        })
        .returning()
    )[0];
    if (!primary) throw new Error("Missing primary inbox");
    const created = required(await store.saveProspect(actor, details()));
    const draft = required(await draftSyntheticProspect(actor, created));
    required(
      await store.reviewProspect(actor, {
        ...created,
        revision: draft.revision,
        decision: "approve",
      }),
    );
    required(
      await store.savePlaybook(actor, { ...legacy, sendingEnabled: true }),
    );
    const claim = required(
      await store.claimDelivery(actor, { ...created, inbox: primary.id }),
    );
    required(
      await store.dispatchDelivery(actor, claim, async () => ({
        success: true,
        data: {
          providerMessageId: "legacy-primary-first",
          threadId: "legacy-primary-thread",
        },
      })),
    );
    const before = required(await store.readProspect(created.prospect));
    if (!before) throw new Error("Missing original sequence");
    const { assignedSenderEmail: _assignment, ...oldDetails } = before.details;
    await db
      .update(schema.outboundProspect)
      .set({ details: oldDetails })
      .where(eq(schema.outboundProspect.id, before.id));
    const revision = (await store.policy()).revision;
    const original = (
      await db
        .select()
        .from(schema.outboundRevision)
        .where(eq(schema.outboundRevision.prospectId, before.id))
    )[0];
    expect(original?.manifest.senderProfile).toBeUndefined();
    for (const profile of profiles) {
      const inbox = (
        await db
          .insert(schema.outboundInbox)
          .values({
            email: profile.email,
            fromName: profile.email,
            signer: "",
            enabled: false,
            dailyCap: 9,
            refreshToken: "fixture-refresh",
            lastSyncedAt: now,
          })
          .returning()
      )[0];
      if (!inbox) throw new Error("Missing secondary inbox");
      expect(
        (
          await mailboxes.configure(actor, {
            inboxId: inbox.id,
            enabled: true,
            dailyCap: 9,
          })
        ).success,
      ).toBe(false);
      const { email: _email, ...editable } = profile;
      required(
        await mailboxes.configure(actor, {
          inboxId: inbox.id,
          enabled: true,
          dailyCap: 9,
          profile: editable,
        }),
      );
      expect(required(await mailboxes.read(inbox.id))).toMatchObject({
        enabled: true,
        fromName: profile.fromName,
        signer: profile.signature,
        dailyCap: 9,
      });
    }
    const after = required(await store.readProspect(before.id));
    expect(after).toMatchObject({
      status: "active",
      inboxId: primary.id,
      revision: before.revision,
      approvalHash: before.approvalHash,
      messages: before.messages,
    });
    expect(after?.details.assignedSenderEmail).toBe(legacy.fromEmail);
    expect((await store.policy()).revision).toBe(revision);
    expect((await store.policy()).settings.fromName).toBe("Iseld");
    const later = "2026-11-12T17:00:00Z";
    setSystemTime(new Date(later));
    required(
      await store.patchProspect(
        actor,
        before.id,
        {
          mxCheckedAt: later,
          emailVerifiedAt: later,
        },
        before.revision,
      ),
    );
    await db
      .update(schema.outboundInbox)
      .set({ lastSyncedAt: new Date(later) })
      .where(eq(schema.outboundInbox.id, primary.id));
    const followup = required(
      await store.claimDelivery(actor, {
        prospect: before.id,
        inbox: primary.id,
      }),
    );
    expect(followup.step).toBe(2);
    expect(followup.manifest.sender).toBe(legacy.fromEmail);
    expect(followup.manifest.fromName).toBe("Iseld");
    expect(followup.manifest.signature).toBe("Iseld");
  });
  test("changing an assigned identity holds only its unsent approved draft", async () => {
    const { store } = active();
    const fixture = await approved();
    const before = required(await store.readProspect(fixture.prospect));
    if (!before) throw new Error("Missing prospect");
    const current = await store.policy();
    const email = before.details.assignedSenderEmail;
    required(
      await store.savePlaybook(actor, {
        ...current.settings,
        senderProfiles: current.settings.senderProfiles.map((profile) =>
          profile.email === email
            ? { ...profile, productCheckIntro: "I'm a team member at ecentic." }
            : profile,
        ),
      }),
    );
    const held = required(await store.readProspect(fixture.prospect));
    expect(held?.status).toBe("held");
    expect(held?.holdReason).toBe("senderProfileChanged");
    expect(held?.approvalHash).toBeNull();
    expect(held?.messages).toEqual(before.messages);
    expect((await store.policy()).revision).toBe(current.revision);
    expect((await store.claimDelivery(actor, fixture)).success).toBe(false);
  });
  test("a started sender identity cannot change while its sequence is active", async () => {
    const { store } = active();
    const fixture = await sentSequence();
    const before = required(await store.readProspect(fixture.prospect));
    const policy = await store.policy();
    const changed = await store.savePlaybook(actor, {
      ...policy.settings,
      senderProfiles: policy.settings.senderProfiles.map((profile) =>
        profile.email === before?.details.assignedSenderEmail
          ? { ...profile, signature: "Somebody else" }
          : profile,
      ),
    });
    expect(changed.success).toBe(false);
    expect(required(await store.readProspect(fixture.prospect))).toMatchObject({
      status: "active",
      inboxId: fixture.inbox,
      approvalHash: before?.approvalHash,
      messages: before?.messages,
    });
    expect((await store.policy()).settings.senderProfiles).toEqual(
      policy.settings.senderProfiles,
    );
  });
  test("secondary drafts bind their own author through approval and recheck identity at dispatch", async () => {
    const { store, db, schema } = active();
    const identity = {
      email: "mario@joinecentic.com",
      fromName: "Mario",
      signature: "Mario",
      founderLine: "I'm Mario from ecentic.",
      productCheckIntro:
        "I'm Mario from ecentic. We help stores with product details.",
      voiceNotes: "Use plain language.",
    };
    const policy = {
      ...settings,
      senderEmails: identity.email,
      senderProfiles: [identity],
    };
    required(await store.savePlaybook(actor, policy));
    const inbox = (
      await db
        .insert(schema.outboundInbox)
        .values({
          email: identity.email,
          fromName: identity.fromName,
          signer: identity.signature,
          enabled: true,
          refreshToken: "fixture-refresh",
          lastSyncedAt: now,
        })
        .returning()
    )[0];
    if (!inbox) throw new Error("Missing sender");
    const prospect = required(
      await store.saveProspect(actor, {
        ...details(),
        assignedSenderEmail: defaultPlaybook.fromEmail,
      }),
    );
    const draft = required(await draftSyntheticProspect(actor, prospect));
    const prepared = required(await store.readProspect(prospect.prospect));
    expect(prepared?.details.assignedSenderEmail).toBe(identity.email);
    expect(prepared?.messages[0]?.body).toContain(identity.founderLine);
    expect(prepared?.messages[0]?.body.endsWith(identity.signature)).toBe(true);
    required(
      await store.reviewProspect(actor, {
        ...prospect,
        revision: draft.revision,
        decision: "approve",
      }),
    );
    required(
      await store.savePlaybook(actor, { ...policy, sendingEnabled: true }),
    );
    const claim = required(
      await store.claimDelivery(actor, { ...prospect, inbox: inbox.id }),
    );
    expect(claim.manifest).toMatchObject({
      sender: identity.email,
      fromName: identity.fromName,
      signature: identity.signature,
      senderProfile: {
        founderLine: identity.founderLine,
        productCheckIntro: identity.productCheckIntro,
      },
    });
    await db
      .update(schema.outboundInbox)
      .set({ fromName: "Iseld" })
      .where(eq(schema.outboundInbox.id, inbox.id));
    const calls: string[] = [];
    const dispatched = await store.dispatchDelivery(actor, claim, async () => {
      calls.push("send");
      return {
        success: true,
        data: {
          providerMessageId: "should-not-send",
          threadId: "wrong-author",
        },
      };
    });
    expect(dispatched.success).toBe(false);
    expect(calls).toEqual([]);
  });
  test("removing a pinned sender from the pool stops its reserved delivery without reassigning it", async () => {
    const { store } = active();
    const fixture = await approved();
    const claim = required(await store.claimDelivery(actor, fixture));
    const before = required(await store.readProspect(fixture.prospect));
    const policy = await store.policy();
    const pool = policy.settings.senderEmails
      .split("\n")
      .filter((email) => email !== claim.manifest.sender);
    required(
      await store.savePlaybook(actor, {
        ...policy.settings,
        senderEmails: pool.join("\n"),
        inactiveSenderEmails: claim.manifest.sender,
      }),
    );
    const calls: string[] = [];
    const sent = await store.dispatchDelivery(actor, claim, async () => {
      calls.push("send");
      return {
        success: true,
        data: { providerMessageId: "unwanted", threadId: "unwanted" },
      };
    });
    expect(sent.success).toBe(false);
    expect(calls).toEqual([]);
    expect(
      required(await store.readProspect(fixture.prospect))?.details
        .assignedSenderEmail,
    ).toBe(before?.details.assignedSenderEmail);
  });
  test("an inbox can be disabled with its unchanged profile while global sending stays enabled", async () => {
    const { store } = active();
    const mailboxes = await import("@/server/app/outbound/transport-store");
    const fixture = await approved();
    const inbox = required(await mailboxes.read(fixture.inbox));
    if (!inbox) throw new Error("Missing inbox");
    const profile = settings.senderProfiles.find(
      (profile) => profile.email === inbox.email,
    );
    if (!profile) throw new Error("Missing profile");
    const { email: _email, ...editable } = profile;
    required(
      await mailboxes.configure(actor, {
        inboxId: inbox.id,
        enabled: false,
        dailyCap: inbox.dailyCap,
        profile: editable,
      }),
    );
    expect(required(await mailboxes.read(inbox.id))?.enabled).toBe(false);
    expect((await store.policy()).settings.sendingEnabled).toBe(true);
    expect((await store.claimDelivery(actor, fixture)).success).toBe(false);
  });
  test("a stale Playbook form cannot erase newly activated senders, but current pool edits remain possible", async () => {
    const { store, db, schema } = active();
    await approved();
    const opened = await store.policy();
    const identity = {
      email: "mario@joinecentic.com",
      fromName: "Mario",
      signature: "Mario",
      founderLine: "I'm Mario from ecentic.",
      productCheckIntro: "I'm Mario from ecentic.",
      voiceNotes: "Keep it clear.",
    };
    await db.insert(schema.outboundInbox).values({
      email: identity.email,
      fromName: identity.fromName,
      signer: identity.signature,
      enabled: true,
      refreshToken: "fixture-refresh",
      lastSyncedAt: now,
    });
    required(
      await store.savePlaybook(actor, {
        ...opened.settings,
        senderEmails: `${opened.settings.senderEmails}\n${identity.email}`,
        senderProfiles: [...opened.settings.senderProfiles, identity],
      }),
    );
    const stale = await store.savePlaybookForm(actor, {
      settings: opened.settings,
      expectedRevision: opened.revision,
      expectedSenderPool: {
        senderEmails: opened.settings.senderEmails,
        inactiveSenderEmails: opened.settings.inactiveSenderEmails,
      },
    });
    expect(stale.success).toBe(false);
    expect((await store.policy()).settings.senderEmails).toContain(
      identity.email,
    );
    const current = await store.policy();
    required(
      await store.savePlaybookForm(actor, {
        settings: {
          ...current.settings,
          senderProfiles: [],
          senderEmails: opened.settings.senderEmails,
          inactiveSenderEmails: identity.email,
        },
        expectedRevision: current.revision,
        expectedSenderPool: {
          senderEmails: current.settings.senderEmails,
          inactiveSenderEmails: current.settings.inactiveSenderEmails,
        },
      }),
    );
    expect((await store.policy()).settings.senderEmails).toBe(
      opened.settings.senderEmails,
    );
    expect((await store.policy()).settings.senderProfiles).toEqual(
      current.settings.senderProfiles,
    );
    const baseline = await store.policy();
    required(
      await store.savePlaybook(actor, {
        ...baseline.settings,
        callToAction: "Would this be worth discussing?",
      }),
    );
    const changed = await store.savePlaybookForm(actor, {
      settings: baseline.settings,
      expectedRevision: baseline.revision,
      expectedSenderPool: {
        senderEmails: baseline.settings.senderEmails,
        inactiveSenderEmails: baseline.settings.inactiveSenderEmails,
      },
    });
    expect(changed.success).toBe(false);
    expect((await store.policy()).settings.callToAction).toBe(
      "Would this be worth discussing?",
    );
  });
  test("changing the company discovery target preserves approved messages and schedules", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const policy = await store.policy();
    const prospect = required(await store.readProspect(fixture.prospect));
    const versions = await db
      .select()
      .from(schema.outboundRevision)
      .where(eq(schema.outboundRevision.prospectId, fixture.prospect));
    expect(prospect?.status).toBe("approved");
    expect(prospect?.approvalHash).toBeTruthy();
    const saved = required(
      await store.savePlaybook(
        actor,
        { ...policy.settings, dailyCompanyTarget: 150 },
        policy.revision,
      ),
    );
    expect(saved.revision).toBe(policy.revision);
    expect((await store.policy()).settings.dailyCompanyTarget).toBe(150);
    expect(required(await store.readProspect(fixture.prospect))).toEqual(
      prospect,
    );
    expect(
      await db
        .select()
        .from(schema.outboundRevision)
        .where(eq(schema.outboundRevision.prospectId, fixture.prospect)),
    ).toEqual(versions);
    expect((await store.claimDelivery(actor, fixture)).success).toBe(true);
  });
  test("changing observation-age tolerance preserves approved content and schedules", async () => {
    const { store } = active();
    const fixture = await approved();
    const policy = await store.policy();
    const prospect = required(await store.readProspect(fixture.prospect));
    const saved = required(
      await store.savePlaybook(
        actor,
        { ...policy.settings, allowStaleEvidence: true },
        policy.revision,
      ),
    );
    expect(saved.revision).toBe(policy.revision);
    expect((await store.policy()).settings.allowStaleEvidence).toBe(true);
    expect(required(await store.readProspect(fixture.prospect))).toEqual(
      prospect,
    );
    expect((await store.claimDelivery(actor, fixture)).success).toBe(true);
  });
  test("toggling the US market window preserves approved content and known-zone schedules", async () => {
    const { store } = active();
    const fixture = await approved();
    const before = required(await store.readProspect(fixture.prospect));
    const policy = await store.policy();
    for (const allowUsMarketWindow of [true, false]) {
      const saved = required(
        await store.savePlaybook(
          actor,
          { ...policy.settings, allowUsMarketWindow },
          policy.revision,
        ),
      );
      expect(saved.revision).toBe(policy.revision);
      expect(required(await store.readProspect(fixture.prospect))).toEqual(
        before,
      );
    }
    expect((await store.claimDelivery(actor, fixture)).success).toBe(true);
  });
  test("toggling Microsoft recipient eligibility preserves approved content, revisions and schedules", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const before = required(await store.readProspect(fixture.prospect));
    const policy = await store.policy();
    const revisions = await db
      .select()
      .from(schema.outboundRevision)
      .where(eq(schema.outboundRevision.prospectId, fixture.prospect));
    for (const allowMicrosoftRecipients of [true, false]) {
      const saved = required(
        await store.savePlaybook(
          actor,
          { ...policy.settings, allowMicrosoftRecipients },
          policy.revision,
        ),
      );
      expect(saved.revision).toBe(policy.revision);
      expect(required(await store.readProspect(fixture.prospect))).toEqual(
        before,
      );
      expect(
        await db
          .select()
          .from(schema.outboundRevision)
          .where(eq(schema.outboundRevision.prospectId, fixture.prospect)),
      ).toEqual(revisions);
    }
    expect((await store.claimDelivery(actor, fixture)).success).toBe(true);
  });
  test("verified Microsoft delivery requires opt-in and rechecks it immediately before transport", async () => {
    const { store, db, schema } = active();
    const created = required(
      await store.saveProspect(actor, {
        ...details(),
        mxProvider: "microsoft",
      }),
    );
    const draft = required(await draftSyntheticProspect(actor, created));
    const review = {
      ...created,
      revision: draft.revision,
      decision: "approve" as const,
    };
    expect((await store.reviewProspect(actor, review)).success).toBe(false);
    const policy = await store.policy();
    const saved = required(
      await store.savePlaybook(
        actor,
        {
          ...policy.settings,
          allowMicrosoftRecipients: true,
          sendingEnabled: true,
        },
        policy.revision,
      ),
    );
    expect(saved.revision).toBe(policy.revision);
    required(await store.reviewProspect(actor, review));
    const inbox = (
      await db
        .select()
        .from(schema.outboundInbox)
        .where(
          eq(schema.outboundInbox.email, senderFor(created.prospect, settings)),
        )
    )[0];
    if (!inbox) throw new Error("Assigned inbox missing");
    const claim = required(
      await store.claimDelivery(actor, { ...created, inbox: inbox.id }),
    );
    const before = required(await store.readProspect(created.prospect));
    required(
      await store.savePlaybook(
        actor,
        { ...(await store.policy()).settings, allowMicrosoftRecipients: false },
        policy.revision,
      ),
    );
    expect(required(await store.readProspect(created.prospect))).toEqual(
      before,
    );
    const send = mock(async () => ({
      success: true as const,
      data: { providerMessageId: "must-not-send", threadId: "must-not-send" },
    }));
    expect((await store.dispatchDelivery(actor, claim, send)).success).toBe(
      false,
    );
    expect(send).not.toHaveBeenCalled();
  });
  test("unknown-zone US delivery waits for the market window and rechecks the preference at dispatch", async () => {
    const { store, db, schema } = active();
    required(
      await store.savePlaybook(actor, {
        ...settings,
        allowUsMarketWindow: true,
      }),
    );
    const created = required(
      await store.saveProspect(actor, { ...details(), timezone: "" }),
    );
    const drafted = required(await draftSyntheticProspect(actor, created));
    required(
      await store.reviewProspect(actor, {
        ...created,
        revision: drafted.revision,
        decision: "approve",
      }),
    );
    required(
      await store.savePlaybook(actor, {
        ...settings,
        allowUsMarketWindow: true,
        sendingEnabled: true,
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
    if (!inbox) throw new Error("Assigned inbox missing");
    const fixture = { ...created, revision: drafted.revision, inbox: inbox.id };
    const outside = await store.claimDelivery(actor, fixture);
    expect(outside.success).toBe(false);
    if (!outside.success)
      expect(outside.error.message).toContain("sending window");
    setSystemTime(new Date("2026-11-09T18:00:00Z"));
    await db.update(schema.outboundInbox).set({ lastSyncedAt: new Date() });
    const claim = required(await store.claimDelivery(actor, fixture));
    const policy = await store.policy();
    const before = required(await store.readProspect(created.prospect));
    required(
      await store.savePlaybook(
        actor,
        { ...policy.settings, allowUsMarketWindow: false },
        policy.revision,
      ),
    );
    expect(required(await store.readProspect(created.prospect))).toEqual(
      before,
    );
    expect(before?.details.timezone).toBe("");
    const send = mock(async () => ({
      success: true as const,
      data: { providerMessageId: "must-not-send", threadId: "must-not-send" },
    }));
    expect((await store.dispatchDelivery(actor, claim, send)).success).toBe(
      false,
    );
    expect(send).not.toHaveBeenCalled();
  });
  test("refreshing receipts on a pre-deployment row preserves approval when new defaults are missing", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    await db
      .update(schema.outboundProspect)
      .set({
        details: sql`${schema.outboundProspect.details} - 'savedContactVerificationId'`,
      })
      .where(eq(schema.outboundProspect.id, fixture.prospect));
    const before = required(await store.readProspect(fixture.prospect));
    if (!before) throw new Error("Approved fixture missing");
    const saved = required(
      await store.patchProspect(
        actor,
        fixture.prospect,
        { mxCheckedAt: now.toISOString() },
        fixture.revision,
      ),
    );
    const after = required(await store.readProspect(fixture.prospect));
    if (!after) throw new Error("Patched fixture missing");
    expect(saved.revision).toBe(fixture.revision);
    expect(after.approvalHash).toBe(before.approvalHash);
    expect(after.status).toBe("approved");
    expect(after.nextSendAt).toEqual(before.nextSendAt);
    expect(after.details.savedContactVerificationId).toBe("");
    expect((await store.claimDelivery(actor, fixture)).success).toBe(true);
  });
  const receiptIncident = async (sent: boolean) => {
    const { store, db, schema } = active();
    const fixture = sent ? await sentSequence() : await approved();
    const before = required(await store.readProspect(fixture.prospect));
    if (!before?.nextSendAt)
      throw new Error("Approved incident fixture missing");
    // Reproduce the old normalization path, which saved unchanged details as an edit.
    required(
      await store.saveProspect("outbound-worker", {
        ...before.details,
        id: before.id,
      }),
    );
    const after = required(await store.readProspect(fixture.prospect));
    const versions = await db
      .select()
      .from(schema.outboundRevision)
      .where(eq(schema.outboundRevision.prospectId, fixture.prospect));
    const version = versions.find(
      (version) => version.revision === before.revision,
    );
    const events = await db
      .select()
      .from(schema.outboundEvent)
      .where(eq(schema.outboundEvent.prospectId, fixture.prospect));
    const incident = events.find(
      (event) =>
        event.kind === "prospectUpdated" && event.actor === "outbound-worker",
    );
    if (!after || !version || !incident)
      throw new Error("Incident snapshot missing");
    await db
      .update(schema.outboundEvent)
      .set({ createdAt: after.updatedAt })
      .where(eq(schema.outboundEvent.id, incident.id));
    return {
      before,
      after,
      fixture,
      input: {
        prospect: before.id,
        revision: after.revision,
        updatedAt: after.updatedAt.toISOString(),
        incidentEventId: incident.id,
        priorRevisionId: version.id,
        contentHash: version.contentHash,
        nextSendAt: before.nextSendAt.toISOString(),
        snapshot: "isolated-test/pre-incident.json",
      },
    };
  };
  test.each([false, true])(
    "audited receipt recovery preserves the original approval and delivery timeline (sent=%s)",
    async (sent) => {
      const { store, db, schema } = active();
      const incident = await receiptIncident(sent);
      required(
        await store.restoreReceiptNormalizationApproval(actor, incident.input),
      );
      const restored = required(await store.readProspect(incident.before.id));
      if (!restored) throw new Error("Restored fixture missing");
      for (const key of [
        "revision",
        "status",
        "messages",
        "approvalHash",
        "approvedAt",
        "approvedBy",
        "sentStep",
        "firstSentAt",
        "lastSentAt",
        "nextSendAt",
        "inboxId",
        "threadId",
      ] as const)
        expect(restored[key]).toEqual(incident.before[key]);
      const events = await db
        .select()
        .from(schema.outboundEvent)
        .where(eq(schema.outboundEvent.prospectId, incident.before.id));
      expect(
        events.filter((event) => event.kind === "approvalRestored"),
      ).toHaveLength(1);
      expect(
        (await store.restoreReceiptNormalizationApproval(actor, incident.input))
          .success,
      ).toBe(false);
    },
  );
  test.each(["edited", "suppressed", "replied", "source", "schedule"])(
    "receipt recovery refuses %s changes and leaves the revocation intact",
    async (change) => {
      const { store, db, schema } = active();
      const incident = await receiptIncident(true);
      if (change === "edited")
        await db
          .update(schema.outboundProspect)
          .set({
            messages: incident.after.messages.map((message) => ({
              ...message,
              body: `${message.body} Changed.`,
            })),
          })
          .where(eq(schema.outboundProspect.id, incident.before.id));
      if (change === "suppressed")
        await db.insert(schema.outboundSuppression).values({
          scope: "email",
          value: incident.before.details.email,
          reason: "Opted out",
          createdBy: actor,
        });
      if (change === "replied")
        await db
          .update(schema.outboundConversation)
          .set({
            lastInboundAt: now,
          })
          .where(
            eq(schema.outboundConversation.prospectId, incident.before.id),
          );
      if (change === "source")
        await db
          .update(schema.outboundProspect)
          .set({
            details: { ...incident.after.details, emailStatus: "unknown" },
          })
          .where(eq(schema.outboundProspect.id, incident.before.id));
      const result = await store.restoreReceiptNormalizationApproval(actor, {
        ...incident.input,
        ...(change === "schedule" ? { nextSendAt: now.toISOString() } : {}),
      });
      expect(result.success).toBe(false);
      const unchanged = required(await store.readProspect(incident.before.id));
      expect(unchanged?.revision).toBe(incident.after.revision);
      expect(unchanged?.status).toBe("held");
      expect(unchanged?.approvalHash).toBeNull();
      const version = (
        await db
          .select()
          .from(schema.outboundRevision)
          .where(eq(schema.outboundRevision.id, incident.input.priorRevisionId))
      )[0];
      expect(version?.revokedAt).toBeTruthy();
    },
  );
  test("allowing product observations preserves already approved messages and schedules", async () => {
    const { store } = active();
    const fixture = await approved();
    const policy = await store.policy();
    const prospect = required(await store.readProspect(fixture.prospect));
    const saved = required(
      await store.savePlaybook(
        actor,
        { ...policy.settings, allowProductObservations: true },
        policy.revision,
      ),
    );
    expect(saved.revision).toBe(policy.revision);
    expect((await store.policy()).settings.allowProductObservations).toBe(true);
    expect(required(await store.readProspect(fixture.prospect))).toEqual(
      prospect,
    );
    expect((await store.claimDelivery(actor, fixture)).success).toBe(true);
  });
  test.each(["closed", "notInterested", "meetingBooked", "meetingHeld"])(
    "manual %s pauses both cold sequences without fabricating a reply, and reopening keeps them paused",
    async (stage) => {
      const { store, conversations, db, schema } = active();
      const fixture = await sentSequence();
      await db
        .update(schema.outboundProspect)
        .set({
          linkedinStatus: "invited",
          linkedinNextActionAt: new Date(now.getTime() + 86400000),
        })
        .where(eq(schema.outboundProspect.id, fixture.prospect));
      const before = required(await store.readProspect(fixture.prospect));
      expect(before?.status).toBe("active");
      expect(before?.nextSendAt).not.toBeNull();
      required(
        await conversations.updateStage(actor, {
          id: fixture.thread.id,
          expectedRevision: fixture.thread.revision,
          stage,
        }),
      );
      const paused = required(await store.readProspect(fixture.prospect));
      expect(paused).toMatchObject({
        status: "held",
        approvedAt: null,
        approvedBy: null,
        approvalHash: null,
        nextSendAt: null,
        linkedinStatus: "closed",
        linkedinNextActionAt: null,
        sentStep: 1,
      });
      expect(paused?.holdReason).toContain("Automatic outreach paused");
      const versions = await db
        .select()
        .from(schema.outboundRevision)
        .where(eq(schema.outboundRevision.prospectId, fixture.prospect));
      expect(
        versions.find((version) => version.revision === fixture.revision)
          ?.revokedAt,
      ).not.toBeNull();
      expect(await db.select().from(schema.outboundSuppression)).toHaveLength(
        0,
      );
      const updated = required(
        await conversations.get({ id: fixture.prospect }),
      );
      expect(
        updated.messages.every((message) => message.direction === "outbound"),
      ).toBe(true);
      const outcomes = await db.select().from(schema.outboundEvent);
      expect(
        outcomes.some((entry) =>
          ["reply", "positive", "negative", "optout", "meeting"].includes(
            entry.kind,
          ),
        ),
      ).toBe(false);
      required(
        await conversations.updateStage(actor, {
          id: updated.thread.id,
          expectedRevision: updated.thread.revision,
          stage: "open",
        }),
      );
      expect(required(await store.readProspect(fixture.prospect))).toEqual(
        paused,
      );
      expect((await store.claimDelivery(actor, fixture)).success).toBe(false);
    },
  );
  test.each([
    { kind: "optout", status: "optedOut" },
    { kind: "bounce", status: "bounced" },
    { kind: "reply", status: "replied" },
  ])(
    "manual meeting stage preserves stronger $status state and existing suppression",
    async ({ kind, status }) => {
      const { store, conversations, db, schema } = active();
      const fixture = await sentSequence();
      required(
        await store.recordOutcome(actor, {
          prospect: fixture.prospect,
          kind,
          note: "Existing outcome",
        }),
      );
      if (status === "replied")
        await db
          .update(schema.outboundProspect)
          .set({ linkedinStatus: "replied" })
          .where(eq(schema.outboundProspect.id, fixture.prospect));
      const suppressions = await db.select().from(schema.outboundSuppression);
      required(
        await conversations.updateStage(actor, {
          id: fixture.thread.id,
          expectedRevision: fixture.thread.revision,
          stage: "meetingBooked",
        }),
      );
      const after = required(await store.readProspect(fixture.prospect));
      expect(after?.status).toBe(status);
      expect(after?.nextSendAt).toBeNull();
      expect(after?.approvalHash).toBeNull();
      expect(after?.linkedinStatus).toBe(
        status === "replied" ? "replied" : "closed",
      );
      expect(await db.select().from(schema.outboundSuppression)).toEqual(
        suppressions,
      );
    },
  );
  test("a manually closed conversation blocks dispatch of an already claimed follow-up", async () => {
    const { store, conversations } = active();
    const fixture = await claimedFollowup();
    required(
      await conversations.updateStage(actor, {
        id: fixture.thread.id,
        expectedRevision: fixture.thread.revision,
        stage: "closed",
      }),
    );
    const send = mock(async () => ({
      success: true as const,
      data: { providerMessageId: "never-sent", threadId: "thread-stage" },
    }));
    expect(
      (await store.dispatchDelivery(actor, fixture.claim, send)).success,
    ).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(required(await store.readProspect(fixture.prospect))?.status).toBe(
      "held",
    );
  });
  test("a late acceptance receipt records the already claimed follow-up without undoing the conversation hold", async () => {
    const { store, conversations } = active();
    const fixture = await claimedFollowup();
    required(
      await conversations.updateStage(actor, {
        id: fixture.thread.id,
        expectedRevision: fixture.thread.revision,
        stage: "closed",
      }),
    );
    required(
      await store.completeDelivery(actor, {
        attempt: fixture.claim.attempt,
        status: "accepted",
        providerMessageId: "late-followup-receipt",
        threadId: "thread-stage",
      }),
    );
    const after = required(await store.readProspect(fixture.prospect));
    expect(after).toMatchObject({
      status: "held",
      sentStep: 2,
      nextSendAt: null,
      approvalHash: null,
      linkedinStatus: "closed",
      linkedinNextActionAt: null,
    });
    expect(after?.holdReason).toBe(
      "Conversation closed. Automatic outreach paused.",
    );
    const detail = required(await conversations.get({ id: fixture.prospect }));
    expect(detail.thread.stage).toBe("closed");
    expect(detail.messages).toHaveLength(2);
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
  test("the outreach date preserves approval and blocks a first email until its exact boundary", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const before = required(await store.readProspect(fixture.prospect));
    const policy = await store.policy();
    const boundary = new Date(now.getTime() + 60_000);
    const updated = required(
      await store.savePlaybook(
        actor,
        {
          ...policy.settings,
          outreachNotBefore: boundary.toISOString(),
        },
        policy.revision,
      ),
    );
    expect(updated.revision).toBe(policy.revision);
    expect(required(await store.readProspect(fixture.prospect))).toEqual(
      before,
    );
    expect((await store.claimDelivery(actor, fixture)).success).toBe(false);
    expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(0);
    setSystemTime(boundary);
    expect((await store.claimDelivery(actor, fixture)).success).toBe(true);
  });
  test("first approval persists its future release date without moving approval time or sending", async () => {
    const { store, db, schema } = active();
    const boundary = new Date(now.getTime() + 60_000);
    const fixture = await approved({
      ...settings,
      outreachNotBefore: boundary.toISOString(),
    });
    const row = required(await store.readProspect(fixture.prospect));
    expect(row?.nextSendAt?.toISOString()).toBe(boundary.toISOString());
    expect(row?.approvedAt?.toISOString()).toBe(now.toISOString());
    expect(row?.status).toBe("approved");
    expect(row?.sentStep).toBe(0);
    expect(row?.messages).toHaveLength(3);
    expect((await store.claimDelivery(actor, fixture)).success).toBe(false);
    expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(0);
    setSystemTime(boundary);
    expect((await store.claimDelivery(actor, fixture)).success).toBe(true);
  });
  test("an outreach date saved after claim stops SMTP without changing approved content", async () => {
    const { store } = active();
    const fixture = await approved();
    const claim = required(await store.claimDelivery(actor, fixture));
    const before = required(await store.readProspect(fixture.prospect));
    const policy = await store.policy();
    required(
      await store.savePlaybook(
        actor,
        {
          ...policy.settings,
          outreachNotBefore: new Date(now.getTime() + 60_000).toISOString(),
        },
        policy.revision,
      ),
    );
    const send = mock(async () => ({
      success: true as const,
      data: { providerMessageId: "never-sent", threadId: "never-started" },
    }));
    expect((await store.dispatchDelivery(actor, claim, send)).success).toBe(
      false,
    );
    expect(send).not.toHaveBeenCalled();
    expect(
      required(await store.readProspect(fixture.prospect))?.messages,
    ).toEqual(before?.messages);
    expect((await store.policy()).settings.sendingEnabled).toBe(true);
  });
  test("an older general Playbook form cannot clear the operator's outreach date", async () => {
    const { store } = active();
    const before = await store.policy();
    const outreachNotBefore = "2026-12-02T00:00:00.000Z";
    required(
      await store.savePlaybook(
        actor,
        { ...before.settings, outreachNotBefore },
        before.revision,
      ),
    );
    required(
      await store.savePlaybookForm(actor, {
        settings: before.settings,
        expectedRevision: before.revision,
        expectedSenderPool: {
          senderEmails: before.settings.senderEmails,
          inactiveSenderEmails: before.settings.inactiveSenderEmails,
        },
      }),
    );
    expect((await store.policy()).settings.outreachNotBefore).toBe(
      outreachNotBefore,
    );
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
  test("SMTP diagnostics survive dispatch as a sanitized audit without enabling replay", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const claim = required(await store.claimDelivery(actor, fixture));
    const smtp = { command: "RCPT TO", code: "EENVELOPE", responseCode: 550 };
    const send = mock(async () => ({
      success: false as const,
      error: new IntegrationError(
        "google",
        "uncertain",
        "direct-mailbox-unavailable",
        502,
        null,
        null,
        { smtp },
      ),
    }));
    expect(
      required(await store.dispatchDelivery(actor, claim, send)).status,
    ).toBe("uncertain");
    const [attempt] = await db.select().from(schema.outboundSendAttempt);
    expect(attempt).toMatchObject({
      status: "uncertain",
      error: "direct-mailbox-unavailable",
    });
    const [audit] = await db
      .select()
      .from(schema.outboundEvent)
      .where(eq(schema.outboundEvent.kind, "deliveryTransportFailure"));
    expect(JSON.parse(audit?.detail ?? "null")).toEqual({
      version: 1,
      transport: "smtp",
      attemptId: claim.attempt,
      source: "sequence",
      ...smtp,
    });
    expect((await store.dispatchDelivery(actor, claim, send)).success).toBe(
      false,
    );
    expect(send).toHaveBeenCalledTimes(1);
    await db.transaction(async (transaction) => {
      await store.recordSmtpFailureWithin(transaction, {
        actor,
        prospectId: fixture.prospect,
        attemptId: claim.attempt,
        source: "sequence",
        smtpFailure: { ...smtp, response: "private-secret" },
      });
    });
    expect(
      await db
        .select()
        .from(schema.outboundEvent)
        .where(eq(schema.outboundEvent.kind, "deliveryTransportFailure")),
    ).toHaveLength(1);
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
          { mxCheckedAt: date, emailVerifiedAt: date },
          fixture.revision,
        ),
      );
      await db
        .update(schema.outboundInbox)
        .set({ lastSyncedAt: new Date(date) })
        .where(eq(schema.outboundInbox.id, fixture.inbox));
      const followup = required(await store.claimDelivery(actor, fixture));
      expect(followup.step).toBe(step);
      expect(followup.message.body.split("\n")[0]).toBe(
        step === 2 ? "Bumping this!" : "Jane?",
      );
      expect(followup.message.afterDays).toBe(step === 2 ? 3 : 7);
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
  test("late fixed bumps replay only original approved evidence and buy no fresh research or copy", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const first = required(await store.claimDelivery(actor, fixture));
    required(
      await store.dispatchDelivery(actor, first, async () => ({
        success: true,
        data: { providerMessageId: "late-first", threadId: "late-thread" },
      })),
    );
    const savedJobs = await db.select().from(schema.outboundIntegrationJob);
    const original = (
      await db
        .select()
        .from(schema.outboundRevision)
        .where(
          and(
            eq(schema.outboundRevision.prospectId, fixture.prospect),
            eq(schema.outboundRevision.revision, fixture.revision),
          ),
        )
    )[0];
    expect(original).toBeDefined();
    for (const [step, date] of [
      [2, "2026-11-19T17:00:00Z"],
      [3, "2026-11-23T17:00:00Z"],
    ] as const) {
      setSystemTime(new Date(date));
      required(
        await store.patchProspect(
          actor,
          fixture.prospect,
          { mxCheckedAt: date, emailVerifiedAt: date },
          fixture.revision,
        ),
      );
      await db
        .update(schema.outboundInbox)
        .set({ lastSyncedAt: new Date(date) })
        .where(eq(schema.outboundInbox.id, fixture.inbox));
      const bump = required(await store.claimDelivery(actor, fixture));
      expect(bump.step).toBe(step);
      expect(bump.message.body.split("\n")[0]).toBe(
        step === 2 ? "Bumping this!" : "Jane?",
      );
      expect(bump.message.body).toContain(
        `> ${original?.messages[0]?.body.split("\n")[0]}`,
      );
      expect(bump.message.body).toContain(`> ${settings.optout}`);
      expect(bump.threadId).toBe("late-thread");
      required(
        await store.dispatchDelivery(actor, bump, async () => ({
          success: true,
          data: { providerMessageId: `late-${step}`, threadId: "late-thread" },
        })),
      );
    }
    expect(await db.select().from(schema.outboundIntegrationJob)).toEqual(
      savedJobs,
    );
    expect(
      (
        await db
          .select()
          .from(schema.outboundRevision)
          .where(eq(schema.outboundRevision.id, original!.id))
      )[0],
    ).toEqual(original);
    expect(required(await store.readProspect(fixture.prospect))?.status).toBe(
      "finished",
    );
  });

  test("late fixed bumps reject changed research even when its replacement hash is internally consistent", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const first = required(await store.claimDelivery(actor, fixture));
    required(
      await store.dispatchDelivery(actor, first, async () => ({
        success: true,
        data: { providerMessageId: "bound-first", threadId: "bound-thread" },
      })),
    );
    const date = "2026-11-19T17:00:00Z";
    setSystemTime(new Date(date));
    required(
      await store.patchProspect(
        actor,
        fixture.prospect,
        { mxCheckedAt: date, emailVerifiedAt: date },
        fixture.revision,
      ),
    );
    await db
      .update(schema.outboundInbox)
      .set({ lastSyncedAt: new Date(date) })
      .where(eq(schema.outboundInbox.id, fixture.inbox));
    const row = (
      await db
        .select()
        .from(schema.outboundProspect)
        .where(eq(schema.outboundProspect.id, fixture.prospect))
    )[0];
    if (!row?.details.shoppingResearchId)
      throw new Error("Missing bound receipt.");
    const job = (
      await db
        .select()
        .from(schema.outboundIntegrationJob)
        .where(
          eq(schema.outboundIntegrationJob.id, row.details.shoppingResearchId),
        )
    )[0];
    if (!job?.output) throw new Error("Missing original research job.");
    const receipt = shoppingResearchSchema.parse(job.output["receipt"]);
    receipt.sources[0]!.content += "\nA changed synthetic source.";
    const receiptHash = createHash("sha256")
      .update(JSON.stringify(receipt))
      .digest("hex");
    await db
      .update(schema.outboundIntegrationJob)
      .set({
        input: { ...job.input, receiptHash },
        output: { ...job.output, receipt },
      })
      .where(eq(schema.outboundIntegrationJob.id, job.id));
    const rejected = await store.claimDelivery(actor, fixture);
    expect(rejected.success).toBe(false);
    if (!rejected.success)
      expect(rejected.error.message).toContain(
        "originally approved research receipt",
      );
    expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(1);
    expect(
      (
        await db
          .select()
          .from(schema.outboundProspect)
          .where(eq(schema.outboundProspect.id, row.id))
      )[0],
    ).toEqual(row);
  });

  test("historical custom factual follow-ups still require fresh research", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const first = required(await store.claimDelivery(actor, fixture));
    required(
      await store.dispatchDelivery(actor, first, async () => ({
        success: true,
        data: {
          providerMessageId: "historical-first",
          threadId: "historical-thread",
        },
      })),
    );
    const row = (
      await db
        .select()
        .from(schema.outboundProspect)
        .where(eq(schema.outboundProspect.id, fixture.prospect))
    )[0];
    if (!row) throw new Error("Missing historical fixture prospect.");
    // Explicit synthetic historical read: never produced by the current writer.
    const messages = row.messages.map((message) =>
      message.writing
        ? {
            ...message,
            writing: {
              ...message.writing,
              version: "discovery-email-v1" as const,
              parts: {
                ...message.writing.parts,
                followupFact: "An original product detail.",
              },
            },
          }
        : message.step === 2
          ? { ...message, body: "An original product detail." }
          : message,
    );
    await db
      .update(schema.outboundProspect)
      .set({ messages })
      .where(eq(schema.outboundProspect.id, row.id));
    const date = "2026-11-19T17:00:00Z";
    setSystemTime(new Date(date));
    await db
      .update(schema.outboundInbox)
      .set({ lastSyncedAt: new Date(date) })
      .where(eq(schema.outboundInbox.id, fixture.inbox));
    const rejected = await store.claimDelivery(actor, fixture);
    expect(rejected.success).toBe(false);
    if (!rejected.success)
      expect(rejected.error.message).toMatch(/fresh search|expired/);
    expect(await db.select().from(schema.outboundSendAttempt)).toHaveLength(1);
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
    const draft = required(await draftSyntheticProspect(actor, created));
    const row = required(await store.readProspect(created.prospect));
    if (!row) throw new Error("Missing prospect");
    required(
      await store.recordOutcome(actor, {
        ...created,
        kind: "reply",
        note: "Human reply received",
      }),
    );
    expect((await draftSyntheticProspect(actor, created)).success).toBe(false);
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
  test("sent history retains its original address while an unreviewed follow-up edit stays held", async () => {
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
    expect(
      (
        await store.reviewProspect(actor, {
          ...fixture,
          revision: draft.revision,
          decision: "approve",
        })
      ).success,
    ).toBe(false);
    await db.update(schema.outboundInbox).set({ lastSyncedAt: date });
    required(
      await store.savePlaybook(actor, { ...changed, sendingEnabled: true }),
    );
    expect((await store.claimDelivery(actor, fixture)).success).toBe(false);
    const original = (
      await db
        .select()
        .from(schema.outboundRevision)
        .where(
          and(
            eq(schema.outboundRevision.prospectId, fixture.prospect),
            eq(schema.outboundRevision.revision, fixture.revision),
          ),
        )
    )[0];
    expect(original?.manifest?.postalAddress).toBe(settings.postalAddress);
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
  test("weekly report excludes test and out-of-window activity while retaining hold reasons", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const setup = required(
      await store.saveProspect(actor, {
        ...details("mailbox-setup.example"),
        source: "internal-mailbox-setup-test",
      }),
    );
    const future = new Date(now.getTime() + 1_000);
    const expired = new Date(now.getTime() - 8 * 86_400_000);
    await db
      .update(schema.outboundProspect)
      .set({ status: "held", holdReason: "" })
      .where(eq(schema.outboundProspect.id, fixture.prospect));
    await db.insert(schema.outboundSendAttempt).values(
      [
        { step: 1, status: "accepted" as const, test: false, completedAt: now },
        { step: 2, status: "uncertain" as const, test: true, completedAt: now },
        {
          step: 3,
          status: "accepted" as const,
          test: false,
          completedAt: future,
        },
        {
          step: 4,
          status: "accepted" as const,
          test: false,
          completedAt: expired,
        },
      ].map((attempt) => ({
        ...attempt,
        prospectId: fixture.prospect,
        inboxId: fixture.inbox,
        revision: fixture.revision,
        messageId: `report-window-${attempt.step}`,
        contentHash: "report-fixture",
      })),
    );
    await db.insert(schema.outboundEvent).values([
      {
        prospectId: fixture.prospect,
        actor,
        kind: "bounce",
        detail: "Future receipt",
        createdAt: future,
      },
      {
        prospectId: fixture.prospect,
        actor,
        kind: "meeting",
        detail: "Old receipt",
        createdAt: expired,
      },
      {
        prospectId: setup.prospect,
        actor,
        kind: "reply",
        detail: "Setup test receipt",
        createdAt: now,
      },
    ]);
    const report = required(await store.getWeeklyReport());
    expect(report.totals).toEqual({
      prospects: 1,
      held: 1,
      acceptedFirsts: 1,
      acceptedFollowups: 0,
      replies: 0,
      bounces: 0,
      meetings: 0,
      uncertain: 0,
    });
    expect(report.holdReasons).toEqual([
      { reason: "reviewRequired", count: 1 },
    ]);
    expect(report.bySource.map(({ source }) => source)).toEqual(["manual"]);
  });
  test("trusted distinct openings may share approved relevance and query topics", async () => {
    const { store } = active();
    await approved();
    const other = required(
      await store.saveProspect(actor, details("anothergoods.com")),
    );
    const draft = required(await draftSyntheticProspect(actor, other));
    const review = await store.reviewProspect(actor, {
      ...other,
      revision: draft.revision,
      decision: "approve",
    });
    expect(review.success).toBe(true);
    const first = required(await store.getWorkspace()).prospects.find(
      (prospect) => prospect.id !== other.prospect,
    );
    const second = required(await store.readProspect(other.prospect));
    expect(second?.messages[0]?.subject).toBe(first?.messages[0]?.subject);
    expect(second?.messages[0]?.writing?.parts.relevance).toBe(
      first?.messages[0]?.writing?.parts.relevance,
    );
    expect(second?.messages[0]?.writing?.parts.opening).not.toBe(
      first?.messages[0]?.writing?.parts.opening,
    );
  });
  test("a repeated trusted opening cannot be purchased into a second approval", async () => {
    const { store } = active();
    const first = await approved();
    const original = required(await store.readProspect(first.prospect));
    const parts = original?.messages[0]?.writing?.parts;
    if (!parts) throw new Error("Trusted fixture writer parts missing.");
    const other = required(
      await store.saveProspect(actor, details("repeatedgoods.com")),
    );
    const repeated = await draftSyntheticProspect(actor, other, { parts });
    expect(repeated.success).toBe(false);
    if (!repeated.success)
      expect(repeated.error.message).toContain("already used");
    const stored = required(await store.readProspect(other.prospect));
    expect(stored?.approvedAt).toBeNull();
    expect(stored?.messages).toHaveLength(0);
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
  const pendingDelivery = async (
    inbox: string,
    domain: string,
    status: "claimed" | "uncertain",
    createdAt = new Date(now.getTime() - 60_000),
  ) => {
    const { store, db, schema } = active();
    const created = required(await store.saveProspect(actor, details(domain)));
    await db
      .update(schema.outboundProspect)
      .set({ status: "held", holdReason: "deliveryUncertain", inboxId: inbox })
      .where(eq(schema.outboundProspect.id, created.prospect));
    const [attempt] = await db
      .insert(schema.outboundSendAttempt)
      .values({
        prospectId: created.prospect,
        inboxId: inbox,
        step: 1,
        revision: 0,
        messageId: `<${created.prospect}@fixture.com>`,
        status,
        contentHash: "fixture-pending-content",
        createdAt,
      })
      .returning();
    if (!attempt) throw new Error("Fixture attempt missing");
    return { ...created, attempt };
  };

  test("one uncertain message stays quarantined while an unrelated recipient can send", async () => {
    const { store } = active();
    const fixture = await approved();
    const pending = await pendingDelivery(
      fixture.inbox,
      "quarantined.com",
      "uncertain",
    );
    expect((await store.claimDelivery(actor, fixture)).success).toBe(true);
    const held = required(await store.readProspect(pending.prospect));
    expect(held?.status).toBe("held");
    expect(held?.sentStep).toBe(0);
    expect(
      (
        await store.claimDelivery(actor, {
          prospect: pending.prospect,
          inbox: fixture.inbox,
        })
      ).success,
    ).toBe(false);
  });

  test("uncertainty blocks the same recipient even if its visible status is restored", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    await db.insert(schema.outboundSendAttempt).values({
      prospectId: fixture.prospect,
      inboxId: fixture.inbox,
      step: 1,
      revision: fixture.revision,
      messageId: "<uncertain-same@fixture.com>",
      status: "uncertain",
      contentHash: "fixture-pending-content",
      createdAt: new Date(now.getTime() - 25 * 3_600_000),
    });
    const result = await store.claimDelivery(actor, fixture);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.message).toContain(
        "recipient has an uncertain delivery",
      );
  });

  test("changing the contact at a company cannot escape its uncertain first email", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const claim = required(await store.claimDelivery(actor, fixture));
    required(
      await store.dispatchDelivery(actor, claim, async () => ({
        success: false,
        error: new Error("Fixture unknown transport outcome"),
      })),
    );
    const changed = required(
      await store.saveProspect(actor, {
        ...details(),
        id: fixture.prospect,
        name: "Jill Smith",
        first: "Jill",
        email: "jill@samplegoods.com",
      }),
    );
    expect(changed.prospect).toBe(fixture.prospect);
    const revised = await draftSyntheticProspect(actor, changed);
    expect(revised.success).toBe(false);
    if (!revised.success)
      expect(revised.error.message).toContain(
        "Reconcile existing delivery attempts",
      );
    expect(
      (await store.reviewProspect(actor, { ...changed, decision: "approve" }))
        .success,
    ).toBe(false);
    expect(
      (await store.claimDelivery(actor, { ...changed, inbox: fixture.inbox }))
        .success,
    ).toBe(false);
    const oldIdentity = await db
      .select()
      .from(schema.outboundPerson)
      .where(eq(schema.outboundPerson.email, details().email));
    expect(oldIdentity).toHaveLength(1);
  });

  test("a claimed transport reserves the entire inbox regardless of age", async () => {
    const { store } = active();
    const fixture = await approved();
    await pendingDelivery(
      fixture.inbox,
      "claimedgoods.com",
      "claimed",
      new Date(now.getTime() - 25 * 3_600_000),
    );
    const result = await store.claimDelivery(actor, fixture);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.message).toContain("unresolved delivery reservation");
  });

  test("two recent uncertain attempts stop the transport; older uncertainty stays a recipient hold", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const first = await pendingDelivery(
      fixture.inbox,
      "uncertain-one.com",
      "uncertain",
    );
    const second = await pendingDelivery(
      fixture.inbox,
      "uncertain-two.com",
      "uncertain",
    );
    const held = await store.claimDelivery(actor, fixture);
    expect(held.success).toBe(false);
    if (!held.success)
      expect(held.error.message).toContain(
        "Two delivery attempts are uncertain",
      );
    await db
      .update(schema.outboundSendAttempt)
      .set({ createdAt: new Date(now.getTime() - 24 * 3_600_000 - 1) })
      .where(eq(schema.outboundSendAttempt.id, first.attempt.id));
    expect((await store.claimDelivery(actor, fixture)).success).toBe(true);
    expect(required(await store.readProspect(first.prospect))?.status).toBe(
      "held",
    );
    expect(required(await store.readProspect(second.prospect))?.status).toBe(
      "held",
    );
  });

  test("final dispatch stops if a second uncertain attempt appears after claim", async () => {
    const { store } = active();
    const fixture = await approved();
    await pendingDelivery(fixture.inbox, "first-uncertain.com", "uncertain");
    const claim = required(await store.claimDelivery(actor, fixture));
    await pendingDelivery(fixture.inbox, "second-uncertain.com", "uncertain");
    const send = mock(async () => ({
      success: true as const,
      data: { providerMessageId: "must-not-send", threadId: "must-not-send" },
    }));
    const result = await store.dispatchDelivery(actor, claim, send);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.message).toContain(
        "Two delivery attempts are uncertain",
      );
    expect(send).not.toHaveBeenCalled();
  });

  test("an uncertain email cannot be retried through another company alias", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    const pending = await pendingDelivery(
      fixture.inbox,
      "same-person-other-company.com",
      "uncertain",
    );
    const held = required(await store.readProspect(pending.prospect));
    if (!held) throw new Error("Fixture held prospect missing");
    await db
      .update(schema.outboundPerson)
      .set({ email: details().email })
      .where(eq(schema.outboundPerson.id, held.personId));
    const result = await store.claimDelivery(actor, fixture);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.message).toContain("recipient belongs to another");
  });

  test("uncertainty consumes capacity and51 is an explicit limit without revoking approved content", async () => {
    const { store, db, schema } = active();
    const Mailboxes = await import("@/server/app/outbound/transport-store");
    const fixture = await approved();
    const pending = await pendingDelivery(
      fixture.inbox,
      "uncertain-capacity.com",
      "uncertain",
    );
    const policy = await store.policy();
    const before = required(await store.readProspect(fixture.prospect));
    required(
      await store.savePlaybook(
        actor,
        {
          ...policy.settings,
          sendingRampEnabled: false,
          dailyCap: 50,
          minGapMinutes: 3,
          maxGapMinutes: 4,
        },
        policy.revision,
      ),
    );
    required(
      await Mailboxes.configure(actor, {
        inboxId: fixture.inbox,
        enabled: true,
        dailyCap: 50,
      }),
    );
    const [conversation] = await db
      .insert(schema.outboundConversation)
      .values({
        prospectId: fixture.prospect,
        channel: "email",
        accountId: fixture.inbox,
        accountLabel: senderFor(fixture.prospect, settings),
        providerThreadId: "uncertain-capacity-fixture",
        counterpart: details().email,
      })
      .returning();
    if (!conversation) throw new Error("Fixture conversation missing");
    await db.insert(schema.outboundConversationSend).values(
      Array.from({ length: 49 }, (_, revision) => ({
        conversationId: conversation.id,
        revision,
        status: "accepted" as const,
        input: {
          channel: "email",
          accountId: fixture.inbox,
          prospectId: fixture.prospect,
        },
        createdBy: actor,
        createdAt: new Date(now.getTime() - 60_000),
        completedAt: new Date(now.getTime() - 60_000),
      })),
    );
    const full = await store.claimDelivery(actor, fixture);
    expect(full.success).toBe(false);
    if (!full.success)
      expect(full.error.message).toContain("rolling 24-hour cap");
    required(
      await store.savePlaybook(
        actor,
        {
          ...policy.settings,
          sendingRampEnabled: false,
          dailyCap: 51,
          minGapMinutes: 3,
          maxGapMinutes: 4,
        },
        policy.revision,
      ),
    );
    required(
      await Mailboxes.configure(actor, {
        inboxId: fixture.inbox,
        enabled: true,
        dailyCap: 51,
      }),
    );
    expect(
      (
        await Mailboxes.configure(actor, {
          inboxId: fixture.inbox,
          enabled: true,
          dailyCap: 101,
        })
      ).success,
    ).toBe(false);
    expect((await store.policy()).revision).toBe(policy.revision);
    expect(required(await store.readProspect(fixture.prospect))).toEqual(
      before,
    );
    const claim = required(await store.claimDelivery(actor, fixture));
    expect(
      required(
        await store.dispatchDelivery(actor, claim, async () => ({
          success: true,
          data: {
            providerMessageId: "accepted-fifty",
            threadId: "accepted-fifty-thread",
          },
        })),
      ).status,
    ).toBe("accepted");
    const [stillUncertain] = await db
      .select()
      .from(schema.outboundSendAttempt)
      .where(eq(schema.outboundSendAttempt.id, pending.attempt.id));
    expect(stillUncertain?.status).toBe("uncertain");
    const next = {
      ...details("nextgoods.com"),
      website: "https://nextgoods.com",
      product: "Cozy throw blanket",
      productUrl: "https://nextgoods.com/products/blanket",
      finding: "The blanket page has no fabric weight listed.",
      evidence: "The fabric description and blanket dimensions were inspected.",
    };
    const companyId = crypto.randomUUID();
    const personId = crypto.randomUUID();
    let prospectId = crypto.randomUUID();
    while (
      senderFor(prospectId, settings) !== senderFor(fixture.prospect, settings)
    )
      prospectId = crypto.randomUUID();
    await db.insert(schema.outboundCompany).values({
      id: companyId,
      name: next.company,
      domain: next.domain,
      website: `https://${next.domain}`,
      country: next.country,
      source: "fixture",
    });
    await db.insert(schema.outboundPerson).values({
      id: personId,
      companyId,
      identityKey: next.email,
      name: next.name,
      email: next.email,
      title: next.title,
    });
    await db.insert(schema.outboundProspect).values({
      id: prospectId,
      companyId,
      personId,
      details: next,
      createdBy: actor,
    });
    const nextDraft = required(
      await draftSyntheticProspect(actor, { prospect: prospectId }),
    );
    required(
      await store.reviewProspect(actor, {
        prospect: prospectId,
        revision: nextDraft.revision,
        decision: "approve",
      }),
    );
    setSystemTime(new Date(now.getTime() + 5 * 60_000));
    const over = await store.claimDelivery(actor, {
      prospect: prospectId,
      inbox: fixture.inbox,
    });
    expect(over.success).toBe(false);
    if (!over.success)
      expect(over.error.message).toContain("rolling 24-hour cap");
  });

  test("due selection filters sending windows and recipient mail-host policy before its limit", async () => {
    const { db, schema } = active();
    const Mailboxes = await import("@/server/app/outbound/transport-store");
    const names = [
      ...Array.from({ length: 105 }, (_, index) => `waiting-${index}`),
      "ready-first",
      "due-bump",
      "future-bump",
      "future-first",
    ];
    const companies = await db
      .insert(schema.outboundCompany)
      .values(
        names.map((name) => ({
          name,
          domain: `${name}.com`,
          website: `https://${name}.com`,
          country: "US",
          source: "fixture",
        })),
      )
      .returning();
    const people = await db
      .insert(schema.outboundPerson)
      .values(
        companies.map((company) => ({
          companyId: company.id,
          identityKey: company.id,
          name: "Jane Smith",
          email: `jane@${company.domain}`,
          title: "Head of Growth",
        })),
      )
      .returning();
    await db.insert(schema.outboundProspect).values(
      companies.map((company) => {
        const person = people.find((person) => person.companyId === company.id);
        if (!person) throw new Error("Fixture person missing");
        const waiting = company.name.startsWith("waiting");
        const future = company.name.startsWith("future");
        const followup = company.name.endsWith("bump");
        return {
          id: company.name,
          companyId: company.id,
          personId: person.id,
          details: {
            ...details(company.domain),
            timezone: waiting ? "" : "America/New_York",
          },
          status: followup ? ("active" as const) : ("approved" as const),
          sentStep: followup ? 1 : 0,
          createdBy: actor,
          nextSendAt: new Date(
            now.getTime() +
              (future ? 86_400_000 : waiting ? -120_000 : -60_000),
          ),
        };
      }),
    );
    expect(
      required(await Mailboxes.due({ allowUsMarketWindow: true }, now)).map(
        (row) => row.id,
      ),
    ).toEqual(["due-bump", "ready-first"]);
    const opened = required(
      await Mailboxes.due(
        { allowUsMarketWindow: true },
        new Date("2026-11-09T18:00:00Z"),
      ),
    );
    expect(opened).toHaveLength(100);
    expect(opened[0]?.id).toBe("due-bump");
    expect(opened.some((row) => row.id.startsWith("future"))).toBe(false);
    await db
      .update(schema.outboundProspect)
      .set({
        details: sql`${schema.outboundProspect.details} || '{"timezone":"America/New_York","mxProvider":"microsoft"}'::jsonb`,
      })
      .where(sql`${schema.outboundProspect.id} like 'waiting-%'`);
    await db
      .update(schema.outboundProspect)
      .set({
        details: sql`${schema.outboundProspect.details} || '{"mxProvider":"unknown"}'::jsonb`,
      })
      .where(eq(schema.outboundProspect.id, "waiting-0"));
    expect(required(await Mailboxes.due({}, now)).map(({ id }) => id)).toEqual([
      "due-bump",
      "ready-first",
    ]);
    const microsoftAllowed = required(
      await Mailboxes.due({ allowMicrosoftRecipients: true }, now),
    );
    expect(microsoftAllowed).toHaveLength(100);
    expect(microsoftAllowed[0]?.id).toBe("due-bump");
    expect(
      microsoftAllowed.some((row) => row.details.mxProvider === "microsoft"),
    ).toBe(true);
    expect(
      microsoftAllowed.some((row) => row.details.mxProvider === "unknown"),
    ).toBe(false);
  });

  test("due follow-ups retain priority while expiring recipient windows sort before the100-row limit", async () => {
    const { db, schema } = active();
    const Mailboxes = await import("@/server/app/outbound/transport-store");
    const entries = [
      ...Array.from({ length: 105 }, (_, index) => ({
        id: `market-${String(index).padStart(3, "0")}`,
        timezone: "",
        sentStep: 0,
        due: "2026-11-09T13:00:00Z",
      })),
      {
        id: "chicago-first-b",
        timezone: "America/Chicago",
        sentStep: 0,
        due: "2026-11-09T18:00:00Z",
      },
      {
        id: "chicago-first-a",
        timezone: "America/Chicago",
        sentStep: 0,
        due: "2026-11-09T18:00:00Z",
      },
      {
        id: "los-angeles-first",
        timezone: "America/Los_Angeles",
        sentStep: 0,
        due: "2026-11-09T12:00:00Z",
      },
      {
        id: "early-bump",
        timezone: "America/Chicago",
        sentStep: 1,
        due: "2026-11-09T18:00:00Z",
      },
      {
        id: "late-bump",
        timezone: "America/Los_Angeles",
        sentStep: 2,
        due: "2026-11-09T18:00:00Z",
      },
    ];
    const companies = await db
      .insert(schema.outboundCompany)
      .values(
        entries.map((entry) => ({
          id: entry.id,
          name: entry.id,
          domain: `${entry.id}.com`,
          website: `https://${entry.id}.com`,
          country: "US",
          source: "fixture",
        })),
      )
      .returning();
    const people = await db
      .insert(schema.outboundPerson)
      .values(
        companies.map((company) => ({
          companyId: company.id,
          identityKey: company.id,
          name: "Jane Smith",
          email: `jane@${company.domain}`,
          title: "Head of Growth",
        })),
      )
      .returning();
    await db.insert(schema.outboundProspect).values(
      entries.map((entry) => {
        const person = people.find((row) => row.companyId === entry.id);
        if (!person) throw new Error("Fixture person missing");
        return {
          id: entry.id,
          companyId: entry.id,
          personId: person.id,
          details: { ...details(`${entry.id}.com`), timezone: entry.timezone },
          status: entry.sentStep ? ("active" as const) : ("approved" as const),
          sentStep: entry.sentStep,
          createdBy: actor,
          nextSendAt: new Date(entry.due),
        };
      }),
    );
    const settings = { allowUsMarketWindow: true };
    const queue = required(
      await Mailboxes.due(settings, new Date("2026-11-09T19:00:00Z")),
    );
    expect(queue).toHaveLength(100);
    expect(queue.slice(0, 5).map(({ id }) => id)).toEqual([
      "late-bump",
      "early-bump",
      "chicago-first-a",
      "chicago-first-b",
      "market-000",
    ]);
    expect(queue.some(({ id }) => id === "los-angeles-first")).toBe(false);
    expect(
      required(
        await Mailboxes.due(settings, new Date("2026-11-09T20:00:00Z")),
      ).some(({ id }) => id.startsWith("chicago") || id === "early-bump"),
    ).toBe(false);
    expect(
      required(
        await Mailboxes.due(settings, new Date("2026-11-09T21:00:00Z")),
      ).map(({ id }) => id),
    ).toEqual(["late-bump", "los-angeles-first"]);
  });

  test("warmup safety reads see pending actions and credential changes on their existing transaction", async () => {
    const { db, schema } = active();
    const Jobs = await import("@/server/app/outbound/jobs");
    const Credentials = await import(
      "@/server/app/outbound/provider-credentials"
    );
    await expect(
      db.transaction(async (transaction) => {
        await transaction.insert(schema.outboundIntegrationJob).values({
          provider: "warmbly",
          status: "pending",
          input: { email: "sender@brand.com", operation: "start" },
        });
        await transaction.insert(schema.outboundProviderCredential).values({
          provider: "warmbly",
          apiKey: "fixture-warmbly-key",
          configuration: {},
          createdBy: actor,
          updatedBy: actor,
          validatedAt: now,
          updatedAt: now,
        });
        expect(
          required(
            await Jobs.hasPendingWarmup("sender@brand.com", transaction),
          ),
        ).toBe(true);
        const first = required(
          await Credentials.metadata("warmbly", transaction, true),
        );
        expect(first.configured).toBe(true);
        expect(first.version).toMatch(/^[a-f0-9]{64}$/);
        await transaction
          .update(schema.outboundProviderCredential)
          .set({ updatedAt: new Date(now.getTime() + 1) })
          .where(eq(schema.outboundProviderCredential.provider, "warmbly"));
        const changed = required(
          await Credentials.metadata("warmbly", transaction, true),
        );
        expect(changed.version).not.toBe(first.version);
        throw new Error("Roll back the synthetic pending warmup action");
      }),
    ).rejects.toThrow("Roll back");
  });

  test("the fiftieth rolling-day send remains available when follow-ups are due tomorrow, while due bumps keep priority", async () => {
    const { store, db, schema } = active();
    const fixture = await approved();
    required(
      await store.savePlaybook(actor, {
        ...settings,
        sendingEnabled: true,
        sendingRampEnabled: false,
        dailyCap: 50,
        minGapMinutes: 3,
        maxGapMinutes: 4,
      }),
    );
    await db
      .update(schema.outboundInbox)
      .set({ dailyCap: 50 })
      .where(eq(schema.outboundInbox.id, fixture.inbox));
    const [conversation] = await db
      .insert(schema.outboundConversation)
      .values({
        prospectId: fixture.prospect,
        channel: "email",
        accountId: fixture.inbox,
        accountLabel: senderFor(fixture.prospect, settings),
        providerThreadId: "daily-capacity-fixture",
        counterpart: details().email,
      })
      .returning();
    if (!conversation) throw new Error("Fixture conversation missing");
    const accepted = await db
      .insert(schema.outboundConversationSend)
      .values(
        Array.from({ length: 50 }, (_, revision) => ({
          conversationId: conversation.id,
          revision,
          status: "accepted" as const,
          input: {
            channel: "email",
            accountId: fixture.inbox,
            prospectId: fixture.prospect,
          },
          createdBy: actor,
          createdAt: new Date(now.getTime() - 60_000),
          completedAt: new Date(now.getTime() - 60_000),
        })),
      )
      .returning();
    const blocked = await store.claimDelivery(actor, fixture);
    expect(blocked.success).toBe(false);
    if (!blocked.success)
      expect(blocked.error.message).toContain("rolling 24-hour cap");
    const last = accepted.at(-1);
    if (!last) throw new Error("Fixture send missing");
    await db
      .delete(schema.outboundConversationSend)
      .where(eq(schema.outboundConversationSend.id, last.id));
    const future = [];
    for (let index = 0; index < 11; index++) {
      const created = required(
        await store.saveProspect(actor, details(`future-${index}.com`)),
      );
      future.push(created.prospect);
      await db
        .update(schema.outboundProspect)
        .set({
          status: "active",
          sentStep: 1,
          inboxId: fixture.inbox,
          nextSendAt: new Date(now.getTime() + 23 * 3_600_000),
        })
        .where(eq(schema.outboundProspect.id, created.prospect));
    }
    const due = future[0];
    if (!due) throw new Error("Fixture follow-up missing");
    for (const nextSendAt of [now, new Date(now.getTime() - 3_600_000)]) {
      await db
        .update(schema.outboundProspect)
        .set({ nextSendAt })
        .where(eq(schema.outboundProspect.id, due));
      const reserved = await store.claimDelivery(actor, fixture);
      expect(reserved.success).toBe(false);
      if (!reserved.success)
        expect(reserved.error.message).toContain("reserved for due follow-ups");
    }
    await db
      .update(schema.outboundProspect)
      .set({ nextSendAt: new Date(now.getTime() + 23 * 3_600_000) })
      .where(eq(schema.outboundProspect.id, due));
    const claim = required(await store.claimDelivery(actor, fixture));
    expect(claim.step).toBe(1);
    const send = mock(async () => ({
      success: true as const,
      data: { providerMessageId: "fiftieth-send", threadId: "fiftieth-thread" },
    }));
    expect(
      required(await store.dispatchDelivery(actor, claim, send)).status,
    ).toBe("accepted");
    expect(send).toHaveBeenCalledTimes(1);
    const [inbox] = await db
      .select()
      .from(schema.outboundInbox)
      .where(eq(schema.outboundInbox.id, fixture.inbox));
    expect(inbox?.nextSendAt?.getTime()).toBeGreaterThanOrEqual(
      now.getTime() + 3 * 60_000,
    );
    expect(inbox?.nextSendAt?.getTime()).toBeLessThanOrEqual(
      now.getTime() + 4 * 60_000,
    );
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
