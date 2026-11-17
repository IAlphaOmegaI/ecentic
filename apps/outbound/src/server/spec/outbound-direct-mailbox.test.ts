import { describe, expect, mock, test } from "bun:test";
import { Readable } from "node:stream";
import type { ImapFlowOptions } from "imapflow";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type {
  DirectImapClient,
  DirectMailboxCheckpoint,
  DirectSmtpClient,
} from "@/server/utils/outbound/direct-mailbox";

mock.module("server-only", () => ({}));
const { createDirectMailbox, normalizeDirectMessage } = await import(
  "@/server/utils/outbound/direct-mailbox"
);

const credentials = {
  email: "sender@joinecentic.com",
  appPassword: "abcdefghijklmnop",
};
const recipient = "recipient@example.com";
const now = new Date("2026-11-14T12:00:00.000Z");
type Message = Awaited<ReturnType<DirectImapClient["fetchAll"]>>[number];
type ListedFolder = Awaited<ReturnType<DirectImapClient["list"]>>[number];
type FixtureFolder = ListedFolder & {
  uidValidity: bigint;
  messages: Message[];
  ceiling?: number;
};
const makeRaw = (
  identifier = "<message-1@joinecentic.com>",
  extraHeaders: string[] = [],
) =>
  Buffer.from(
    [
      `From: Sender <${credentials.email}>`,
      `To: ${recipient}`,
      `Message-ID: ${identifier}`,
      "Date: Sat, 14 Nov 2026 12:00:00 +0000",
      "Subject: A useful subject",
      "Content-Type: text/plain; charset=UTF-8",
      ...extraHeaders,
      "",
      "Please remove me from future emails.",
    ].join("\r\n"),
  );
const makeMessage = (uid: number): Message => {
  const source = makeRaw(`<message-${uid}@joinecentic.com>`);
  return {
    uid,
    source,
    size: source.length,
    internalDate: now,
    emailId: String(1000000 + uid),
    labels: new Set(["\\Inbox"]),
  };
};
const checkpointFolder = {
  path: "[Gmail]/All Mail",
  specialUse: "\\All" as const,
  uidValidity: "123",
  cursor: 0,
  ceiling: 100,
};

const fixture = (
  messages: Message[] = [],
  operationTimeoutMilliseconds?: number,
) => {
  const folders: [FixtureFolder, FixtureFolder, FixtureFolder] = [
    {
      path: "[Gmail]/All Mail",
      flags: new Set(["\\All"]),
      specialUse: "\\All",
      specialUseSource: "extension",
      uidValidity: 123n,
      messages,
    },
    {
      path: "[Gmail]/Spam",
      flags: new Set(["\\Junk"]),
      specialUse: "\\Junk",
      specialUseSource: "extension",
      uidValidity: 456n,
      messages: [],
    },
    {
      path: "[Gmail]/Trash",
      flags: new Set(["\\Trash"]),
      specialUse: "\\Trash",
      specialUseSource: "extension",
      uidValidity: 789n,
      messages: [],
    },
  ];
  const state = {
    smtpOptions: [] as SMTPTransport.Options[],
    imapOptions: [] as ImapFlowOptions[],
    smtpClosed: 0,
    imapClosed: 0,
    smtpVerifications: 0,
    imapConnections: 0,
    imapLogouts: 0,
    releases: 0,
    locks: [] as Array<{ path: string; options: { readOnly: true } }>,
    searches: [] as Parameters<DirectImapClient["search"]>[],
    fetches: [] as Parameters<DirectImapClient["fetchAll"]>[],
    downloads: [] as Array<{ uid: string | number | bigint; part?: string }>,
    textParts: new Map<string, { type: string; text: string }>(),
    sends: [] as Parameters<DirectSmtpClient["sendMail"]>[0][],
    statusCounts: new Map<string, number>(),
    currentFolder: folders[0],
    accepted: [recipient] as Array<string | { address: string }>,
    rejected: [] as Array<string | { address: string }>,
    verificationError: null as unknown,
    sendError: null as unknown,
    sendWaitForAbort: false,
    factoryError: null as unknown,
    missingUid: null as number | null,
    onStatus: null as ((folder: FixtureFolder, count: number) => void) | null,
  };
  const smtp: DirectSmtpClient = {
    verify: async () => {
      state.smtpVerifications += 1;
      if (state.verificationError) throw state.verificationError;
      return true;
    },
    sendMail: async (message) => {
      state.sends.push(message);
      if (state.sendError) throw state.sendError;
      if (state.sendWaitForAbort)
        await new Promise<never>((_, reject) => {
          message.signal.addEventListener(
            "abort",
            () => reject(new Error("Aborted")),
            { once: true },
          );
        });
      return { accepted: state.accepted, rejected: state.rejected };
    },
    close: () => {
      state.smtpClosed += 1;
    },
  };
  const imap: DirectImapClient = {
    secureConnection: true,
    capabilities: new Map([["X-GM-EXT-1", true]]),
    connect: async () => {
      state.imapConnections += 1;
    },
    list: async () => folders,
    status: async (path) => {
      const folder = folders.find((candidate) => candidate.path === path);
      if (!folder) throw new Error("Unknown fixture folder");
      const count = (state.statusCounts.get(path) ?? 0) + 1;
      state.statusCounts.set(path, count);
      state.onStatus?.(folder, count);
      return {
        path,
        uidValidity: folder.uidValidity,
        uidNext:
          (folder.ceiling ??
            Math.max(0, ...folder.messages.map((message) => message.uid))) + 1,
      };
    },
    getMailboxLock: async (path, options) => {
      state.locks.push({ path, options });
      const folder = folders.find((candidate) => candidate.path === path);
      if (!folder) throw new Error("Unknown fixture folder");
      state.currentFolder = folder;
      return {
        release: () => {
          state.releases += 1;
        },
      };
    },
    search: async (...parameters) => {
      state.searches.push(parameters);
      const [query] = parameters;
      const [minimum, maximum] = query.uid.split(":").map(Number);
      if (minimum === undefined || maximum === undefined)
        throw new Error("Invalid fixture range");
      return state.currentFolder.messages
        .filter(
          (message) =>
            message.uid >= minimum &&
            message.uid <= maximum &&
            new Date(message.internalDate ?? "").getTime() >=
              query.since.getTime(),
        )
        .map((message) => message.uid);
    },
    fetchAll: async (...parameters) => {
      state.fetches.push(parameters);
      return state.currentFolder.messages.filter(
        (message) =>
          parameters[0].includes(message.uid) &&
          message.uid !== state.missingUid,
      );
    },
    download: async (uid, part) => {
      state.downloads.push({ uid, part });
      const found = part && state.textParts.get(part);
      if (!found) throw new Error("Unexpected part download in fixture");
      return {
        meta: { contentType: found.type, charset: "utf-8" },
        content: Readable.from([Buffer.from(found.text)]),
      };
    },
    logout: async () => {
      state.imapLogouts += 1;
    },
    close: () => {
      state.imapClosed += 1;
    },
  };
  const adapter = createDirectMailbox({
    smtp: (options) => {
      state.smtpOptions.push(options);
      if (state.factoryError) throw state.factoryError;
      return smtp;
    },
    imap: (options) => {
      state.imapOptions.push(options);
      if (state.factoryError) throw state.factoryError;
      return imap;
    },
    now: () => now,
    operationTimeoutMilliseconds,
  });
  return { adapter, state, folders, imap, smtp };
};

describe("direct Google mailbox verification", () => {
  test("rejects invalid credentials without creating a network client", async () => {
    const { adapter, state } = fixture();
    const result = await adapter.verify({
      ...credentials,
      appPassword: "an ordinary account password",
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect(result.error.message).toBe("direct-mailbox-invalid");
    expect(state.smtpOptions).toHaveLength(0);
    expect(state.imapOptions).toHaveLength(0);
  });

  test("checks SMTP authentication and all IMAP folders read-only without sending", async () => {
    const { adapter, state } = fixture();
    const result = await adapter.verify({
      email: "Sender@joinecentic.com",
      appPassword: "abcd efgh ijkl mnop",
    });
    expect(result).toEqual({
      success: true,
      data: { email: credentials.email },
    });
    expect(state.smtpOptions[0]).toMatchObject({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: credentials.email, pass: credentials.appPassword },
      tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
      logger: false,
      debug: false,
      pool: false,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    expect(state.imapOptions[0]).toMatchObject({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user: credentials.email, pass: credentials.appPassword },
      tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
      logger: false,
      logRaw: false,
      emitLogs: false,
      disableAutoIdle: true,
    });
    expect(state.smtpVerifications).toBe(1);
    expect(state.locks).toHaveLength(3);
    expect(state.locks.every((lock) => lock.options.readOnly)).toBe(true);
    expect(state.releases).toBe(3);
    expect(state.sends).toHaveLength(0);
    expect(state.fetches).toHaveLength(0);
    expect(state.smtpClosed).toBe(1);
    expect(state.imapClosed).toBe(1);
  });

  test("rejects unencrypted or non-Gmail connections", async () => {
    for (const property of ["tls", "gmail"] as const) {
      const { adapter, imap } = fixture();
      if (property === "tls") imap.secureConnection = false;
      else imap.capabilities.clear();
      const result = await adapter.verify(credentials);
      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.message).toBe("direct-mailbox-unavailable");
    }
  });

  test("requires server folder metadata, not an inferred folder name", async () => {
    const { adapter, folders } = fixture();
    folders[0].flags.clear();
    folders[0].specialUseSource = "name";
    const result = await adapter.verify(credentials);
    expect(result.success).toBe(false);
    folders[0].specialUseSource = "extension";
    expect((await adapter.verify(credentials)).success).toBe(true);
  });

  test("sanitizes authentication errors and synchronous client failures", async () => {
    const { adapter, state } = fixture();
    state.verificationError = Object.assign(
      new Error(`Server echoed ${credentials.appPassword}`),
      { code: "EAUTH" },
    );
    const result = await adapter.verify(credentials);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect(result.error.message).toBe("direct-mailbox-authentication");
    expect(String(result.error)).not.toContain(credentials.appPassword);
    expect(result.error.cause).toBeUndefined();
    state.factoryError = new Error(credentials.appPassword);
    const factoryResult = await adapter.verify(credentials);
    expect(factoryResult.success).toBe(false);
    if (factoryResult.success) throw new Error("Expected failure");
    expect(factoryResult.error.message).toBe("direct-mailbox-unavailable");
  });
});

describe("direct Google SMTP sends", () => {
  const input = {
    ...credentials,
    to: recipient,
    messageId: "<message-1@joinecentic.com>",
    raw: makeRaw().toString("base64url"),
  };

  test("preserves raw bytes and RFC Message-ID with an explicit single-recipient envelope", async () => {
    const { adapter, state } = fixture();
    state.accepted = [{ address: recipient }];
    expect(await adapter.send(input)).toEqual({
      success: true,
      data: { providerMessageId: input.messageId },
    });
    expect(state.sends).toEqual([
      {
        raw: makeRaw(),
        envelope: { from: credentials.email, to: [recipient] },
        signal: expect.any(AbortSignal),
      },
    ]);
    expect(state.smtpClosed).toBe(1);
    expect(state.imapConnections).toBe(0);
  });

  test("rejects changed envelope fields, duplicate headers and any CC/BCC before network access", async () => {
    for (const changed of [
      { to: "other@example.com" },
      { email: "other@joinecentic.com" },
      { messageId: "<other@joinecentic.com>" },
      {
        raw: makeRaw(input.messageId, [`To: ${recipient}`]).toString(
          "base64url",
        ),
      },
      { raw: makeRaw(input.messageId, ["Cc: hidden:;"]).toString("base64url") },
      {
        raw: makeRaw(input.messageId, ["Bcc: hidden@example.com"]).toString(
          "base64url",
        ),
      },
      { raw: `${input.raw}=` },
    ]) {
      const { adapter, state } = fixture();
      const result = await adapter.send({ ...input, ...changed });
      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.message).toBe("direct-mailbox-invalid");
      expect(state.smtpOptions).toHaveLength(0);
      expect(state.sends).toHaveLength(0);
    }
  });

  test("does not report success for a rejected or unaccepted recipient", async () => {
    const { adapter, state } = fixture();
    state.accepted = [];
    state.rejected = [recipient];
    const result = await adapter.send(input);
    expect(result.success).toBe(false);
    expect(state.sends).toHaveLength(1);
    state.accepted = ["unexpected@example.com"];
    state.rejected = [];
    const uncertain = await adapter.send(input);
    expect(uncertain.success).toBe(false);
    if (uncertain.success) throw new Error("Expected failure");
    expect(uncertain.error.code).toBe("uncertain");
  });

  test("keeps lost SMTP responses uncertain and never retries", async () => {
    const { adapter, state } = fixture();
    state.sendError = Object.assign(new Error(credentials.appPassword), {
      code: "ETIMEDOUT",
    });
    const result = await adapter.send(input);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect(result.error.code).toBe("uncertain");
    expect(result.error.message).toBe("direct-mailbox-unavailable");
    expect(result.error.cause).toBeUndefined();
    expect(state.sends).toHaveLength(1);
    expect(state.smtpClosed).toBe(1);
  });

  test("recognizes explicit authentication failure as definitive", async () => {
    const { adapter, state } = fixture();
    state.sendError = { code: "EAUTH", message: credentials.appPassword };
    const result = await adapter.send(input);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect(result.error.code).toBe("access");
    expect(result.error.message).toBe("direct-mailbox-authentication");
  });

  test("aborts the active SMTP send when its operation deadline expires", async () => {
    const { adapter, state } = fixture([], 10);
    state.sendWaitForAbort = true;
    const result = await adapter.send(input);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect(result.error.code).toBe("uncertain");
    expect(state.sends).toHaveLength(1);
    expect(state.sends[0]?.signal.aborted).toBe(true);
    expect(state.smtpClosed).toBe(1);
  });
});

describe("direct Google MIME normalization", () => {
  test("uses provider IDs across folders and proves Sent only from provider labels", async () => {
    const source = makeRaw("<reply@example.com>", [
      "References: <original@joinecentic.com>\r\n <previous@example.com>",
      "In-Reply-To: <previous@example.com>",
      "Bcc: historical-prospect@example.com",
    ]);
    const message = { ...makeMessage(1), source, size: source.length };
    const mail = await normalizeDirectMessage(message, checkpointFolder);
    expect(mail.id).toBe("imap:1000001");
    expect(mail.threadId).toBe("<original@joinecentic.com>");
    expect(mail.headers["message-id"]).toBe("<reply@example.com>");
    expect(mail.headers["bcc"]).toBe("historical-prospect@example.com");
    expect(mail.text).toContain("remove me");
    expect(mail.labelIds).toEqual(["INBOX"]);
    const spam = await normalizeDirectMessage(message, {
      ...checkpointFolder,
      path: "[Gmail]/Spam",
      specialUse: "\\Junk",
    });
    expect(spam.id).toBe(mail.id);
    expect(spam.labelIds).toContain("SPAM");
    const sent = await normalizeDirectMessage(
      { ...message, labels: new Set(["\\Sent"]) },
      { ...checkpointFolder, specialUse: "\\Trash" },
    );
    expect(sent.labelIds).toEqual(["SENT", "TRASH"]);
    const fakeSent = await normalizeDirectMessage(
      { ...message, labels: new Set(["Sent"]) },
      checkpointFolder,
    );
    expect(fakeSent.labelIds).not.toContain("SENT");
  });

  test("decodes MIME text and subjects while discarding HTML and attachments", async () => {
    const source = Buffer.from(
      [
        `From: =?UTF-8?B?UmVuw6ll?= <${recipient}>`,
        `To: ${credentials.email}`,
        "Message-ID: <mime@example.com>",
        "Subject: =?UTF-8?B?Tm8gdGhhbmtzIOKckw==?=",
        "MIME-Version: 1.0",
        'Content-Type: multipart/mixed; boundary="fixture"',
        "",
        "--fixture",
        "Content-Type: text/html; charset=utf-8",
        "",
        "<p>Please <strong>remove me</strong>.</p>",
        "--fixture",
        'Content-Type: application/octet-stream; name="ignored.bin"',
        "Content-Transfer-Encoding: base64",
        'Content-Disposition: attachment; filename="ignored.bin"',
        "",
        "AAECAwQ=",
        "--fixture--",
      ].join("\r\n"),
    );
    const mail = await normalizeDirectMessage(
      { ...makeMessage(1), source, size: source.length },
      checkpointFolder,
    );
    expect(mail.headers["subject"]).toBe("No thanks ✓");
    expect(mail.headers["from"]).toContain("Renée");
    expect(mail.text).toContain("remove me");
    expect(mail).not.toHaveProperty("html");
    expect(mail).not.toHaveProperty("attachments");
  });

  test("fails closed on oversized, truncated or undated messages", async () => {
    for (const changed of [
      { source: Buffer.alloc(2_000_001), size: 2_000_001 },
      { size: 2_000_000 },
      { internalDate: "invalid" },
    ]) {
      await expect(
        normalizeDirectMessage(
          { ...makeMessage(1), ...changed },
          checkpointFolder,
        ),
      ).rejects.toThrow("direct-mailbox-unavailable");
    }
  });

  test("derives a stable fallback from folder UIDVALIDITY and UID", async () => {
    const message = { ...makeMessage(1), emailId: undefined };
    const first = await normalizeDirectMessage(message, checkpointFolder);
    expect(await normalizeDirectMessage(message, checkpointFolder)).toEqual(
      first,
    );
    const reset = await normalizeDirectMessage(message, {
      ...checkpointFolder,
      uidValidity: "124",
    });
    expect(reset.id).not.toBe(first.id);
  });
});

describe("direct Google incremental IMAP sync", () => {
  test("pages at 25 messages over a 180-day window with bounded read-only fetches", async () => {
    const { adapter, state } = fixture(
      Array.from({ length: 30 }, (_, index) => makeMessage(index + 1)),
    );
    const first = await adapter.syncPage({ ...credentials, checkpoint: null });
    if (!first.success) throw first.error;
    expect(first.data.messages).toHaveLength(25);
    expect(first.data.complete).toBe(false);
    expect(first.data.checkpoint.folders[0]?.cursor).toBe(25);
    expect(first.data.checkpoint.since).toBe("2026-05-18T12:00:00.000Z");
    expect(JSON.stringify(first.data.checkpoint)).not.toContain(
      credentials.appPassword,
    );
    expect(state.fetches[0]?.[1]).toEqual({
      uid: true,
      size: true,
      source: { start: 0, maxLength: 64_001 },
      labels: true,
      internalDate: true,
      bodyStructure: true,
    });
    expect(state.fetches[1]?.[1]).toEqual({
      uid: true,
      size: true,
      source: { start: 0, maxLength: 2_000_001 },
    });
    const second = await adapter.syncPage({
      ...credentials,
      checkpoint: first.data.checkpoint,
    });
    if (!second.success) throw second.error;
    expect(second.data.messages).toHaveLength(5);
    expect(second.data.complete).toBe(true);
    expect(second.data.checkpoint.folders[0]?.cursor).toBe(30);
    expect(first.data.checkpoint.folders[0]?.cursor).toBe(25);
    expect(state.searches[1]?.[0].uid).toBe("26:30");
    expect(state.locks.every((lock) => lock.options.readOnly)).toBe(true);
    expect(state.releases).toBe(state.locks.length);
  });

  test("resets the cursor after UIDVALIDITY changes", async () => {
    const { adapter, folders } = fixture([makeMessage(1), makeMessage(2)]);
    const first = await adapter.syncPage({ ...credentials, checkpoint: null });
    if (!first.success) throw first.error;
    folders[0].uidValidity = 999n;
    folders[0].messages = [makeMessage(1)];
    const second = await adapter.syncPage({
      ...credentials,
      checkpoint: first.data.checkpoint,
    });
    if (!second.success) throw second.error;
    expect(second.data.messages).toHaveLength(1);
    expect(second.data.checkpoint.folders[0]?.uidValidity).toBe("999");
    expect(second.data.checkpoint.folders[0]?.cursor).toBe(1);
    expect(first.data.checkpoint.folders[0]?.uidValidity).toBe("123");
  });

  test("rechecks earlier folders for arrivals before marking reconciliation complete", async () => {
    const { adapter, state } = fixture([makeMessage(1)]);
    state.onStatus = (folder, count) => {
      if (folder.specialUse === "\\All" && count === 3)
        folder.messages.push(makeMessage(2));
    };
    const result = await adapter.syncPage({ ...credentials, checkpoint: null });
    if (!result.success) throw result.error;
    expect(result.data.messages.map((mail) => mail.id)).toEqual([
      "imap:1000001",
      "imap:1000002",
    ]);
    expect(result.data.complete).toBe(true);
    expect(result.data.checkpoint.folders[0]?.cursor).toBe(2);
  });

  test("does not advance a checkpoint when a searched message disappears before fetching", async () => {
    const { adapter, state, folders } = fixture();
    const empty = await adapter.syncPage({ ...credentials, checkpoint: null });
    if (!empty.success) throw empty.error;
    const checkpoint = structuredClone(empty.data.checkpoint);
    folders[0].messages.push(makeMessage(1));
    state.missingUid = 1;
    const result = await adapter.syncPage({ ...credentials, checkpoint });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect(result.error.message).toBe("direct-mailbox-unavailable");
    expect(checkpoint).toEqual(empty.data.checkpoint);
    expect(state.releases).toBe(state.locks.length);
  });

  test("holds oversized messages instead of skipping potential opt-outs", async () => {
    const message = { ...makeMessage(1), size: 2_000_001 };
    const { adapter } = fixture([message]);
    const result = await adapter.syncPage({ ...credentials, checkpoint: null });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect(result.error.message).toBe("direct-mailbox-unavailable");
  });

  test("reads large attached mail through its text parts and preserves historical Bcc", async () => {
    const source = makeRaw("<attached@example.com>", [
      "Bcc: old-prospect@example.com",
    ]);
    const message: Message = {
      ...makeMessage(1),
      source,
      size: 9_000_000,
      labels: new Set(["\\Sent"]),
      bodyStructure: {
        type: "multipart/mixed",
        childNodes: [
          { type: "text/html", part: "1", size: 100 },
          {
            type: "application/pdf",
            part: "2",
            disposition: "attachment",
            size: 8_999_900,
          },
        ],
      },
    };
    const { adapter, state } = fixture([message]);
    state.textParts.set("1", {
      type: "text/html",
      text: "<p>Please remove me from this list.</p>",
    });
    const result = await adapter.syncPage({ ...credentials, checkpoint: null });
    if (!result.success) throw result.error;
    expect(result.data.complete).toBe(true);
    expect(result.data.messages[0]?.text).toContain("remove me");
    expect(result.data.messages[0]?.headers["bcc"]).toBe(
      "old-prospect@example.com",
    );
    expect(result.data.messages[0]?.labelIds).toEqual(["SENT"]);
    expect(state.downloads).toEqual([{ uid: 1, part: "1" }]);
    expect(state.fetches).toHaveLength(1);
    expect(state.fetches[0]?.[1].source).toEqual({
      start: 0,
      maxLength: 64_001,
    });
  });

  test("bounds sparse mailboxes by UID windows and continues next page", async () => {
    const { adapter, state, folders } = fixture();
    folders[0].ceiling = 100_000;
    const result = await adapter.syncPage({ ...credentials, checkpoint: null });
    if (!result.success) throw result.error;
    expect(result.data.messages).toHaveLength(0);
    expect(result.data.complete).toBe(false);
    expect(result.data.checkpoint.folders[0]?.cursor).toBe(60_000);
    expect(state.searches).toHaveLength(6);
    expect(state.searches[0]?.[0].uid).toBe("1:10000");
    expect(state.searches[5]?.[0].uid).toBe("50001:60000");
  });

  test("checks Spam and Trash and excludes messages older than the initial window", async () => {
    const older = { ...makeMessage(1), internalDate: new Date("2025-01-01") };
    const { adapter, folders } = fixture([older]);
    folders[1].messages = [makeMessage(2)];
    folders[2].messages = [makeMessage(3)];
    const result = await adapter.syncPage({ ...credentials, checkpoint: null });
    if (!result.success) throw result.error;
    expect(result.data.messages).toHaveLength(2);
    expect(result.data.messages[0]?.labelIds).toContain("SPAM");
    expect(result.data.messages[1]?.labelIds).toContain("TRASH");
    expect(result.data.complete).toBe(true);
  });

  test("rejects malformed and cross-account checkpoints without a connection", async () => {
    const { adapter, state } = fixture();
    for (const checkpoint of [
      {},
      { version: 2 },
      {
        version: 1,
        email: "someone-else@example.com",
        since: now.toISOString(),
        folders: [checkpointFolder, checkpointFolder, checkpointFolder],
      } satisfies DirectMailboxCheckpoint,
    ]) {
      const result = await adapter.syncPage({ ...credentials, checkpoint });
      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected failure");
      expect(result.error.message).toBe("direct-mailbox-invalid");
    }
    expect(state.imapConnections).toBe(0);
  });
});
