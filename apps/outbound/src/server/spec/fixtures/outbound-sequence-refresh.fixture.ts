import { mock } from "bun:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import {
  defaultPlaybook,
  prospectSchema,
  renderMessages,
} from "@/lib/outbound";
import { defaultCampaignCriteria } from "@/lib/outbound-campaigns";
import { sequenceRefreshStateSchema } from "@/lib/outbound-sequence-refresh";
import type { SequenceRefreshDependencies } from "@/server/app/outbound/automatic-sequence-refresh";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
if (!endpoint) throw new Error("Disposable database required");
const url = new URL(endpoint);
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/outbound_test"
)
  throw new Error("Only local outbound_test permitted");
Object.assign(process.env, { DATABASE_URL: endpoint });
mock.module("server-only", () => ({}));
const { db, schema } = await import("@/server/database");
const Store = await import("@/server/app/outbound/store");
const Refresh = await import(
  "@/server/app/outbound/automatic-sequence-refresh"
);
const value = <Data>(
  result: { success: true; data: Data } | { success: false; error: Error },
): Data => {
  if (!result.success) throw result.error;
  return result.data;
};
const settings = {
  ...defaultPlaybook,
  automationEnabled: true,
  sendingEnabled: true,
  senderConfirmed: true,
  historyConfirmed: true,
  competingSendersPaused: true,
  senderTested: true,
  fromEmail: "juri@sender.test",
  senderEmails: "juri@sender.test",
  targetRoles: "Founder",
  excludedRoles: "intern",
  maxBodyWords: 99,
};
const seed = async () => {
  await db.execute(
    sql`truncate outbound_integration_job,outbound_campaign,outbound_company,outbound_person,outbound_prospect,outbound_event,outbound_revision,outbound_playbook,outbound_suppression,outbound_inbox cascade`,
  );
  const now = new Date();
  const old = new Date(Date.now() - 9 * 86400000);
  const id = randomUUID();
  const campaignId = randomUUID();
  const companyId = randomUUID();
  const personId = randomUUID();
  const sourceId = randomUUID();
  const product = {
    name: "Ceramic Mug",
    brand: "Example Goods",
    url: "https://example.test/products/mug",
    description: "A ceramic mug",
    price: 24,
    currency: "USD",
  };
  const details = prospectSchema.parse({
    company: "Example Goods",
    domain: "example.test",
    website: "https://example.test",
    country: "US",
    platform: "shopify",
    name: "Alex Doe",
    first: "Alex",
    title: "Founder",
    email: "alex@example.test",
    emailStatus: "verified",
    emailVerifiedAt: old.toISOString(),
    emailSource: "Apollo original verification",
    roleSource: "https://example.test/team",
    roleCheckedAt: now.toISOString(),
    timezone: "America/New_York",
    mxProvider: "google",
    mxCheckedAt: old.toISOString(),
    legitEvidence:
      "Own physical product brand with established retail distribution.",
    product: product.name,
    productUrl: product.url,
    productCategory: "home goods",
    gap: "product-published-data",
    finding: `your product page lists ${product.name}`,
    evidence: `Automatic positive product observation; raw HTML only, no absence or rendered-page claim. Product: ${JSON.stringify(product)}. URL: ${product.url}. SHA256: ${"a".repeat(64)}. Checked: ${old.toISOString()}.`,
    evidenceCheckedAt: old.toISOString(),
    automationEvidenceId: sourceId,
  });
  const messages = renderMessages(details, settings);
  const manifest = Store.approvalManifest({ id, details }, settings, 1);
  const hash = Store.contentHash(messages, manifest);
  await db
    .insert(schema.outboundPlaybook)
    .values({ id: "default", settings, revision: 1, updatedBy: "fixture" });
  await db.insert(schema.outboundCampaign).values({
    id: campaignId,
    name: "Goods",
    status: "active",
    revision: 1,
    criteria: defaultCampaignCriteria(settings),
    createdBy: "fixture",
    updatedBy: "fixture",
  });
  await db.insert(schema.outboundCompany).values({
    id: companyId,
    name: details.company,
    domain: details.domain,
    website: details.website,
    country: "US",
    source: "fixture",
  });
  await db.insert(schema.outboundPerson).values({
    id: personId,
    companyId,
    identityKey: id,
    name: details.name,
    email: details.email,
  });
  await db.insert(schema.outboundProspect).values({
    id,
    campaignId,
    companyId,
    personId,
    details,
    messages,
    revision: 2,
    playbookRevision: 1,
    status: "active",
    approvedAt: old,
    approvedBy: "automatic:fixture",
    approvalHash: hash,
    sentStep: 1,
    firstSentAt: old,
    lastSentAt: old,
    nextSendAt: old,
    threadId: "thread-fixture",
    createdBy: "fixture",
  });
  const [candidate] = await db
    .insert(schema.outboundCampaignCompany)
    .values({
      campaignId,
      prospectId: id,
      domain: details.domain,
      name: details.company,
      website: details.website,
      source: "apollo",
      sourceId: "organization-fixture",
      criteriaRevision: 1,
      country: "US",
      platform: "shopify",
      teamSize: 20,
      annualRevenue: null,
      sourcePayload: {},
      status: "added",
    })
    .returning();
  if (!candidate) throw new Error("candidate missing");
  const person = {
    id: "person-fixture",
    name: details.name,
    first: details.first,
    title: details.title,
    email: details.email,
    domain: details.domain,
    company: details.company,
    linkedinUrl: "",
    emailStatus: "verified",
    matchConfidence: "high",
    source: "apollo",
  };
  await db.insert(schema.outboundIntegrationJob).values({
    id: sourceId,
    provider: "automation",
    prospectId: id,
    status: "complete",
    input: {
      operation: "campaignAutomation",
      campaignId,
      companyId: candidate.id,
      companyName: details.company,
      companyDomain: details.domain,
      campaignRevision: 1,
      playbookRevision: 1,
      actor: "fixture",
    },
    output: {
      stage: "complete",
      availableAt: now.toISOString(),
      lease: null,
      prospectId: id,
      prospectRevision: 2,
      qualification: {
        status: "qualified",
        details: {
          domain: details.domain,
          product: details.product,
          productUrl: details.productUrl,
          gap: details.gap,
          finding: details.finding,
          productInsight: details.productInsight ?? null,
          evidence: details.evidence,
          evidenceCheckedAt: details.evidenceCheckedAt,
          country: details.country,
          platform: details.platform,
          legitEvidence: details.legitEvidence,
        },
      },
      selection: {
        status: "selected",
        provisional: false,
        person,
        details: {
          name: details.name,
          first: details.first,
          title: details.title,
          email: details.email,
          roleSource: details.roleSource,
          roleCheckedAt: details.roleCheckedAt,
          timezone: details.timezone,
        },
      },
      enrichment: person,
    },
  });
  const [version] = await db
    .insert(schema.outboundRevision)
    .values({
      prospectId: id,
      revision: 2,
      messages,
      manifest,
      contentHash: hash,
      approvedBy: "automatic:fixture",
      approvedAt: old,
    })
    .returning();
  const [inbox] = await db
    .insert(schema.outboundInbox)
    .values({
      email: settings.fromEmail,
      fromName: settings.fromName,
      signer: settings.signature,
    })
    .returning();
  if (!inbox || !version) throw new Error("fixture missing");
  const [attempt] = await db
    .insert(schema.outboundSendAttempt)
    .values({
      prospectId: id,
      inboxId: inbox.id,
      step: 1,
      revision: 2,
      messageId: randomUUID(),
      status: "accepted",
      contentHash: hash,
      completedAt: old,
    })
    .returning();
  return {
    id,
    campaignId,
    sourceId,
    product,
    details,
    messages,
    version,
    attempt,
    hash,
  };
};
const jobs = async () =>
  db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(
      sql`${schema.outboundIntegrationJob.input}->>'operation'='sequenceRefresh'`,
    );
const due = () =>
  db.execute(
    sql`update outbound_integration_job set output=jsonb_set(output,'{availableAt}',to_jsonb(${new Date(Date.now() - 60000).toISOString()}::text)) where input->>'operation'='sequenceRefresh' and status='pending'`,
  );
const dependencies = () => {
  const counts = { product: 0, verify: 0, poll: 0, apply: 0 };
  const deps: SequenceRefreshDependencies = {
    product: async (input) => {
      counts.product++;
      return {
        success: true,
        data: {
          status: "same",
          reason: null,
          observed: input.product,
          receipt: {
            url: input.product.url,
            kind: "product",
            checkedAt: new Date().toISOString(),
            sha256: "b".repeat(64),
            excerpt: "Ceramic Mug by Example Goods",
            mode: "raw-html-positive-observation",
          },
        },
      };
    },
    verify: async ({ emails }) => {
      counts.verify++;
      return {
        success: true,
        data: {
          requestId: randomUUID(),
          status: "pending",
          records: [{ record_id: "record", input: { email: emails[0] } }],
          requestedAt: new Date().toISOString(),
        },
      };
    },
    poll: async ({ requestId }) => {
      counts.poll++;
      return {
        success: true,
        data: {
          requestId,
          status: "complete",
          results: [
            {
              email: "alex@example.test",
              status: "verified",
              verifiedAt: new Date().toISOString(),
              recordId: "record",
              source: "apollo",
              verdict: "valid",
            },
          ],
          retryAfterSeconds: 30,
        },
      };
    },
    mx: async () => ({
      success: true,
      data: {
        provider: "google",
        records: ["aspmx.l.google.com"],
        checkedAt: new Date().toISOString(),
      },
    }),
    apply: async (input) => {
      counts.apply++;
      return Store.applyAutomaticSequenceRefresh(input);
    },
  };
  return { deps, counts };
};
// Actual Store transaction: new approval revision, same words/hash, immutable original source and sent receipt.
{
  const f = await seed();
  const { deps, counts } = dependencies();
  const original = value(await Store.readProspect(f.id));
  assert(original);
  const sourceBefore = await db
    .select()
    .from(schema.outboundIntegrationJob)
    .where(eq(schema.outboundIntegrationJob.id, f.sourceId));
  value(await Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps));
  assert.equal(counts.verify, 1);
  assert.equal(counts.apply, 0);
  value(await Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps));
  assert.equal(counts.verify, 1);
  await due();
  value(await Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps));
  assert.equal(counts.apply, 1);
  const refreshed = value(await Store.readProspect(f.id));
  assert(refreshed);
  assert.equal(refreshed.revision, 3);
  assert.equal(refreshed.approvalHash, f.hash);
  assert.deepEqual(refreshed.messages, f.messages);
  assert.equal(refreshed.details.email, f.details.email);
  assert.equal(refreshed.details.evidence, f.details.evidence);
  assert.notEqual(
    refreshed.details.evidenceCheckedAt,
    f.details.evidenceCheckedAt,
  );
  assert.equal(refreshed.status, "active");
  const records = await jobs();
  assert.equal(records.length, 1);
  assert.equal(records[0]?.status, "complete");
  assert.equal(refreshed.details.automationRefreshId, records[0]?.id);
  const prior = (
    await db
      .select()
      .from(schema.outboundRevision)
      .where(eq(schema.outboundRevision.id, f.version.id))
  )[0];
  assert.deepEqual(prior?.messages, f.version.messages);
  assert.deepEqual(prior?.manifest, f.version.manifest);
  assert.equal(prior?.contentHash, f.version.contentHash);
  assert.deepEqual(
    await db
      .select()
      .from(schema.outboundIntegrationJob)
      .where(eq(schema.outboundIntegrationJob.id, f.sourceId)),
    sourceBefore,
  );
  assert.deepEqual(
    (
      await db
        .select()
        .from(schema.outboundSendAttempt)
        .where(eq(schema.outboundSendAttempt.id, f.attempt?.id ?? ""))
    )[0],
    f.attempt,
  );
  value(await Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps));
  assert.equal(counts.verify, 1);
  assert.equal(counts.apply, 1);
  await db.transaction((transaction) =>
    Store.assertAutomaticEvidence(transaction, refreshed),
  );
}
// Ambiguous billable response remains one uncertain job, even if someone restores the sequence status.
{
  const f = await seed();
  const { deps, counts } = dependencies();
  deps.verify = async () => {
    counts.verify++;
    throw new Error("response lost after request");
  };
  value(await Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps));
  assert.equal(counts.verify, 1);
  assert.equal((await jobs())[0]?.status, "uncertain");
  assert.equal(value(await Store.readProspect(f.id))?.status, "held");
  await db
    .update(schema.outboundProspect)
    .set({ status: "active", nextSendAt: new Date() })
    .where(eq(schema.outboundProspect.id, f.id));
  value(await Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps));
  assert.equal(counts.verify, 1);
  assert.equal((await jobs()).length, 1);
}
// Product changes stop before spending verification credits.
{
  const f = await seed();
  const { deps, counts } = dependencies();
  const check = deps.product;
  deps.product = async (...args) => {
    const result = value(await check(...args));
    return {
      success: true,
      data: {
        ...result,
        status: "changed",
        observed: { ...f.product, price: 25 },
        reason: "sequence-product-changed",
      },
    };
  };
  value(await Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps));
  assert.equal(counts.verify, 0);
  assert.equal(counts.apply, 0);
  assert.equal(value(await Store.readProspect(f.id))?.status, "held");
  assert.equal((await jobs())[0]?.status, "failed");
}
// Recipient mutation during a paid response prevents renewal and never overwrites the new recipient.
{
  const f = await seed();
  const { deps, counts } = dependencies();
  const verify = deps.verify;
  deps.verify = async (input) => {
    const result = await verify(input);
    await db
      .update(schema.outboundProspect)
      .set({ details: { ...f.details, email: "new@example.test" } })
      .where(eq(schema.outboundProspect.id, f.id));
    return result;
  };
  value(await Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps));
  assert.equal(counts.verify, 1);
  assert.equal(counts.apply, 0);
  assert.equal(
    value(await Store.readProspect(f.id))?.details.email,
    "new@example.test",
  );
  assert.equal((await jobs())[0]?.status, "failed");
}
// Expired verify lease is never replayed; expired read-only stages can resume.
{
  const f = await seed();
  const { deps, counts } = dependencies();
  value(await Refresh.run({ prospectId: f.id, maxSteps: 1 }, deps));
  const [job] = await jobs();
  assert(job);
  const state = sequenceRefreshStateSchema.parse(job.output);
  await db
    .update(schema.outboundIntegrationJob)
    .set({
      status: "starting",
      output: {
        ...state,
        stage: "verify",
        lease: {
          token: randomUUID(),
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      },
    })
    .where(eq(schema.outboundIntegrationJob.id, job.id));
  value(await Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps));
  assert.equal(counts.verify, 0);
  assert.equal((await jobs())[0]?.status, "uncertain");
}
// Pausing during verification checkpoints the paid receipt and resumes without a second verification.
{
  const f = await seed();
  const { deps, counts } = dependencies();
  const verify = deps.verify;
  deps.verify = async (input) => {
    const result = await verify(input);
    await db
      .update(schema.outboundCampaign)
      .set({ status: "paused" })
      .where(eq(schema.outboundCampaign.id, f.campaignId));
    return result;
  };
  value(await Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps));
  assert.equal(counts.verify, 1);
  assert.equal((await jobs())[0]?.status, "pending");
  assert.equal(value(await Store.readProspect(f.id))?.status, "active");
  await db
    .update(schema.outboundCampaign)
    .set({ status: "active" })
    .where(eq(schema.outboundCampaign.id, f.campaignId));
  await due();
  value(await Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps));
  assert.equal(counts.verify, 1);
  assert.equal(counts.apply, 1);
  assert.equal((await jobs())[0]?.status, "complete");
}
// Concurrent cron ticks share one reservation and one new immutable approval.
{
  const f = await seed();
  const { deps, counts } = dependencies();
  await Promise.all([
    Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps),
    Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps),
  ]).then((results) => results.forEach(value));
  assert.equal(counts.verify, 1);
  assert.equal((await jobs()).length, 1);
  await due();
  await Promise.all([
    Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps),
    Refresh.run({ prospectId: f.id, maxSteps: 10 }, deps),
  ]).then((results) => results.forEach(value));
  assert.equal(counts.apply, 1);
  assert.equal(value(await Store.readProspect(f.id))?.revision, 3);
}
console.log("Sequence refresh coordinator contracts passed (7 scenarios)");
await db.$client.end({ timeout: 1 });
