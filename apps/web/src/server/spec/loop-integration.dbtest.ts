import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { createHmac, randomUUID } from "node:crypto";
import postgres from "postgres";

const target = process.env["LOOP_TEST_DATABASE_URL"];
describe.skipIf(!target)("Loop isolated merchant lifecycle fixture", () => {
  const identity = randomUUID();
  const store = `loop-store-${identity}`,
    otherStore = `loop-other-${identity}`,
    user = `loop-user-${identity}`,
    product = `loop-product-${identity}`;
  const originalEnvironment = { ...process.env };
  const originalFetch = globalThis.fetch;
  const database =
    target && new URL(target).hostname === "127.0.0.1"
      ? postgres(target, { max: 2 })
      : null;
  const secret = "fixture-webhook-secret";
  const hooks: {
    id: string;
    shop_id: string;
    topic: string;
    trigger: string;
    url: string;
    status: string;
  }[] = [];
  const requests: string[] = [];
  const created = new Date(Date.now() - 86_400_000).toISOString();
  const returns = Array.from({ length: 5 }, (_, index) => ({
    id: String(1000 + index),
    shop_id: "55",
    state: "closed",
    created_at: created,
    updated_at: created,
    edited_at: null,
    order_name: `#ORDER-${index}`,
    provider_order_id: String(9000 + index),
    currency: "USD",
    outcome: "refund",
    customer: { email: "private@example.test", name: "Private Person" },
    address: { city: "Private city" },
    line_items: [
      {
        line_item_id: String(2000 + index),
        provider_line_item_id: String(3000 + index),
        product_id: "101",
        variant_id: "201",
        sku: "shoe-small",
        title: "Fixture product",
        price: "20.00",
        refund: "20.00",
        return_reason: "Too small",
        parent_return_reason: "Size and fit",
        return_comment: `runs small. Contact private@example.test about #ORDER-${index}`,
        exchange_variant: "202",
        returned_at: created,
        outcome: "refund",
      },
    ],
    exchanges: [{ product_id: "101", variant_id: "202" }],
  }));
  const state = {
    captures: 0,
    hookIdentifier: 0,
    generations: 0,
    publications: [] as { product: string; data: Record<string, unknown> }[],
    captureGate: null as { promise: Promise<void>; entered: () => void } | null,
  };
  const modules = {} as {
    model: typeof import("../app/integration/loop/model");
    jobs: typeof import("../app/integration/loop/jobs");
    oauth: typeof import("../app/integration/loop/oauth");
    hooks: typeof import("../app/integration/loop/webhooks");
  };
  beforeAll(async () => {
    if (!database || !target || new URL(target).hostname !== "127.0.0.1")
      throw new Error(
        "Loop fixtures require an explicit isolated localhost database",
      );
    Object.assign(process.env, {
      DATABASE_URL: target,
      CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 81).toString("base64"),
      APP_HOST: "https://fixture.ecentic.test",
      SCRAPELLM_API_KEY: "fixture-only",
      LOOP_DAILY_CAPTURE_LIMIT: "10",
    });
    mock.module("../utils/ai", () => ({
      generate: async (input: { label: string }) => {
        state.generations += 1;
        if (input.label === "loop.reason-classification")
          return { category: "fit", dataFixable: true };
        if (input.label === "loop.comment-attributes")
          return { attributes: ["runs small"] };
        if (input.label === "loop.answer-assessment")
          return {
            verdict: "wrong",
            productQuote: "Fixture product",
            answerQuote: "runs true to size",
            catalogFact: "Runs small.",
            explanation: "The answer contradicts the catalog.",
          };
        throw new Error("Unexpected fixture model call");
      },
    }));
    mock.module("../utils/scrapellm", () => ({
      execute: async (input: { surface: string }) => {
        state.captures += 1;
        if (state.captureGate) {
          state.captureGate.entered();
          await state.captureGate.promise;
        }
        return {
          success: true,
          data: {
            channel: "ui",
            status: "completed",
            answerContent: "Fixture product runs true to size.",
            capturedAt: new Date().toISOString(),
            surface: input.surface,
            geo: "US",
            provider: "fixture",
            cached: false,
          },
        };
      },
      proseOf: () => null,
    }));
    mock.module("../app/store", () => ({
      publishProductListing: async (input: {
        product: string;
        data: Record<string, unknown>;
      }) => {
        state.publications.push(input);
        return { success: true, data: {} };
      },
    }));
    await database`insert into "user" (id,name,email,surname) values (${user},'Fixture',${`${identity}@example.test`},'Merchant')`;
    for (const id of [store, otherStore])
      await database`insert into store (id,"userId",platform,name,domain,status,"storeId") values (${id},${user},'shopify','Fixture','https://loop-fixture.myshopify.com','connected','1001')`;
    await database`insert into product (id,"storeId","userId","externalId",title,description,price,currency,url,"rawData") values (${product},${store},${user},'101','Fixture product','Runs small.','20.00','USD','https://fixture.example/products/shoe',${database.json(
      {
        variants: [
          { id: 201, option1: "S" },
          { id: 202, option1: "M" },
        ],
        options: [{ name: "Size", position: 1 }],
      },
    )})`;
    globalThis.fetch = Object.assign(
      async (input: string | URL | Request, options?: RequestInit) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
        );
        requests.push(
          `${options?.method ?? "GET"} ${url.pathname}${url.search}`,
        );
        if (url.hostname !== "api.loopreturns.com")
          throw new Error("Unexpected fixture host");
        if (url.pathname === "/api/v1/auth/me")
          return Response.json({
            shop_id: "55",
            scopes: ["returns", "developer_tools"],
          });
        if (url.pathname.endsWith("/warehouse/return/list")) {
          expect(url.searchParams.get("paginate")).toBe("true");
          const matching =
            url.searchParams.get("state") === "closed" &&
            Date.parse(url.searchParams.get("from") ?? "") <=
              Date.parse(created) &&
            Date.parse(created) <= Date.parse(url.searchParams.get("to") ?? "");
          return Response.json({
            returns: matching ? returns : [],
            nextPageUrl: null,
          });
        }
        if (url.pathname.endsWith("/webhooks") && options?.method === "POST") {
          state.hookIdentifier += 1;
          const hook = {
            ...JSON.parse(String(options.body)),
            id: String(state.hookIdentifier),
            shop_id: "55",
          };
          hooks.push(hook);
          return Response.json(hook);
        }
        if (url.pathname.endsWith("/webhooks"))
          return Response.json({ webhooks: hooks });
        if (
          /\/webhooks\/\d+$/.test(url.pathname) &&
          options?.method === "DELETE"
        ) {
          const index = hooks.findIndex(
            (hook) => hook.id === url.pathname.split("/").at(-1),
          );
          if (index >= 0) hooks.splice(index, 1);
          return new Response(null, { status: 204 });
        }
        throw new Error("Unexpected fixture provider request");
      },
      { preconnect: originalFetch.preconnect },
    ) as typeof fetch;
    modules.model = await import("../app/integration/loop/model");
    modules.jobs = await import("../app/integration/loop/jobs");
    modules.oauth = await import("../app/integration/loop/oauth");
    modules.hooks = await import("../app/integration/loop/webhooks");
  });
  afterAll(async () => {
    globalThis.fetch = originalFetch;
    mock.restore();
    if (database) {
      await database`delete from "user" where id=${user}`;
      await database.end();
    }
    for (const name of [
      "DATABASE_URL",
      "CREDENTIAL_ENCRYPTION_KEY",
      "APP_HOST",
      "SCRAPELLM_API_KEY",
      "LOOP_DAILY_CAPTURE_LIMIT",
    ]) {
      if (originalEnvironment[name] === undefined) delete process.env[name];
      else process.env[name] = originalEnvironment[name];
    }
  });
  test("connect validates, encrypts grants, and checkpoints 180 days", async () => {
    await modules.oauth.connectApiKey({
      store,
      user,
      apiKey: "fixture-api-key",
      webhookSecret: secret,
    });
    const [row] =
      await database!`select "apiKey","webhookSecret" from loop_connections where "storeId"=${store}`;
    expect(row?.["apiKey"]).toStartWith("ecentic.enc.v1:");
    expect(row?.["webhookSecret"]).toStartWith("ecentic.enc.v1:");
    const jobs =
      await database!`select payload from loop_jobs where "storeId"=${store} and kind='backfill'`;
    expect(jobs.length).toBe(24);
    expect(new Set(jobs.map((job) => job["payload"].state))).toEqual(
      new Set(["open", "closed", "expired", "review"]),
    );
    expect(
      jobs.every(
        (job) =>
          Date.parse(job["payload"].to) - Date.parse(job["payload"].from) <=
          30 * 86_400_000,
      ),
    ).toBe(true);
    await modules.jobs.drain({ store, limit: 30 });
    const lines =
      await database!`select * from loop_return_lines where "storeId"=${store}`;
    expect(lines.length).toBe(5);
    expect(
      lines.every(
        (line) =>
          line["productId"] === product &&
          !line["redactedComment"].includes("private@example.test") &&
          !line["redactedComment"].includes("ORDER-"),
      ),
    ).toBe(true);
    expect(
      JSON.stringify(
        await database!`select payload from loop_jobs where "storeId"=${store}`,
      ),
    ).not.toContain("Private Person");
    expect(hooks.length).toBe(3);
  }, 30_000);
  test("gap reaches reused capture runner and approval-required proposal", async () => {
    await modules.jobs.drain({ store, limit: 30 });
    await modules.jobs.drain({ store, limit: 30 });
    const gaps =
      await database!`select * from return_expectation_gaps where "storeId"=${store}`;
    expect(gaps.length).toBe(1);
    expect(gaps[0]?.["count"]).toBe(5);
    expect(gaps[0]?.["share"]).toBe(1);
    expect(state.captures).toBe(2);
    const checks =
      await database!`select status from loop_signal_checks where "storeId"=${store}`;
    expect(checks.every((check) => check["status"] === "wrong")).toBe(true);
    const proposals =
      await database!`select * from loop_proposals where "storeId"=${store}`;
    expect(proposals.length).toBe(1);
    expect(proposals[0]?.["status"]).toBe("pending");
    expect(proposals[0]?.["requiresMerchantApproval"]).toBe(true);
  }, 30_000);
  test("merchant approval publishes exactly the saved diff without model regeneration", async () => {
    const { approve } = await import("../app/integration/loop/proposals");
    const [proposal] =
      await database!`select * from loop_proposals where "storeId"=${store}`;
    const before = state.generations;
    await approve({
      store,
      user,
      proposal: proposal!["id"],
      revision: proposal!["revision"],
    });
    expect(state.generations).toBe(before);
    expect(state.publications).toHaveLength(1);
    expect(state.publications[0]?.data["body_html"]).toBe(
      proposal!["proposed"].description,
    );
    const [published] =
      await database!`select status from loop_proposals where "storeId"=${store}`;
    expect(published?.["status"]).toBe("published");
    expect(
      (
        await database!`select id from loop_measurements where "storeId"=${store}`
      ).length,
    ).toBe(1);
  });
  test("duplicate deliveries enqueue once; cancellations block stale snapshots", async () => {
    const connection = await modules.model.requireActive({ store });
    const delivered = {
      ...returns[0],
      trigger: "return.updated",
      topic: "return",
      updated_at: new Date().toISOString(),
    };
    const body = Buffer.from(JSON.stringify(delivered));
    const input = {
      url: new URL(modules.hooks.webhookAddress(connection)),
      body,
      headers: new Headers({
        "X-Loop-Signature": createHmac("sha256", secret)
          .update(body)
          .digest("base64"),
      }),
    };
    await modules.hooks.acceptWebhook(input);
    await modules.hooks.acceptWebhook(input);
    expect(
      (
        await database!`select id from loop_jobs where "storeId"=${store} and kind='webhook'`
      ).length,
    ).toBe(1);
    await modules.jobs.drain({ store, limit: 1 });
    const { parseReturn } = await import("@ecentic/loop");
    await modules.model.ingest({
      store,
      generation: connection.generation,
      returns: [
        parseReturn(store, {
          ...delivered,
          state: "cancelled",
          updated_at: new Date(Date.now() + 1000).toISOString(),
          line_items: [],
        }),
      ],
    });
    await modules.model.ingest({
      store,
      generation: connection.generation,
      returns: [parseReturn(store, returns[0])],
    });
    expect(
      (
        await database!`select id from loop_return_lines where "storeId"=${store}`
      ).length,
    ).toBe(4);
    await expect(
      modules.hooks.acceptWebhook({
        ...input,
        body: Buffer.from(`${body.toString()} `),
      }),
    ).rejects.toThrow("invalid_signature");
  });
  test("older edited_at cannot overwrite a newer return state", async () => {
    const connection = await modules.model.requireActive({ store });
    const { parseReturn } = await import("@ecentic/loop");
    const recent = {
      ...returns[1],
      edited_at: created,
      updated_at: new Date(Date.now() + 1000).toISOString(),
      state: "closed",
    };
    const stale = { ...recent, updated_at: created, state: "open" };
    await modules.model.ingest({
      store,
      generation: connection.generation,
      returns: [parseReturn(store, recent), parseReturn(store, stale)],
    });
    const [row] =
      await database!`select "returnState" from loop_return_lines where "storeId"=${store} and "lineItemId"='2001'`;
    expect(row?.["returnState"]).toBe("closed");
  });
  test("guards reject missing or mixed merchants", async () => {
    await expect(modules.model.getConnection({ store: "" })).rejects.toThrow();
    await expect(
      modules.model.requireActive({ store: otherStore }),
    ).rejects.toThrow();
    await expect(
      modules.model.requireStore({ store, user: "another-user" }),
    ).rejects.toThrow("store_not_found");
    const connection = await modules.model.requireActive({ store });
    const { parseReturn } = await import("@ecentic/loop");
    await expect(
      modules.model.ingest({
        store,
        generation: connection.generation,
        returns: [parseReturn(otherStore, returns[0])],
      }),
    ).rejects.toThrow("shop_mismatch");
  });
  test("one Loop shop cannot be active on two ecentic stores", async () => {
    await expect(
      modules.oauth.connectApiKey({
        store: otherStore,
        user,
        apiKey: "fixture-api-key",
        webhookSecret: secret,
      }),
    ).rejects.toThrow();
    const [other] =
      await database!`select "apiKey" from loop_connections where "storeId"=${otherStore}`;
    expect(other?.["apiKey"]).toBeNull();
    expect(
      (
        await database!`select id from loop_connections where "shopId"='55' and "disconnectedAt" is null`
      ).length,
    ).toBe(1);
  });
  test("abandoned OAuth installation expires without retaining its verifier", async () => {
    const pending = await modules.model.prepare({ store: otherStore, user });
    const { db, schema } = await import("../database");
    await db.insert(schema.loopInstallation).values({
      id: `expired-${identity}`,
      storeId: otherStore,
      userId: user,
      organization: "fixture",
      verifier: "x".repeat(43),
      stateHash: "fixture-state-hash",
      generation: pending.generation,
      expiresAt: new Date(Date.now() - 600_000),
    });
    await modules.jobs.maintainStore({ store: otherStore });
    expect(
      (
        await database!`select id from loop_installations where "storeId"=${otherStore}`
      ).length,
    ).toBe(0);
    const [connection] =
      await database!`select "callbackToken","lastError" from loop_connections where "storeId"=${otherStore}`;
    expect(connection?.["callbackToken"]).toBeNull();
    expect(connection?.["lastError"]).toBe("installation_expired");
  });
  test("daily reconciliation includes cancellation tombstones and repairs missing hooks", async () => {
    hooks.splice(0, 1);
    await modules.jobs.maintainStore({ store });
    const jobs =
      await database!`select payload from loop_jobs where "storeId"=${store} and kind='reconcile'`;
    expect(jobs.length).toBe(5);
    expect(
      jobs.every(
        (job) =>
          job["payload"].filter === "updated_at" &&
          Date.parse(job["payload"].to) - Date.parse(job["payload"].from) ===
            48 * 3600_000,
      ),
    ).toBe(true);
    expect(jobs.some((job) => job["payload"].state === "cancelled")).toBe(true);
    await modules.jobs.drain({ store, limit: 20 });
    expect(hooks.length).toBe(3);
    expect(
      (
        await database!`select id from loop_return_lines where "storeId"=${store}`
      ).length,
    ).toBe(4);
  }, 30_000);
  test("expired worker lease cannot write after another worker takes ownership", async () => {
    const connection = await modules.model.requireActive({ store });
    await modules.model.enqueue({
      store,
      generation: connection.generation,
      kind: "analysis",
      key: "lease-fixture",
    });
    const first = await modules.model.claim({ store });
    expect(first).not.toBeNull();
    await database!`update loop_connections set "leaseUntil"=${new Date(Date.now() - 1000).toISOString()}::timestamp where "storeId"=${store}`;
    const second = await modules.model.claim({ store });
    expect(second).not.toBeNull();
    await expect(modules.model.fenced(first!, async () => {})).rejects.toThrow(
      "superseded",
    );
    const { parseReturn } = await import("@ecentic/loop");
    await expect(
      modules.model.ingest({
        store,
        generation: connection.generation,
        lease: first!,
        returns: [parseReturn(store, returns[0])],
      }),
    ).rejects.toThrow("superseded");
    await modules.model.finish(second!);
  });
  test("disconnect erases grants/evidence and rejects old work; purge is immediate", async () => {
    const connection = await modules.model.requireActive({ store });
    const { readContext } = await import(
      "../app/integration/loop/analysis-model"
    );
    const { productFingerprint } = await import(
      "../app/integration/loop/signals"
    );
    const { runNextCheck } = await import("../app/integration/loop/checks");
    const context = await readContext({
      store,
      generation: connection.generation,
    });
    const expected = {
      fingerprint: productFingerprint(store, context.products[0]!),
      attribute: "fit",
    };
    await database!`insert into loop_signal_checks ("storeId",generation,"gapId","productId",surface,prompt,expected,"requestKey") values (${store},${connection.generation},${context.gaps[0]!.id},${product},'chatgpt','Fixture product fit',${database!.json(expected)},'disconnect-race')`;
    const [savedCheck] =
      await database!`select expected from loop_signal_checks where "storeId"=${store} and "requestKey"='disconnect-race'`;
    expect(savedCheck?.["expected"]).toEqual(expected);
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    state.captureGate = {
      promise: release.promise,
      entered: () => entered.resolve(),
    };
    const capture = runNextCheck({ store, generation: connection.generation });
    await Promise.race([
      entered.promise,
      capture.then((result) => {
        throw new Error(
          `Capture exited before fixture gate: ${JSON.stringify(result)}`,
        );
      }),
    ]);
    const old = await modules.model.disconnect({ store, user });
    release.resolve();
    await expect(capture).rejects.toThrow("superseded");
    state.captureGate = null;
    expect(old).not.toBeNull();
    const [row] =
      await database!`select * from loop_connections where "storeId"=${store}`;
    expect(row?.["apiKey"]).toBeNull();
    expect(row?.["webhookSecret"]).toBeNull();
    expect(row?.["status"]).toBe("disconnected");
    expect(
      (
        await database!`select id from loop_signal_checks where "storeId"=${store}`
      ).length,
    ).toBe(0);
    expect(
      (await database!`select id from loop_proposals where "storeId"=${store}`)
        .length,
    ).toBe(0);
    expect(
      (await database!`select id from loop_jobs where "storeId"=${store}`)
        .length,
    ).toBe(0);
    const { parseReturn } = await import("@ecentic/loop");
    await expect(
      modules.model.ingest({
        store,
        generation: old!.generation,
        returns: [parseReturn(store, returns[0])],
      }),
    ).rejects.toThrow("superseded");
    await modules.jobs.deleteRemoteWebhooks(old!);
    expect(hooks.length).toBe(0);
    await modules.model.purge({ store });
    expect(
      (
        await database!`select id from loop_return_lines where "storeId"=${store}`
      ).length,
    ).toBe(0);
    expect(
      (
        await database!`select id from loop_return_versions where "storeId"=${store}`
      ).length,
    ).toBe(0);
    const gaps =
      await database!`select evidence,count from return_expectation_gaps where "storeId"=${store}`;
    expect(gaps[0]?.["evidence"]).toEqual({ refundEstimated: false });
    const [measurement] =
      await database!`select baseline,snapshot,"controlProductIds" from loop_measurements where "storeId"=${store}`;
    expect(measurement?.["baseline"].mappings).toBeUndefined();
    expect(measurement?.["baseline"].perControl).toBeUndefined();
    expect(measurement?.["snapshot"].eligibleControlIds).toBeUndefined();
    expect(measurement?.["snapshot"].collecting).toBe(false);
    expect(measurement?.["controlProductIds"]).toEqual([]);
    expect(gaps[0]?.["count"]).toBe(5);
  });
});
