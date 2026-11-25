import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  emptyMetric,
  productFingerprint,
} from "../app/integration/loop/signals";

const target = process.env["LOOP_TEST_DATABASE_URL"];

describe.skipIf(!target)("Loop interrupted publication recovery", () => {
  const suffix = randomUUID();
  const store = `loop-recovery-store-${suffix}`;
  const user = `loop-recovery-user-${suffix}`;
  const environment = { ...process.env };
  const live = new Map<
    string,
    { description: string; title: string; rawData: string }
  >();
  const state = { failRead: false, writes: 0 };
  const modules: {
    database?: typeof import("../database");
    proposals?: typeof import("../app/integration/loop/proposals");
  } = {};

  beforeAll(async () => {
    if (!target || new URL(target).hostname !== "127.0.0.1")
      throw new Error(
        "Loop fixtures require an explicit disposable localhost database",
      );
    Object.assign(process.env, {
      DATABASE_URL: target,
      CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 82).toString("base64"),
    });
    mock.module("@/server/utils/ai", () => ({
      generate: async () => {
        throw new Error("No model call is permitted in recovery fixtures");
      },
    }));
    mock.module("@/server/utils/scrapellm", () => ({
      execute: async () => {
        throw new Error("No paid capture is permitted in recovery fixtures");
      },
    }));
    mock.module("@/server/app/integration/shopify", () => ({
      readProductListing: async ({ product }: { product: string }) =>
        state.failRead
          ? { success: false, error: new Error("fixture read failed") }
          : { success: true, data: live.get(product) },
    }));
    mock.module("@/server/app/store", () => ({
      publishProductListing: async () => {
        state.writes += 1;
        throw new Error("Recovery must never issue a write");
      },
    }));
    modules.database = await import("../database");
    modules.proposals = await import("../app/integration/loop/proposals");
    const { db, schema } = modules.database;
    await db.insert(schema.user).values({
      id: user,
      name: "Fixture",
      surname: "Merchant",
      email: `${suffix}@example.test`,
    });
    await db.insert(schema.store).values({
      id: store,
      userId: user,
      platform: "shopify",
      name: "Fixture",
      domain: "https://loop-recovery.myshopify.com",
      status: "connected",
      storeId: "123",
    });
    await db.insert(schema.loopConnection).values({
      storeId: store,
      generation: 1,
      status: "connected",
      authMode: "api_key",
      apiKey: "fixture-loop-key",
      shopId: "123",
    });
  });

  afterAll(async () => {
    if (modules.database)
      await modules.database.db
        .delete(modules.database.schema.user)
        .where(eq(modules.database.schema.user.id, user));
    mock.restore();
    for (const key of Object.keys(process.env))
      if (!(key in environment)) delete process.env[key];
    Object.assign(process.env, environment);
  });

  const seed = async (name: string) => {
    const { db, schema } = modules.database!;
    const at = new Date(Date.now() - 60_000);
    const product = {
      id: `loop-recovery-product-${name}-${suffix}`,
      storeId: store,
      userId: user,
      externalId: name,
      title: "Fixture shoe",
      description: "Original description",
      rawData: '{"product_type":"Shoes"}',
      structuredData: null,
      price: "50",
      currency: "USD",
    };
    await db.insert(schema.product).values(product);
    const [gap] = await db
      .insert(schema.returnExpectationGap)
      .values({
        storeId: store,
        generation: 1,
        productId: product.id,
        attribute: "fit",
        count: 5,
        share: 0.5,
        windowStart: new Date(at.getTime() - 60 * 864e5),
        windowEnd: at,
        status: "fix_proposed",
      })
      .returning();
    const before = emptyMetric(store, new Date(at.getTime() - 60 * 864e5), at);
    const [proposal] = await db
      .insert(schema.loopProposal)
      .values({
        storeId: store,
        generation: 1,
        productId: product.id,
        gapId: gap!.id,
        revision: 1,
        status: "publishing",
        approvedAt: at,
        original: {
          description: product.description,
          fingerprint: productFingerprint(store, product),
        },
        proposed: { description: "Exactly reviewed return feedback" },
        evidence: {
          attribute: "fit",
          publicationBaseline: {
            controls: [],
            windowDays: 60,
            baseline: {
              attribute: "fit",
              before,
              controlBefore: before,
              mappings: [],
            },
          },
        },
      })
      .returning();
    return { product, proposal: proposal! };
  };

  test("an exact applied diff completes the saved measurement without a second write", async () => {
    const fixture = await seed("applied");
    live.set(fixture.product.id, {
      description: "Exactly reviewed return feedback",
      title: fixture.product.title,
      rawData: fixture.product.rawData,
    });
    const input = { store, user, proposal: fixture.proposal.id, revision: 1 };
    expect(await modules.proposals!.recover(input)).toMatchObject({
      status: "published",
    });
    expect(await modules.proposals!.recover(input)).toMatchObject({
      status: "published",
    });
    const { db, schema } = modules.database!;
    const measurements = await db
      .select()
      .from(schema.loopMeasurement)
      .where(
        and(
          eq(schema.loopMeasurement.storeId, store),
          eq(schema.loopMeasurement.proposalId, fixture.proposal.id),
        ),
      );
    expect(measurements).toHaveLength(1);
    expect(measurements[0]?.baseline["attribute"]).toBe("fit");
    expect(state.writes).toBe(0);
  });

  test("an unchanged remote listing returns to explicit review", async () => {
    const fixture = await seed("unchanged");
    live.set(fixture.product.id, {
      description: fixture.product.description,
      title: fixture.product.title,
      rawData: fixture.product.rawData,
    });
    expect(
      await modules.proposals!.recover({
        store,
        user,
        proposal: fixture.proposal.id,
        revision: 1,
      }),
    ).toMatchObject({ status: "pending" });
    const { db, schema } = modules.database!;
    const [saved] = await db
      .select()
      .from(schema.loopProposal)
      .where(eq(schema.loopProposal.id, fixture.proposal.id));
    expect(saved?.approvedAt).toBeNull();
    expect(saved?.requiresMerchantApproval).toBeTrue();
    expect(state.writes).toBe(0);
  });

  test("a third description supersedes the old proposal instead of overwriting the merchant", async () => {
    const fixture = await seed("changed");
    live.set(fixture.product.id, {
      description: "Merchant changed the listing",
      title: fixture.product.title,
      rawData: fixture.product.rawData,
    });
    expect(
      await modules.proposals!.recover({
        store,
        user,
        proposal: fixture.proposal.id,
        revision: 1,
      }),
    ).toMatchObject({ status: "superseded" });
    expect(state.writes).toBe(0);
  });

  test("failed remote verification leaves the publishing claim intact", async () => {
    const fixture = await seed("unavailable");
    state.failRead = true;
    await expect(
      modules.proposals!.recover({
        store,
        user,
        proposal: fixture.proposal.id,
        revision: 1,
      }),
    ).rejects.toThrow("Could not verify");
    state.failRead = false;
    const { db, schema } = modules.database!;
    const [saved] = await db
      .select()
      .from(schema.loopProposal)
      .where(eq(schema.loopProposal.id, fixture.proposal.id));
    expect(saved?.status).toBe("publishing");
    expect(state.writes).toBe(0);
  });

  test("a foreign merchant cannot recover another store's proposal", async () => {
    const fixture = await seed("foreign");
    await expect(
      modules.proposals!.recover({
        store,
        user: "another-user",
        proposal: fixture.proposal.id,
        revision: 1,
      }),
    ).rejects.toThrow();
    expect(state.writes).toBe(0);
  });

  test("bounded capture budgets serve never-checked gaps before repeating yesterday's checks", async () => {
    const checked = await seed("fair-checked");
    const fresh = await seed("fair-new");
    const { db, schema } = modules.database!;
    for (const fixture of [checked, fresh])
      await db
        .update(schema.product)
        .set({
          url: `https://fixture.example/products/${fixture.product.externalId}`,
        })
        .where(eq(schema.product.id, fixture.product.id));
    for (const surface of ["chatgpt", "google_ai_mode"])
      await db.insert(schema.loopSignalCheck).values({
        storeId: store,
        generation: 1,
        gapId: checked.proposal.gapId,
        productId: checked.product.id,
        surface,
        prompt: "fixture",
        requestKey: `yesterday-${surface}-${suffix}`,
        status: "correct",
        createdAt: new Date(Date.now() - 864e5),
      });
    Object.assign(process.env, {
      SCRAPELLM_API_KEY: "fixture-only-no-network",
    });
    process.env["LOOP_DAILY_CAPTURE_LIMIT"] = "2";
    const checks = await import("../app/integration/loop/checks");
    expect(await checks.queueChecks({ store, generation: 1 })).toMatchObject({
      queued: 2,
    });
    const queued = await db
      .select()
      .from(schema.loopSignalCheck)
      .where(
        and(
          eq(schema.loopSignalCheck.storeId, store),
          eq(schema.loopSignalCheck.status, "pending"),
        ),
      );
    expect(queued).toHaveLength(2);
    expect(
      queued.every((entry) => entry.gapId === fresh.proposal.gapId),
    ).toBeTrue();
    expect(await checks.queueChecks({ store, generation: 1 })).toMatchObject({
      queued: 0,
    });
  });

  test("a control that receives a fix is removed with the same baseline subset", async () => {
    const treated = await seed("treated");
    const control = await seed("control");
    const { db, schema } = modules.database!;
    await db
      .update(schema.loopProposal)
      .set({ status: "dismissed" })
      .where(eq(schema.loopProposal.id, control.proposal.id));
    const before = new Date(Date.now() - 2 * 864e5);
    const at = new Date(Date.now() - 864e5);
    await db.insert(schema.loopReasonMapping).values({
      storeId: store,
      reason: "too small",
      parentReason: "",
      category: "fit",
      dataFixable: true,
      source: "rule",
    });
    await db.insert(schema.loopReturnLine).values({
      storeId: store,
      generation: 1,
      loopReturnId: `control-return-${suffix}`,
      lineItemId: `control-line-${suffix}`,
      productId: control.product.id,
      returnReason: "too small",
      returnState: "closed",
      createdAt: before,
      updatedAt: before,
      price: "50",
      currency: "USD",
    });
    const measurements = await import("../app/integration/loop/measurement");
    const frozen = await measurements.freezeBaseline({
      store,
      generation: 1,
      product: treated.product.id,
      attribute: "fit",
      at,
    });
    expect(frozen.controls).toContain(control.product.id);
    expect(frozen.baseline.controlBefore.returns).toBe(1);
    const [measurement] = await db
      .insert(schema.loopMeasurement)
      .values({
        storeId: store,
        proposalId: treated.proposal.id,
        productId: treated.product.id,
        publishedAt: at,
        baseline: frozen.baseline,
        controlProductIds: frozen.controls,
        snapshot: { collecting: true },
      })
      .returning();
    await db
      .update(schema.loopProposal)
      .set({ status: "published", publishedAt: new Date(at.getTime() + 1000) })
      .where(eq(schema.loopProposal.id, control.proposal.id));
    await measurements.refreshMeasurements({ store, generation: 1 });
    const [saved] = await db
      .select()
      .from(schema.loopMeasurement)
      .where(eq(schema.loopMeasurement.id, measurement!.id));
    expect(saved?.snapshot["controlProducts"]).toBe(0);
    expect(saved?.snapshot["excludedControls"]).toBe(1);
    expect(saved?.snapshot["controlBefore"]).toMatchObject({
      returns: 0,
      gapShare: null,
      returnRate: null,
    });
  });

  test("a merchant reason override immediately invalidates affected pending proposals", async () => {
    const fixture = await seed("override");
    const unrelated = await seed("unrelated");
    const { db, schema } = modules.database!;
    for (const proposal of [fixture.proposal, unrelated.proposal])
      await db
        .update(schema.loopProposal)
        .set({ status: "pending" })
        .where(eq(schema.loopProposal.id, proposal.id));
    const [mapping] = await db
      .insert(schema.loopReasonMapping)
      .values({
        storeId: store,
        reason: "wrong dimensions",
        parentReason: "",
        category: "dimensions",
        dataFixable: true,
        source: "rule",
      })
      .returning();
    await db.insert(schema.loopReturnLine).values({
      storeId: store,
      generation: 1,
      loopReturnId: `override-return-${suffix}`,
      lineItemId: `override-line-${suffix}`,
      productId: fixture.product.id,
      returnReason: " Wrong DIMENSIONS ",
      returnState: "closed",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const model = await import("../app/integration/loop/analysis-model");
    await model.overrideReasonMapping({
      store,
      generation: 1,
      mapping: mapping!.id,
      category: "changed_mind",
      dataFixable: false,
    });
    const [changed] = await db
      .select()
      .from(schema.loopProposal)
      .where(eq(schema.loopProposal.id, fixture.proposal.id));
    const [retained] = await db
      .select()
      .from(schema.loopProposal)
      .where(eq(schema.loopProposal.id, unrelated.proposal.id));
    expect(changed?.status).toBe("superseded");
    expect(retained?.status).toBe("pending");
    await expect(
      modules.proposals!.approve({
        store,
        user,
        proposal: fixture.proposal.id,
        revision: 1,
      }),
    ).rejects.toThrow("no longer awaiting review");
    expect(state.writes).toBe(0);
  });

  test("automatic low-evidence suppression can reopen without undoing merchant dismissal", async () => {
    const manual = await seed("manually-dismissed");
    const automatic = await seed("auto-suppressed");
    const { db, schema } = modules.database!;
    await db
      .update(schema.returnExpectationGap)
      .set({ status: "dismissed" })
      .where(eq(schema.returnExpectationGap.id, manual.proposal.gapId));
    const analysis = await import("../app/integration/loop/analysis");
    await analysis.processReturnSignals({ store, generation: 1 });
    const [retained] = await db
      .select()
      .from(schema.returnExpectationGap)
      .where(eq(schema.returnExpectationGap.id, manual.proposal.gapId));
    const [suppressed] = await db
      .select()
      .from(schema.returnExpectationGap)
      .where(eq(schema.returnExpectationGap.id, automatic.proposal.gapId));
    expect(retained?.status).toBe("dismissed");
    expect(retained?.evidence["autoDismissed"]).toBeUndefined();
    expect(suppressed?.evidence["autoDismissed"]).toBeTrue();
    for (const fixture of [manual, automatic]) {
      for (const index of [0, 1, 2, 3, 4])
        await db
          .insert(schema.loopReturnLine)
          .values({
            storeId: store,
            generation: 1,
            loopReturnId: `${fixture.product.id}-return-${index}`,
            lineItemId: `${fixture.product.id}-line-${index}`,
            productId: fixture.product.id,
            returnReason: "too small",
            returnState: "closed",
            createdAt: new Date(Date.now() - 1000),
            updatedAt: new Date(),
          });
    }
    await analysis.processReturnSignals({ store, generation: 1 });
    const [stillDismissed] = await db
      .select()
      .from(schema.returnExpectationGap)
      .where(eq(schema.returnExpectationGap.id, manual.proposal.gapId));
    const [reopened] = await db
      .select()
      .from(schema.returnExpectationGap)
      .where(eq(schema.returnExpectationGap.id, automatic.proposal.gapId));
    expect(stillDismissed?.status).toBe("dismissed");
    expect(reopened?.status).toBe("open");
  });
});
