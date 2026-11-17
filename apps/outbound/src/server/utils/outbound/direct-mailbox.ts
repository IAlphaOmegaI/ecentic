import "server-only";

import { createHash } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { convert } from "html-to-text";
import {
  type FetchMessageObject,
  ImapFlow,
  type ImapFlowOptions,
  type ListResponse,
  type StatusObject,
} from "imapflow";
import { type AddressObject, simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { z } from "zod";
import { loadDirectMessage } from "./direct-mailbox-mime";
import { IntegrationError } from "./http";
import { type Mail, messageIds } from "./inbound";

const MESSAGE_LIMIT = 25;
const SOURCE_LIMIT = 2_000_000;
const UID_WINDOW = 10_000;
const WINDOW_LIMIT = 6;
const OPERATION_TIMEOUT = 25_000;
const SPECIAL_USES = ["\\All", "\\Junk", "\\Trash"] as const;

const credentialsSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  // Google formats app passwords in groups of four. Strip formatting spaces only.
  appPassword: z
    .string()
    .transform((value) => value.replaceAll(" ", ""))
    .pipe(z.string().regex(/^[a-zA-Z0-9]{16}$/)),
});
type Credentials = z.infer<typeof credentialsSchema>;
const folderSchema = z
  .object({
    path: z.string().min(1).max(1000),
    specialUse: z.enum(SPECIAL_USES),
    uidValidity: z.string().regex(/^\d+$/),
    cursor: z.number().int().min(0).max(4_294_967_295),
    ceiling: z.number().int().min(0).max(4_294_967_295),
  })
  .strict();
const checkpointSchema = z
  .object({
    version: z.literal(1),
    email: z.email(),
    since: z.iso.datetime(),
    folders: z.array(folderSchema).length(3),
  })
  .strict();
export type DirectMailboxCheckpoint = z.infer<typeof checkpointSchema>;
type Folder = DirectMailboxCheckpoint["folders"][number];
type Mailbox = Pick<
  ListResponse,
  "path" | "flags" | "specialUse" | "specialUseSource"
>;
type Message = Pick<
  FetchMessageObject,
  | "uid"
  | "emailId"
  | "source"
  | "size"
  | "labels"
  | "internalDate"
  | "headers"
  | "bodyStructure"
>;

export type DirectSmtpClient = {
  verify: () => Promise<unknown>;
  sendMail: (message: {
    raw: Buffer;
    envelope: { from: string; to: string[] };
    signal: AbortSignal;
  }) => Promise<{
    accepted: Array<string | { address: string }>;
    rejected: Array<string | { address: string }>;
  }>;
  close: () => void;
};
export type DirectImapClient = {
  connect: () => Promise<unknown>;
  list: () => Promise<Mailbox[]>;
  status: (
    path: string,
    query: { uidValidity: true; uidNext: true },
  ) => Promise<StatusObject | false>;
  getMailboxLock: (
    path: string,
    options: { readOnly: true },
  ) => Promise<{ release: () => void }>;
  search: (
    query: { uid: string; since: Date },
    options: { uid: true },
  ) => Promise<number[] | false | undefined>;
  fetchAll: (
    range: number[],
    query: {
      uid: true;
      size: true;
      source?: { start: number; maxLength: number };
      labels?: true;
      internalDate?: true;
      bodyStructure?: true;
    },
    options: { uid: true },
  ) => Promise<Message[]>;
  download: ImapFlow["download"];
  logout: () => Promise<unknown>;
  close: () => void;
  secureConnection: boolean;
  capabilities: Map<string, boolean | number>;
};
export type DirectMailboxClients = {
  smtp: (options: SMTPTransport.Options) => DirectSmtpClient;
  imap: (options: ImapFlowOptions) => DirectImapClient;
  now?: () => Date;
  operationTimeoutMilliseconds?: number;
};

const failure = (
  kind: "invalid" | "authentication" | "unavailable" | "uncertain",
) =>
  new IntegrationError(
    "google",
    kind === "invalid" ? "input" : kind === "authentication" ? "access" : kind,
    `direct-mailbox-${kind === "uncertain" ? "unavailable" : kind}`,
    kind === "invalid" ? 422 : kind === "authentication" ? 401 : 502,
  );
const isAuthenticationFailure = (error: unknown) => {
  const parsed = z
    .object({
      code: z.string().optional(),
      authenticationFailed: z.boolean().optional(),
      serverResponseCode: z.string().optional(),
    })
    .safeParse(error);
  return (
    parsed.success &&
    (parsed.data.authenticationFailed === true ||
      ["EAUTH", "AUTHENTICATIONFAILED", "AUTHENTICATION_FAILED"].includes(
        parsed.data.code ?? "",
      ) ||
      parsed.data.serverResponseCode === "AUTHENTICATIONFAILED")
  );
};
const sanitize = (error: unknown, sending = false) => {
  if (error instanceof IntegrationError) return error;
  if (isAuthenticationFailure(error)) return failure("authentication");
  return failure(sending ? "uncertain" : "unavailable");
};
const bounded = async <Data>(
  operation: () => Promise<Data>,
  close: () => void,
  timeoutMilliseconds = OPERATION_TIMEOUT,
) => {
  const timeout: { timer?: ReturnType<typeof setTimeout> } = {};
  const cleanup = { closed: false };
  const safelyClose = () => {
    if (cleanup.closed) return;
    cleanup.closed = true;
    resultify(close);
  };
  const result = await resultify(() =>
    Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timeout.timer = setTimeout(() => {
          safelyClose();
          reject(new Error("Mailbox operation timed out"));
        }, timeoutMilliseconds);
      }),
    ]),
  );
  if (timeout.timer) clearTimeout(timeout.timer);
  safelyClose();
  return result;
};
const selectedFolders = (mailboxes: Mailbox[]) =>
  SPECIAL_USES.map((specialUse) => {
    // Match server special-use flags, never a folder's display name.
    const mailbox = mailboxes.find(
      (candidate) =>
        candidate.flags.has(specialUse) ||
        (candidate.specialUseSource === "extension" &&
          candidate.specialUse === specialUse),
    );
    if (!mailbox) throw failure("unavailable");
    return { path: mailbox.path, specialUse };
  });
const readStatus = async (
  client: DirectImapClient,
  folder: { path: string },
) => {
  const status = await client.status(folder.path, {
    uidValidity: true,
    uidNext: true,
  });
  if (
    !status ||
    status.uidValidity === undefined ||
    status.uidValidity <= 0n ||
    !Number.isSafeInteger(status.uidNext) ||
    (status.uidNext ?? 0) < 1 ||
    (status.uidNext ?? 0) > 4_294_967_295
  )
    throw failure("unavailable");
  return {
    uidValidity: status.uidValidity.toString(),
    ceiling: (status.uidNext ?? 1) - 1,
  };
};
const addressList = (value: AddressObject | AddressObject[] | undefined) =>
  (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((entry) => entry.value)
    .flatMap((entry) => (entry.address ? [entry.address.toLowerCase()] : []));

/** Decode only a bounded source. Attachment buffers and HTML are never retained. */
export const normalizeDirectMessage = async (
  message: Message,
  folder: Folder,
  sourceLimit = SOURCE_LIMIT,
): Promise<Mail> => {
  if (
    !message.source ||
    !Number.isFinite(message.size) ||
    (message.size ?? 0) > sourceLimit ||
    message.source.length !== message.size
  )
    throw failure("unavailable");
  const parsed = await simpleParser(message.source, {
    skipHtmlToText: false,
    skipTextToHtml: true,
    skipImageLinks: true,
    keepCidLinks: true,
    maxHtmlLengthToParse: SOURCE_LIMIT,
  });
  if (parsed.textConversionError) throw failure("unavailable");
  const text = (() => {
    if (parsed.text?.trim() || !parsed.html) return parsed.text ?? "";
    if (parsed.html.length > SOURCE_LIMIT) throw failure("unavailable");
    const overflow = "\u0000OUTBOUND_TEXT_LIMIT\u0000";
    const converted = convert(parsed.html, {
      wordwrap: false,
      limits: {
        maxInputLength: SOURCE_LIMIT,
        maxDepth: 100,
        maxChildNodes: 100_000,
        maxBaseElements: 10_000,
        ellipsis: overflow,
      },
    });
    if (converted.includes(overflow)) throw failure("unavailable");
    return converted;
  })();
  const allowedHeaders = new Set([
    "from",
    "to",
    "cc",
    "bcc",
    "subject",
    "date",
    "message-id",
    "in-reply-to",
    "references",
    "auto-submitted",
    "content-type",
    "return-path",
    "reply-to",
  ]);
  const headers = Object.fromEntries(
    parsed.headerLines
      .filter((header) => allowedHeaders.has(header.key))
      .map((header) => [
        header.key,
        header.line
          .slice(header.line.indexOf(":") + 1)
          .replace(/\r?\n[ \t]+/g, " ")
          .trim(),
      ]),
  );
  if (parsed.subject) headers["subject"] = parsed.subject;
  if (parsed.from) headers["from"] = parsed.from.text;
  const references = messageIds(headers["references"] ?? "");
  const ownId = messageIds(headers["message-id"] ?? "")[0];
  const fallback = createHash("sha256")
    .update(
      `${folder.path}\0${folder.uidValidity}\0${message.uid}\0${ownId ?? ""}`,
    )
    .digest("hex");
  const id = message.emailId ? `imap:${message.emailId}` : `imap:${fallback}`;
  const date = new Date(message.internalDate ?? "");
  if (!Number.isFinite(date.getTime())) throw failure("unavailable");
  const labelIds = [
    ...(message.labels?.has("\\Sent") ? ["SENT"] : []),
    ...(message.labels?.has("\\Inbox") ? ["INBOX"] : []),
    ...(folder.specialUse === "\\Junk" ? ["SPAM"] : []),
    ...(folder.specialUse === "\\Trash" ? ["TRASH"] : []),
  ];
  parsed.attachments.length = 0;
  return {
    id,
    threadId:
      references[0] ??
      messageIds(headers["in-reply-to"] ?? "")[0] ??
      ownId ??
      id,
    labelIds,
    internalDate: String(date.getTime()),
    headers,
    // Do not truncate a long reply and silently miss a later opt-out.
    text,
  };
};

export const createDirectMailbox = (clients: DirectMailboxClients) => {
  const now = clients.now ?? (() => new Date());
  const timeoutMilliseconds =
    clients.operationTimeoutMilliseconds ?? OPERATION_TIMEOUT;
  const smtp = (credentials: Credentials) =>
    clients.smtp({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: credentials.email, pass: credentials.appPassword },
      tls: {
        servername: "smtp.gmail.com",
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
      },
      pool: false,
      logger: false,
      debug: false,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  const imap = (credentials: Credentials) =>
    clients.imap({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      doSTARTTLS: false,
      auth: { user: credentials.email, pass: credentials.appPassword },
      tls: {
        servername: "imap.gmail.com",
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
      },
      logger: false,
      logRaw: false,
      emitLogs: false,
      disableAutoIdle: true,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });
  const connect = async (client: DirectImapClient) => {
    await client.connect();
    if (!client.secureConnection || !client.capabilities.has("X-GM-EXT-1"))
      throw failure("unavailable");
  };
  return {
    verify: async (input: {
      email: string;
      appPassword: string;
    }): Promise<Result<{ email: string }, IntegrationError>> => {
      const parsed = credentialsSchema.safeParse(input);
      if (!parsed.success) return { success: false, error: failure("invalid") };
      const connections: {
        outgoing?: DirectSmtpClient;
        incoming?: DirectImapClient;
      } = {};
      const checked = await bounded(
        async () => {
          const outgoing = smtp(parsed.data);
          connections.outgoing = outgoing;
          const incoming = imap(parsed.data);
          connections.incoming = incoming;
          await Promise.all([
            outgoing.verify(),
            (async () => {
              await connect(incoming);
              const folders = selectedFolders(await incoming.list());
              for (const folder of folders) {
                const lock = await incoming.getMailboxLock(folder.path, {
                  readOnly: true,
                });
                lock.release();
              }
              await incoming.logout();
            })(),
          ]);
          return { email: parsed.data.email };
        },
        () => {
          resultify(() => connections.outgoing?.close());
          resultify(() => connections.incoming?.close());
        },
        timeoutMilliseconds,
      );
      return checked.success
        ? checked
        : { success: false, error: sanitize(checked.error) };
    },
    send: async (input: {
      email: string;
      appPassword: string;
      to: string;
      raw: string;
      messageId: string;
    }): Promise<Result<{ providerMessageId: string }, IntegrationError>> => {
      const parsed = credentialsSchema
        .extend({
          to: z.email().transform((email) => email.toLowerCase()),
          raw: z
            .string()
            .min(1)
            .max(100000)
            .regex(/^[A-Za-z0-9_-]+$/),
          messageId: z.string().regex(/^<[^<>\s@]+@[^<>\s@]+>$/),
        })
        .safeParse(input);
      if (!parsed.success) return { success: false, error: failure("invalid") };
      const raw = Buffer.from(parsed.data.raw, "base64url");
      if (raw.toString("base64url") !== parsed.data.raw)
        return { success: false, error: failure("invalid") };
      const decoded = await resultify(() =>
        simpleParser(raw, {
          skipHtmlToText: true,
          skipTextToHtml: true,
          skipImageLinks: true,
          keepCidLinks: true,
        }),
      );
      if (
        !decoded.success ||
        decoded.data.messageId !== parsed.data.messageId ||
        addressList(decoded.data.from).join() !== parsed.data.email ||
        addressList(decoded.data.to).join() !== parsed.data.to ||
        decoded.data.headerLines.some((header) =>
          ["cc", "bcc"].includes(header.key),
        ) ||
        decoded.data.headerLines.filter((header) =>
          ["from", "to", "message-id"].includes(header.key),
        ).length !== 3
      )
        return { success: false, error: failure("invalid") };
      const connection: { client?: DirectSmtpClient; submitted: boolean } = {
        submitted: false,
      };
      const controller = new AbortController();
      const sent = await bounded(
        async () => {
          const client = smtp(parsed.data);
          connection.client = client;
          connection.submitted = true;
          const receipt = await client.sendMail({
            raw,
            envelope: { from: parsed.data.email, to: [parsed.data.to] },
            signal: controller.signal,
          });
          const accepted = receipt.accepted.map((address) =>
            typeof address === "string"
              ? address.toLowerCase()
              : address.address.toLowerCase(),
          );
          if (receipt.rejected.length || !accepted.includes(parsed.data.to))
            throw failure(accepted.length ? "uncertain" : "authentication");
          return { providerMessageId: parsed.data.messageId };
        },
        () => {
          controller.abort();
          connection.client?.close();
        },
        timeoutMilliseconds,
      );
      return sent.success
        ? sent
        : { success: false, error: sanitize(sent.error, connection.submitted) };
    },
    syncPage: async (input: {
      email: string;
      appPassword: string;
      checkpoint: unknown;
    }): Promise<
      Result<
        {
          messages: Mail[];
          checkpoint: DirectMailboxCheckpoint;
          complete: boolean;
        },
        IntegrationError
      >
    > => {
      const parsed = credentialsSchema.safeParse(input);
      const saved =
        input.checkpoint == null
          ? null
          : checkpointSchema.safeParse(input.checkpoint);
      if (
        !parsed.success ||
        (saved && (!saved.success || saved.data.email !== parsed.data.email))
      )
        return { success: false, error: failure("invalid") };
      const connection: { client?: DirectImapClient } = {};
      const synced = await bounded(
        async () => {
          const client = imap(parsed.data);
          connection.client = client;
          await connect(client);
          const folders = selectedFolders(await client.list());
          const existing = saved?.success ? saved.data : null;
          const checkpoint: DirectMailboxCheckpoint = {
            version: 1,
            email: parsed.data.email,
            since:
              existing?.since ??
              new Date(now().getTime() - 180 * 86400000).toISOString(),
            folders: folders.map(
              (folder) =>
                existing?.folders.find(
                  (previous) =>
                    previous.path === folder.path &&
                    previous.specialUse === folder.specialUse,
                ) ?? {
                  ...folder,
                  uidValidity: "0",
                  cursor: 0,
                  ceiling: 0,
                },
            ),
          };
          const messages: Mail[] = [];
          const budget = { windows: 0 };
          const refresh = async () => {
            // STATUS is read-only. This final pass also catches arrivals in a folder
            // processed earlier, before the worker marks reconciliation complete.
            const statuses = await Promise.all(
              checkpoint.folders.map((folder) => readStatus(client, folder)),
            );
            checkpoint.folders = checkpoint.folders.map((folder, index) => {
              const status = statuses[index];
              if (!status) throw failure("unavailable");
              return {
                ...folder,
                ...status,
                cursor:
                  folder.uidValidity === status.uidValidity ? folder.cursor : 0,
              };
            });
          };
          await refresh();
          const process = async (): Promise<boolean> => {
            const index = checkpoint.folders.findIndex(
              (folder) => folder.cursor < folder.ceiling,
            );
            if (index === -1) {
              await refresh();
              if (
                checkpoint.folders.every(
                  (folder) => folder.cursor >= folder.ceiling,
                )
              )
                return true;
            }
            if (
              messages.length >= MESSAGE_LIMIT ||
              budget.windows >= WINDOW_LIMIT
            )
              return false;
            const position = checkpoint.folders.findIndex(
              (folder) => folder.cursor < folder.ceiling,
            );
            const folder = checkpoint.folders[position];
            if (!folder) return true;
            budget.windows += 1;
            const lock = await client.getMailboxLock(folder.path, {
              readOnly: true,
            });
            const page = await resultify(async () => {
              const status = await readStatus(client, folder);
              if (status.uidValidity !== folder.uidValidity) {
                checkpoint.folders[position] = {
                  ...folder,
                  ...status,
                  cursor: 0,
                };
                return;
              }
              const upper = Math.min(
                folder.ceiling,
                folder.cursor + UID_WINDOW,
              );
              const searched = await client.search(
                {
                  uid: `${folder.cursor + 1}:${upper}`,
                  since: new Date(checkpoint.since),
                },
                { uid: true },
              );
              if (
                !Array.isArray(searched) ||
                searched.some(
                  (uid) =>
                    !Number.isInteger(uid) ||
                    uid <= folder.cursor ||
                    uid > upper,
                )
              )
                throw failure("unavailable");
              const remaining = MESSAGE_LIMIT - messages.length;
              const identifiers = [...new Set(searched)]
                .sort((first, second) => first - second)
                .slice(0, remaining);
              if (identifiers.length) {
                const fetched = await client.fetchAll(
                  identifiers,
                  {
                    uid: true,
                    size: true,
                    // Bound even unusual message headers. Large attachments are
                    // skipped through BODYSTRUCTURE rather than downloaded.
                    source: { start: 0, maxLength: 64_001 },
                    labels: true,
                    internalDate: true,
                    bodyStructure: true,
                  },
                  { uid: true },
                );
                if (
                  fetched.length !== identifiers.length ||
                  new Set(fetched.map((message) => message.uid)).size !==
                    identifiers.length ||
                  fetched.some(
                    (message) => !identifiers.includes(message.uid),
                  ) ||
                  fetched.some(
                    (message) => (message.source?.length ?? 0) > 64_001,
                  )
                )
                  throw failure("unavailable");
                const smallIdentifiers = fetched
                  .filter(
                    (message) =>
                      (message.size ?? Number.POSITIVE_INFINITY) <=
                      SOURCE_LIMIT,
                  )
                  .map((message) => message.uid);
                const sources = smallIdentifiers.length
                  ? await client.fetchAll(
                      smallIdentifiers,
                      {
                        uid: true,
                        size: true,
                        source: { start: 0, maxLength: SOURCE_LIMIT + 1 },
                      },
                      { uid: true },
                    )
                  : [];
                if (
                  sources.length !== smallIdentifiers.length ||
                  new Set(sources.map((message) => message.uid)).size !==
                    smallIdentifiers.length ||
                  sources.some(
                    (message) => !smallIdentifiers.includes(message.uid),
                  )
                )
                  throw failure("unavailable");
                for (const message of fetched) {
                  const originalSource = sources.find(
                    (source) => source.uid === message.uid,
                  );
                  if (originalSource && originalSource.size !== message.size)
                    throw failure("unavailable");
                  const headerSection = message.source
                    ?.toString("latin1")
                    .match(/^[\s\S]*?\r?\n\r?\n/)?.[0];
                  const source = await loadDirectMessage(client, {
                    ...message,
                    source: originalSource?.source,
                    headers: headerSection
                      ? Buffer.from(headerSection, "latin1")
                      : undefined,
                  });
                  // The helper verifies a 2MB text budget; rebuilt MIME may add
                  // at most 100KB of original headers and part delimiters.
                  messages.push(
                    await normalizeDirectMessage(
                      { ...message, source, size: source.length },
                      folder,
                      2_100_000,
                    ),
                  );
                }
              }
              checkpoint.folders[position] = {
                ...folder,
                cursor:
                  searched.length > identifiers.length
                    ? (identifiers.at(-1) ?? folder.cursor)
                    : upper,
              };
            });
            lock.release();
            if (!page.success) throw page.error;
            return process();
          };
          const complete = await process();
          await client.logout();
          return { messages, checkpoint, complete };
        },
        () => connection.client?.close(),
        timeoutMilliseconds,
      );
      return synced.success
        ? synced
        : { success: false, error: sanitize(synced.error) };
    },
  };
};

const adapter = createDirectMailbox({
  smtp: (options) => nodemailer.createTransport(options),
  imap: (options) => {
    const client = new ImapFlow(options);
    // Connection errors are handled by the operation Result, never printed.
    client.on("error", () => {});
    return client;
  },
});
export const verify = adapter.verify;
export const send = adapter.send;
export const syncPage = adapter.syncPage;
