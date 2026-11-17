import { randomUUID } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { z } from "zod";
import {
  configurationError,
  IntegrationError,
  inputError,
  request,
} from "./http";

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
] as const;
const safeHeader = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => !/[\r\n\0]/.test(value));
const messageIdentifier = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const getRedirectUri = () => {
  const parsed = z.url().safeParse(process.env.APP_HOST);
  if (!parsed.success) return "";
  const url = new URL(parsed.data);
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ))
  )
    return "";
  return new URL("/api/integrations/outbound/google/callback", url.origin).href;
};
export const getConfigurationStatus = async () => {
  const Credentials = await import(
    "@/server/app/outbound/provider-credentials"
  );
  const metadata = await Credentials.metadata("google");
  if (!metadata.success) throw metadata.error;
  const clientId = metadata.data.configuration.clientId ?? "";
  const redirectUri = getRedirectUri();
  const encryptionConfigured = Boolean(process.env.CREDENTIAL_ENCRYPTION_KEY);
  return {
    clientId,
    redirectUri,
    encryptionConfigured,
    credentialStatus: metadata.data.credentialStatus,
    configured: Boolean(
      metadata.data.configured &&
        clientId &&
        redirectUri &&
        encryptionConfigured,
    ),
  };
};
const configuration = async () => {
  const Credentials = await import(
    "@/server/app/outbound/provider-credentials"
  );
  const resolved = await Credentials.resolve("google");
  if (!resolved.success) return null;
  const id = resolved.data.configuration.clientId;
  const secret = resolved.data.apiKey;
  const redirect = getRedirectUri();
  return id && secret && redirect ? { id, secret, redirect } : null;
};

/** Caller must persist and consume single-use OAuth state in the authenticated staff session. */
export const getAuthorizationUrl = async ({
  state,
  codeChallenge,
}: {
  state: string;
  codeChallenge?: string;
}) => {
  const config = await configuration();
  if (!config) return configurationError("google");
  if (
    !/^[A-Za-z0-9_-]{32,256}$/.test(state) ||
    (codeChallenge !== undefined &&
      !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge))
  )
    return inputError("google", "Invalid OAuth state or challenge.");
  const query = new URLSearchParams({
    client_id: config.id,
    redirect_uri: config.redirect,
    response_type: "code",
    state,
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
    ...(codeChallenge
      ? { code_challenge: codeChallenge, code_challenge_method: "S256" }
      : {}),
  });
  return {
    success: true as const,
    data: `https://accounts.google.com/o/oauth2/v2/auth?${query}`,
  };
};

const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive().max(86400),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  token_type: z.string(),
});
const tokens = async (values: Record<string, string>) => {
  const config = await configuration();
  if (!config) return configurationError("google");
  const response = await request(
    "google",
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.id,
        client_secret: config.secret,
        ...values,
      }).toString(),
    },
    tokenSchema,
  );
  if (!response.success) return response;
  return {
    success: true as const,
    data: {
      accessToken: response.data.value.access_token,
      refreshToken: response.data.value.refresh_token ?? null,
      expiresAt: new Date(
        Date.now() + response.data.value.expires_in * 1000,
      ).toISOString(),
      scope: response.data.value.scope ?? "",
    },
  };
};

export const exchangeCode = async ({
  code,
  codeVerifier,
}: {
  code: string;
  codeVerifier?: string;
}) => {
  const config = await configuration();
  if (!config) return Promise.resolve(configurationError("google"));
  if (
    !code ||
    code.length > 4096 ||
    (codeVerifier !== undefined &&
      !/^[A-Za-z0-9_.~-]{43,128}$/.test(codeVerifier))
  )
    return Promise.resolve(inputError("google"));
  return tokens({
    code,
    redirect_uri: config.redirect,
    grant_type: "authorization_code",
    ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
  });
};

export const refreshToken = ({
  refreshToken: token,
}: {
  refreshToken: string;
}) => {
  if (!token || token.length > 4096)
    return Promise.resolve(inputError("google"));
  return tokens({ refresh_token: token, grant_type: "refresh_token" });
};

const gmail = <Schema extends z.ZodType>(
  accessToken: string,
  path: string,
  schema: Schema,
  body?: unknown,
) => {
  if (!accessToken) return Promise.resolve(configurationError("google"));
  return request(
    "google",
    `${BASE}${path}`,
    {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    schema,
  );
};

export const getProfile = async ({ accessToken }: { accessToken: string }) => {
  const response = await gmail(
    accessToken,
    "/profile",
    z.object({
      emailAddress: z.email(),
      historyId: z.string(),
      messagesTotal: z.number(),
      threadsTotal: z.number(),
    }),
  );
  if (!response.success) return response;
  return { success: true as const, data: response.data.value };
};

const encodedHeader = (value: string) =>
  /^[\x20-\x7E]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;
const address = (email: string, name?: string) =>
  name
    ? `${/^[\x20-\x7E]*$/.test(name) ? `"${name.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"` : encodedHeader(name)} <${email}>`
    : email;

export type EmailContent = {
  from: string;
  fromName: string;
  to: string;
  toName?: string;
  subject: string;
  body: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  unsubscribeEmail?: string;
  date?: Date;
};

/** Persist returned messageId/raw/content hash before invoking sendMessage. */
export const buildMessage = (input: EmailContent) => {
  const parsed = z
    .object({
      from: z.email(),
      fromName: safeHeader,
      to: z.email(),
      toName: safeHeader.optional(),
      subject: safeHeader,
      body: z.string().min(1).max(50000),
      messageId: z
        .string()
        .regex(/^<[^<>\s@]+@[^<>\s@]+>$/)
        .optional(),
      inReplyTo: z
        .string()
        .regex(/^<[^<>\r\n]+>$/)
        .optional(),
      references: z
        .array(z.string().regex(/^<[^<>\r\n]+>$/))
        .max(20)
        .optional(),
      unsubscribeEmail: z.email().optional(),
      date: z.date().optional(),
    })
    .safeParse(input);
  if (!parsed.success)
    return inputError(
      "google",
      "The email contains invalid recipients, headers or content.",
    );
  const values = parsed.data;
  const messageId =
    values.messageId ?? `<${randomUUID()}@${values.from.split("@")[1]}>`;
  const body =
    Buffer.from(values.body.replace(/\r?\n/g, "\r\n"), "utf8")
      .toString("base64")
      .match(/.{1,76}/g)
      ?.join("\r\n") ?? "";
  const headers = [
    `From: ${address(values.from, values.fromName)}`,
    `To: ${address(values.to, values.toName)}`,
    `Subject: ${encodedHeader(values.subject)}`,
    `Date: ${(values.date ?? new Date()).toUTCString()}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    ...(values.inReplyTo ? [`In-Reply-To: ${values.inReplyTo}`] : []),
    ...(values.references?.length
      ? [`References: ${values.references.join(" ")}`]
      : []),
    `List-Unsubscribe: <mailto:${values.unsubscribeEmail ?? values.from}?subject=unsubscribe>`,
  ];
  return {
    success: true as const,
    data: {
      messageId,
      raw: Buffer.from(`${headers.join("\r\n")}\r\n\r\n${body}\r\n`).toString(
        "base64url",
      ),
    },
  };
};

/** Transport only. The caller must claim a persisted, eligible, human-approved message version. */
export const sendMessage = async ({
  accessToken,
  raw,
  threadId,
}: {
  accessToken: string;
  raw: string;
  threadId?: string;
}) => {
  if (
    !/^[A-Za-z0-9_-]+$/.test(raw) ||
    raw.length > 100000 ||
    (threadId && !messageIdentifier.safeParse(threadId).success)
  )
    return inputError("google");
  const response = await gmail(
    accessToken,
    "/messages/send",
    z.object({
      id: z.string(),
      threadId: z.string(),
      labelIds: z.array(z.string()).optional(),
    }),
    { raw, ...(threadId ? { threadId } : {}) },
  );
  if (!response.success) return response;
  return { success: true as const, data: response.data.value };
};

export const listMessages = async ({
  accessToken,
  query,
  pageToken,
}: {
  accessToken: string;
  query?: string;
  pageToken?: string;
}) => {
  if ((query?.length ?? 0) > 2000 || (pageToken?.length ?? 0) > 2000)
    return inputError("google");
  const parameters = new URLSearchParams({
    maxResults: "25",
    includeSpamTrash: "true",
    ...(query ? { q: query } : {}),
    ...(pageToken ? { pageToken } : {}),
  });
  const response = await gmail(
    accessToken,
    `/messages?${parameters}`,
    z.object({
      messages: z
        .array(z.object({ id: z.string(), threadId: z.string() }))
        .optional(),
      nextPageToken: z.string().optional(),
      resultSizeEstimate: z.number().optional(),
    }),
  );
  if (!response.success) return response;
  return {
    success: true as const,
    data: {
      messages: response.data.value.messages ?? [],
      nextPageToken: response.data.value.nextPageToken ?? null,
    },
  };
};

type Payload = {
  filename?: string;
  mimeType?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; size?: number };
  parts?: Payload[];
};
const payloadSchema: z.ZodType<Payload> = z.lazy(() =>
  z.object({
    filename: z.string().optional(),
    mimeType: z.string().optional(),
    headers: z
      .array(z.object({ name: z.string(), value: z.string() }))
      .optional(),
    body: z
      .object({ data: z.string().optional(), size: z.number().optional() })
      .optional(),
    parts: z.array(payloadSchema).optional(),
  }),
);
const isAttachment = (payload: Payload) =>
  Boolean(payload.filename) ||
  (payload.headers ?? []).some(
    (header) =>
      header.name.toLowerCase() === "content-disposition" &&
      /^attachment\b/i.test(header.value),
  );
const textParts = (payload: Payload): string[] =>
  isAttachment(payload)
    ? []
    : [
        ...((payload.mimeType === "text/plain" ||
          payload.mimeType === "message/delivery-status") &&
        payload.body?.data
          ? [Buffer.from(payload.body.data, "base64url").toString("utf8")]
          : []),
        ...(payload.parts?.flatMap(textParts) ?? []),
      ];

const htmlParts = (payload: Payload): string[] =>
  isAttachment(payload)
    ? []
    : [
        ...(payload.mimeType === "text/html" && payload.body?.data
          ? [Buffer.from(payload.body.data, "base64url").toString("utf8")]
          : []),
        ...(payload.parts?.flatMap(htmlParts) ?? []),
      ];

export const getMessage = async ({
  accessToken,
  message,
}: {
  accessToken: string;
  message: string;
}) => {
  if (!messageIdentifier.safeParse(message).success)
    return inputError("google");
  const response = await gmail(
    accessToken,
    `/messages/${encodeURIComponent(message)}?format=full`,
    z.object({
      id: z.string(),
      threadId: z.string(),
      labelIds: z.array(z.string()).optional(),
      internalDate: z.string(),
      snippet: z.string().optional(),
      historyId: z.string(),
      payload: payloadSchema,
    }),
  );
  if (!response.success) return response;
  const plain = textParts(response.data.value.payload).join("\n");
  const html = plain ? "" : htmlParts(response.data.value.payload).join("\n");
  const conversion = await resultify(async () =>
    html
      ? ((
          await (
            await import("mailparser")
          ).simpleParser(
            `Content-Type: text/html; charset=utf-8\r\nMIME-Version: 1.0\r\n\r\n${html}`,
            { skipTextToHtml: true },
          )
        ).text ?? "")
      : "",
  );
  if (!conversion.success)
    return {
      success: false as const,
      error: new IntegrationError(
        "google",
        "contract",
        "Message body could not be decoded.",
      ),
    };
  const converted = conversion.data;
  const fullText = plain || converted || response.data.value.snippet || "";
  return {
    success: true as const,
    data: {
      ...response.data.value,
      text: fullText.slice(0, 50000),
      textTruncated:
        fullText.length > 50000 ||
        (!plain && !converted && Boolean(response.data.value.snippet)),
      headers: Object.fromEntries(
        (response.data.value.payload.headers ?? []).map((header) => [
          header.name.toLowerCase(),
          header.value,
        ]),
      ),
    },
  };
};

export const listHistory = async ({
  accessToken,
  startHistoryId,
  pageToken,
}: {
  accessToken: string;
  startHistoryId: string;
  pageToken?: string;
}) => {
  if (!/^\d+$/.test(startHistoryId) || (pageToken?.length ?? 0) > 2000)
    return inputError("google");
  const parameters = new URLSearchParams({
    startHistoryId,
    maxResults: "25",
    historyTypes: "messageAdded",
    ...(pageToken ? { pageToken } : {}),
  });
  const reference = z.object({
    id: z.string(),
    threadId: z.string().optional(),
    labelIds: z.array(z.string()).optional(),
  });
  const response = await gmail(
    accessToken,
    `/history?${parameters}`,
    z.object({
      historyId: z.string(),
      nextPageToken: z.string().optional(),
      history: z
        .array(
          z.object({
            id: z.string(),
            messages: z.array(reference).optional(),
            messagesAdded: z.array(z.object({ message: reference })).optional(),
          }),
        )
        .optional(),
    }),
  );
  if (!response.success) return response;
  return {
    success: true as const,
    data: {
      historyId: response.data.value.historyId,
      nextPageToken: response.data.value.nextPageToken ?? null,
      messages: [
        ...new Map(
          (response.data.value.history ?? [])
            .flatMap((entry) => [
              ...(entry.messagesAdded ?? []).map(
                (addition) => addition.message,
              ),
            ])
            .map((message) => [message.id, message]),
        ).values(),
      ],
    },
  };
};
