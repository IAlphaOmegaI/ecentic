import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { sql } from "drizzle-orm";
import { defaultPlaybook, prospectSchema } from "@/lib/outbound";

const endpoint = process.env.OUTBOUND_TEST_DATABASE_URL;
const originalFetch = globalThis.fetch;
const fetched = (
  handler: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>,
) => {
  globalThis.fetch = Object.assign(handler, {
    preconnect: originalFetch.preconnect,
  });
};
const originalEnvironment = new Map(
  [
    "DATABASE_URL",
    "CREDENTIAL_ENCRYPTION_KEY",
    "OUTBOUND_GOOGLE_CLIENT_ID",
    "OUTBOUND_GOOGLE_CLIENT_SECRET",
    "OUTBOUND_GOOGLE_REDIRECT_URI",
    "APP_HOST",
  ].map((key) => [key, process.env[key]]),
);
const modules: {
  database?: typeof import("@/server/database");
  store?: typeof import("@/server/app/outbound/store");
  mailboxes?: typeof import("@/server/app/outbound/transport-store");
  preparation?: typeof import("@/server/app/outbound/preparation");
} = {};
const actor = "outbound-transport-fixture";
const required = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const active = () => {
  if (
    !modules.database ||
    !modules.store ||
    !modules.mailboxes ||
    !modules.preparation
  )
    throw new Error("Fixture database not initialized");
  return {
    ...modules.database,
    store: modules.store,
    mailboxes: modules.mailboxes,
    preparation: modules.preparation,
  };
};

describe.skipIf(!endpoint)("outbound isolated transport persistence", () => {
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
      OUTBOUND_GOOGLE_CLIENT_ID: "fixture-client",
      OUTBOUND_GOOGLE_CLIENT_SECRET: "fixture-secret",
      OUTBOUND_GOOGLE_REDIRECT_URI: "https://example.com/callback",
      APP_HOST: "https://example.com",
    });
    mock.module("server-only", () => ({}));
    modules.database = await import("@/server/database");
    modules.store = await import("@/server/app/outbound/store");
    modules.mailboxes = await import("@/server/app/outbound/transport-store");
    modules.preparation = await import("@/server/app/outbound/preparation");
  }, 60_000);

  beforeEach(async () => {
    const { db, store } = active();
    await db.execute(
      sql`truncate outbound_integration_job, outbound_send_attempt, outbound_event, outbound_revision, outbound_prospect, outbound_person, outbound_company, outbound_suppression, outbound_inbox, outbound_playbook cascade`,
    );
    required(await store.savePlaybook(actor, defaultPlaybook));
    fetched(async () => {
      throw new Error("Unexpected external request in isolated fixture");
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });
  afterAll(() => {
    for (const [key, value] of originalEnvironment) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else Object.assign(process.env, { [key]: value });
    }
  });

  const expiredInbox = async () => {
    const { db, schema, mailboxes } = active();
    const rows = await db
      .insert(schema.outboundInbox)
      .values({
        email: "xhuri@joinecentic.com",
        fromName: defaultPlaybook.fromName,
        signer: defaultPlaybook.signature,
        enabled: true,
        accessToken: "old-access",
        refreshToken: "fixture-refresh",
        accessTokenExpiresAt: new Date(0),
      })
      .returning();
    const id = rows[0]?.id;
    if (!id) throw new Error("Fixture inbox was not created");
    const inbox = required(await mailboxes.read(id));
    if (!inbox) throw new Error("Fixture inbox was not found");
    return inbox;
  };

  test("an in-flight refresh cannot restore disconnected credentials", async () => {
    const { mailboxes } = active();
    const inbox = await expiredInbox();
    const requests: string[] = [];
    fetched(async (input) => {
      requests.push(String(input));
      required(await mailboxes.disconnect(actor, inbox.id));
      return new Response(
        JSON.stringify({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      );
    });
    const refreshed = await mailboxes.access(inbox);
    expect(refreshed.success).toBe(false);
    const disconnected = required(await mailboxes.read(inbox.id));
    expect(disconnected?.enabled).toBe(false);
    expect(disconnected?.refreshToken).toBeNull();
    expect(disconnected?.accessToken).toBeNull();
    expect(requests).toEqual(["https://oauth2.googleapis.com/token"]);
  });

  test("successful refresh retains an omitted refresh token", async () => {
    const { mailboxes } = active();
    const inbox = await expiredInbox();
    fetched(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "new-access",
            expires_in: 3600,
            token_type: "Bearer",
          }),
        ),
    );
    expect(required(await mailboxes.access(inbox))).toBe("new-access");
    const refreshed = required(await mailboxes.read(inbox.id));
    expect(refreshed?.refreshToken).toBe("fixture-refresh");
    expect(refreshed?.accessToken).toBe("new-access");
  });

  test("preparation persists policy and website mismatch holds without public requests", async () => {
    const { store, preparation } = active();
    for (const details of [
      { domain: "outsidepolicy.com", website: "", country: "DE" },
      {
        domain: "wrongstore.com",
        website: "https://differentstore.com",
        country: "US",
      },
    ]) {
      const created = required(
        await store.saveProspect(
          actor,
          prospectSchema.parse({
            ...details,
            company: "Fixture company",
            name: "Jane Smith",
          }),
        ),
      );
      const prepared = required(
        await preparation.prepare(actor, created.prospect),
      );
      expect(prepared.status).toBe("hold");
      if (prepared.reason === null)
        throw new Error("Expected a persisted hold reason");
      const held = required(await store.readProspect(created.prospect));
      expect(held?.status).toBe("held");
      expect(held?.holdReason).toBe(prepared.reason);
    }
  });
});
