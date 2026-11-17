import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import * as Unipile from "@/server/utils/outbound/unipile";

mock.module("server-only", () => ({}));
const Credentials = await import("@/server/app/outbound/provider-credentials");
const metadata = spyOn(Credentials, "metadata");
const resolveKey = spyOn(Credentials, "resolveKey");
afterAll(() => {
  metadata.mockRestore();
  resolveKey.mockRestore();
});

const originalFetch = globalThis.fetch;
const originalKey = process.env["OUTBOUND_UNIPILE_API_KEY"];
const calls: { url: string; options?: RequestInit }[] = [];
const respond = (body: unknown, status = 200, headers?: HeadersInit) => {
  globalThis.fetch = Object.assign(
    async (input: string | URL | Request, options?: RequestInit) => {
      calls.push({ url: String(input), options });
      return new Response(JSON.stringify(body), { status, headers });
    },
    { preconnect: originalFetch.preconnect },
  );
};

beforeEach(() => {
  calls.length = 0;
  Object.assign(process.env, { OUTBOUND_UNIPILE_API_KEY: "test-unipile-key" });
  metadata.mockResolvedValue({
    success: true,
    data: { configured: false, configuration: {}, credentialStatus: "missing" },
  });
  resolveKey.mockImplementation(async () => ({
    success: true,
    data: process.env.OUTBOUND_UNIPILE_API_KEY ?? null,
  }));
  globalThis.fetch = Object.assign(
    async () => {
      throw new Error("Unexpected network request in Unipile test");
    },
    { preconnect: originalFetch.preconnect },
  );
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined)
    Reflect.deleteProperty(process.env, "OUTBOUND_UNIPILE_API_KEY");
  else Object.assign(process.env, { OUTBOUND_UNIPILE_API_KEY: originalKey });
});

const auth = {
  state: "a".repeat(43),
  redirectUri: "http://localhost:3001/api/outbound/linkedin/callback",
};
const account = {
  object: "Account",
  id: "acc_owner",
  user_id: "ACo_owner",
  name: "Sender",
  created_at: "2026-11-14T00:00:00.000Z",
  application_id: "app_outbound",
  provider: "linkedin",
  status: "running",
  is_locked: false,
  metadata: { products_connection_status: { classic: "running" } },
};

describe("Unipile V2 connection", () => {
  test("personal conversation lookup uses the V2 user chat contract", async () => {
    respond({
      object: "ChatLookup",
      data: [{ chat_id: "chat_fixture", has_history: true }],
    });
    expect(await Unipile.getUserChats("acc_owner", "ACo_person")).toMatchObject(
      { success: true, data: { data: [{ chat_id: "chat_fixture" }] } },
    );
    expect(calls[0]?.url).toBe(
      "https://api.unipile.com/v2/acc_owner/users/ACo_person/chat",
    );
    expect(calls[0]?.options?.method).toBe("GET");
    expect(calls[0]?.options?.body).toBeUndefined();
  });

  test("message history preserves sender/event flags and bounded pagination metadata", async () => {
    respond({
      data: [
        {
          object: "Message",
          id: "message_fixture",
          sender_id: "ACo_person",
          chat_id: "chat_fixture",
          timestamp: "2026-11-16T17:00:00Z",
          is_sender: false,
          is_event: false,
          text: "Please stop",
        },
      ],
      total_count: 1,
    });
    const result = await Unipile.getChatMessages("acc_owner", "chat_fixture");
    expect(result).toMatchObject({
      success: true,
      data: { data: [{ is_sender: false, is_event: false }], total_count: 1 },
    });
    expect(calls[0]?.url).toBe(
      "https://api.unipile.com/v2/acc_owner/chats/chat_fixture/messages?limit=20",
    );
    respond({ data: [{ object: "Message", id: "missing_flags" }] });
    expect(
      await Unipile.getChatMessages("acc_owner", "chat_fixture"),
    ).toMatchObject({ success: false, error: { code: "contract" } });
  });
  test("configuration only exposes presence and an absent key makes no request", async () => {
    expect(await Unipile.getConfiguration()).toEqual({ configured: true });
    Reflect.deleteProperty(process.env, "OUTBOUND_UNIPILE_API_KEY");
    expect(await Unipile.getConfiguration()).toEqual({ configured: false });
    const result = await Unipile.getAccount("acc_owner");
    expect(result).toMatchObject({
      success: false,
      error: { code: "configuration" },
    });
    expect(calls).toHaveLength(0);
  });

  test("stored metadata reports configuration without reading the secret", async () => {
    Reflect.deleteProperty(process.env, "OUTBOUND_UNIPILE_API_KEY");
    metadata.mockResolvedValue({
      success: true,
      data: {
        configured: true,
        configuration: {},
        credentialStatus: "verified",
      },
    });
    const reads = resolveKey.mock.calls.length;
    expect(await Unipile.getConfiguration()).toEqual({ configured: true });
    expect(resolveKey.mock.calls.length).toBe(reads);
    expect(calls).toHaveLength(0);
  });

  test("provider calls use the key resolved from encrypted storage", async () => {
    resolveKey.mockResolvedValue({ success: true, data: "stored-test-key" });
    respond(account);
    expect((await Unipile.getAccount("acc_owner")).success).toBe(true);
    expect(calls[0]?.options?.headers).toMatchObject({
      "X-API-KEY": "stored-test-key",
    });
  });

  test("validates an account API key with a read-only request and discards metadata", async () => {
    respond({
      object: "Accounts",
      data: [{ name: "discard-this-account-name" }],
      has_more: false,
    });
    expect(await Unipile.validateApiKey("candidate-test-key")).toEqual({
      success: true,
      data: { valid: true },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.unipile.com/v2/accounts/?limit=1&provider=linkedin",
    );
    expect(calls[0]?.options).toMatchObject({
      method: "GET",
      headers: { "X-API-KEY": "candidate-test-key" },
      redirect: "error",
      cache: "no-store",
    });
    expect(calls[0]?.options?.body).toBeUndefined();
  });

  test("a valid empty account collection is accepted but a wrong envelope is not", async () => {
    respond({ object: "Accounts", data: [], has_more: false });
    expect((await Unipile.validateApiKey("candidate-test-key")).success).toBe(
      true,
    );
    respond({ object: "ApiKeys", data: [], has_more: false });
    expect(await Unipile.validateApiKey("candidate-test-key")).toMatchObject({
      success: false,
      error: { code: "contract" },
    });
  });

  test("hosted auth uses V2 lowercase provider, bounded lifetime, and server key", async () => {
    respond({
      object: "HostedAuthLink",
      link: "https://auth.unipile.com/session/123",
    });
    const started = Date.now();
    const result = await Unipile.createAuthLink(auth);
    expect(result).toMatchObject({
      success: true,
      data: { link: "https://auth.unipile.com/session/123" },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.unipile.com/v2/auth/link");
    expect(calls[0]?.options).toMatchObject({
      method: "POST",
      redirect: "error",
      cache: "no-store",
      headers: { "X-API-KEY": "test-unipile-key" },
    });
    const body = JSON.parse(String(calls[0]?.options?.body));
    expect(body).toMatchObject({
      providers: "linkedin",
      state: auth.state,
      redirect_uri: auth.redirectUri,
      config: { linkedin: { products: ["classic"] } },
    });
    expect(body.account_id).toBeUndefined();
    expect(Date.parse(body.expires_on)).toBeGreaterThanOrEqual(
      started + 600000,
    );
    expect(Date.parse(body.expires_on)).toBeLessThanOrEqual(
      Date.now() + 600000,
    );
  });

  test("reconnect replaces providers with the existing account ID", async () => {
    respond({
      object: "HostedAuthLink",
      link: "https://auth.unipile.com/session/reconnect",
    });
    await Unipile.createAuthLink({ ...auth, accountId: "acc_owner" });
    const body = JSON.parse(String(calls[0]?.options?.body));
    expect(body.account_id).toBe("acc_owner");
    expect(body.providers).toBeUndefined();
  });

  test.each([
    "https://auth.unipile.com.evil.example/session",
    "https://evil.example/?next=https://auth.unipile.com",
    "https://auth.unipile.com@evil.example/session",
    "https://user:secret@auth.unipile.com/session",
    "https://auth.unipile.com:8443/session",
    "http://auth.unipile.com/session",
  ])("rejects an untrusted hosted-auth redirect: %s", async (link) => {
    respond({ object: "HostedAuthLink", link });
    const result = await Unipile.createAuthLink(auth);
    expect(result).toMatchObject({
      success: false,
      error: { code: "contract" },
    });
    expect(calls).toHaveLength(1);
  });

  test.each([
    { ...auth, state: "short" },
    { ...auth, redirectUri: "http://public.example/callback" },
    { ...auth, redirectUri: "javascript:alert(1)" },
    { ...auth, redirectUri: "https://name:password@example.com/callback" },
    { ...auth, accountId: "../accounts" },
  ])(
    "rejects invalid connection inputs before a provider request",
    async (input) => {
      respond({});
      expect(await Unipile.createAuthLink(input)).toMatchObject({
        success: false,
        error: { code: "input" },
      });
      expect(calls).toHaveLength(0);
    },
  );

  test("reads the exact LinkedIn account and preserves connection status", async () => {
    respond({
      ...account,
      status: "partial",
      is_locked: true,
      metadata: {
        products_connection_status: {
          classic: "running",
          sales_navigator: "disconnected",
        },
      },
    });
    expect(await Unipile.getAccount("acc_owner")).toMatchObject({
      success: true,
      data: { id: "acc_owner", status: "partial", is_locked: true },
    });
    expect(calls[0]?.url).toBe("https://api.unipile.com/v2/accounts/acc_owner");
  });

  test.each([
    { ...account, id: "acc_somebody_else" },
    { ...account, provider: "google" },
    { ...account, status: "unknown" },
  ])(
    "rejects another account, provider, or unsupported status",
    async (body) => {
      respond(body);
      expect(await Unipile.getAccount("acc_owner")).toMatchObject({
        success: false,
        error: { code: "contract" },
      });
    },
  );
});

describe("Unipile V2 approved actions", () => {
  test("resolves a personal profile through Unipile without fetching LinkedIn", async () => {
    respond({
      object: "UserProfile",
      type: "individual",
      id: "ACo_person",
      display_name: "Person Name",
      public_identifier: "person-name",
      provider: "linkedin",
      is_blocked: false,
      specifics: {
        network_distance: "SECOND_DEGREE",
        relation_request: {
          object: "RelationRequest",
          id: "invitation-1",
          type: "sent",
        },
      },
    });
    const result = await Unipile.resolveUser(
      "acc_owner",
      "https://www.linkedin.com/in/person-name/?tracking=example",
    );
    expect(result).toMatchObject({
      success: true,
      data: {
        id: "ACo_person",
        specifics: { relation_request: { type: "sent" } },
      },
    });
    expect(calls[0]?.url).toBe(
      "https://api.unipile.com/v2/acc_owner/users/person-name?variant=linkedin_classic",
    );
  });

  test.each([
    "https://linkedin.com.evil.example/in/person",
    "https://www.linkedin.com/company/company",
    "https://www.linkedin.com/in/person%2Fother",
    "https://www.linkedin.com/in/person/other",
    "http://localhost/in/person",
  ])(
    "rejects unsupported profile URL without network work: %s",
    async (url) => {
      respond({});
      expect(await Unipile.resolveUser("acc_owner", url)).toMatchObject({
        success: false,
        error: { code: "input" },
      });
      expect(calls).toHaveLength(0);
    },
  );

  test("invites the resolved provider user and preserves exact approved text", async () => {
    const text = "Hi Jordan,\nI enjoyed your article. ";
    respond({ object: "RelationRequest", type: "sent", id: "invite-1" }, 201);
    expect(
      await Unipile.sendInvitation("acc_owner", "ACo_person", text),
    ).toMatchObject({
      success: true,
      data: { id: "invite-1", type: "sent" },
    });
    expect(calls[0]?.url).toBe(
      "https://api.unipile.com/v2/acc_owner/users/me/relation-requests",
    );
    expect(JSON.parse(String(calls[0]?.options?.body))).toEqual({
      user_id: "ACo_person",
      message: text,
    });
  });

  test("first message uses a single user string rather than a group array", async () => {
    respond({
      object: "ChatStarted",
      chat_id: "chat-1",
      message_id: "message-1",
    });
    const result = await Unipile.startChat(
      "acc_owner",
      "ACo_person",
      "Exact text",
    );
    expect(result).toMatchObject({
      success: true,
      data: { chat_id: "chat-1", message_id: "message-1" },
    });
    expect(calls[0]?.url).toBe(
      "https://api.unipile.com/v2/acc_owner/chats/send",
    );
    expect(JSON.parse(String(calls[0]?.options?.body))).toEqual({
      users_ids: "ACo_person",
      text: "Exact text",
    });
  });

  test("reply uses the existing encoded chat and retains provider ID arrays", async () => {
    respond({ object: "MessageSent", message_id: ["message-1", "message-2"] });
    expect(
      await Unipile.sendMessage("acc_owner", "chat:one/part", "Reply"),
    ).toMatchObject({
      success: true,
      data: { message_id: ["message-1", "message-2"] },
    });
    expect(calls[0]?.url).toBe(
      "https://api.unipile.com/v2/acc_owner/chats/chat%3Aone%2Fpart/messages/send",
    );
  });

  test("empty content and traversal identifiers do not submit a message", async () => {
    respond({});
    expect(
      await Unipile.startChat("acc_owner", "ACo_person", " \n"),
    ).toMatchObject({
      success: false,
      error: { code: "input" },
    });
    expect(await Unipile.sendMessage("acc_owner", "..", "Hello")).toMatchObject(
      {
        success: false,
        error: { code: "input" },
      },
    );
    expect(calls).toHaveLength(0);
  });

  test("interrupted sends remain uncertain and are not automatically retried", async () => {
    globalThis.fetch = Object.assign(
      async (input: string | URL | Request, options?: RequestInit) => {
        calls.push({ url: String(input), options });
        throw new TypeError("Disconnected after provider may have accepted");
      },
      { preconnect: originalFetch.preconnect },
    );
    expect(
      await Unipile.startChat("acc_owner", "ACo_person", "Hello"),
    ).toMatchObject({
      success: false,
      error: { code: "uncertain" },
    });
    expect(calls).toHaveLength(1);
  });

  test.each([
    ["api/too_many_requests", 35],
    ["provider/too_many_requests", null],
  ] as const)(
    "retains only a trustworthy rate-limit delay: %s",
    async (type, delay) => {
      respond({ type, detail: "Private provider detail" }, 429, {
        "Retry-After": "35",
      });
      const result = await Unipile.sendInvitation(
        "acc_owner",
        "ACo_person",
        "Hello",
      );
      expect(result).toMatchObject({
        success: false,
        error: {
          code: "rate-limit",
          providerCode: type,
          retryAfterSeconds: delay,
        },
      });
      if (!result.success)
        expect(result.error.message).not.toContain("Private provider detail");
      expect(calls).toHaveLength(1);
    },
  );
});
