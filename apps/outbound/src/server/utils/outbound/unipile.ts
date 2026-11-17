import { resultify } from "@zenncore/utils";
import { z } from "zod";
import { configurationError, inputError, request } from "./http";

// V2 contracts: https://developer.unipile.com/v2.0/reference/api-usage
const BASE = "https://api.unipile.com/v2";
const accountIdentifier = z
  .string()
  .max(200)
  .regex(/^acc_[A-Za-z0-9_-]+$/);
const providerIdentifier = z
  .string()
  .min(1)
  .max(1000)
  .refine(
    (value) =>
      value !== "." &&
      value !== ".." &&
      !/\s/.test(value) &&
      [...value].every(
        (character) =>
          character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
      ),
  );
const message = z
  .string()
  .max(10000)
  .refine((value) => !value.includes("\0"));
const nonemptyMessage = message.refine((value) => value.trim().length > 0);
const productStatus = z.enum(["running", "disconnected", "errored"]);

export const accountSchema = z.object({
  object: z.literal("Account"),
  id: accountIdentifier,
  user_id: providerIdentifier,
  name: z.string().optional(),
  created_at: z.string(),
  application_id: z.string().min(1),
  provider: z.literal("linkedin"),
  status: z.enum(["running", "errored", "disconnected", "degraded", "partial"]),
  is_locked: z.boolean(),
  metadata: z.object({
    products_connection_status: z.record(z.string(), productStatus).optional(),
    connection_method: z
      .enum(["credentials", "cookies", "unilogin"])
      .optional(),
  }),
});
export type Account = z.infer<typeof accountSchema>;

const relationRequestSchema = z.object({
  object: z.literal("RelationRequest"),
  id: providerIdentifier,
  type: z.enum(["sent", "received"]),
  created_at: z.string().optional(),
  message: z.string().optional(),
});
const userSchema = z.object({
  object: z.literal("UserProfile"),
  id: providerIdentifier,
  type: z.literal("individual"),
  display_name: z.string(),
  public_identifier: z.string().optional(),
  profile_url: z.url().optional(),
  provider: z.literal("linkedin"),
  is_blocked: z.boolean(),
  specifics: z.object({
    network_distance: z
      .enum([
        "SELF",
        "FIRST_DEGREE",
        "SECOND_DEGREE",
        "THIRD_DEGREE",
        "OUT_OF_NETWORK",
      ])
      .optional(),
    relation_request: relationRequestSchema.optional(),
  }),
});
export type User = z.infer<typeof userSchema>;

const messageIdentifier = z.union([
  providerIdentifier,
  z.array(providerIdentifier).min(1),
  z.null(),
]);

/** Safe to expose in app configuration; never returns the server API key. */
export const getConfiguration = async () => {
  const Credentials = await import(
    "@/server/app/outbound/provider-credentials"
  );
  const metadata = await Credentials.metadata();
  if (!metadata.success) throw metadata.error;
  return {
    configured:
      metadata.data.configured ||
      Boolean(process.env.OUTBOUND_UNIPILE_API_KEY?.trim()),
  };
};

/** Account and Service keys support hosted auth; this read-only probe accepts both. */
export const validateApiKey = async (apiKey: string) => {
  const response = await request(
    "unipile",
    `${BASE}/accounts/?limit=1&provider=linkedin`,
    {
      method: "GET",
      headers: { "X-API-KEY": apiKey, Accept: "application/json" },
    },
    z.object({
      object: z.literal("Accounts"),
      data: z.array(z.unknown()),
      has_more: z.boolean(),
    }),
  );
  if (!response.success) return response;
  return { success: true as const, data: { valid: true as const } };
};

const unipile = async <Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  body?: unknown,
) => {
  const Credentials = await import(
    "@/server/app/outbound/provider-credentials"
  );
  const resolved = await Credentials.resolveKey();
  if (!resolved.success) return configurationError("unipile");
  const key = resolved.data;
  if (!key) return configurationError("unipile");
  const response = await request(
    "unipile",
    `${BASE}${path}`,
    {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "X-API-KEY": key,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    schema,
  );
  if (!response.success) return response;
  return { success: true as const, data: response.data.value };
};

const hostedUrl = (value: string) => {
  const parsed = resultify(() => new URL(value));
  return (
    parsed.success &&
    parsed.data.protocol === "https:" &&
    parsed.data.hostname === "auth.unipile.com" &&
    parsed.data.port === "" &&
    parsed.data.username === "" &&
    parsed.data.password === ""
  );
};

const callbackUrl = (value: string) => {
  const parsed = resultify(() => new URL(value));
  if (!parsed.success) return false;
  const address = parsed.data;
  if (address.username || address.password || address.hash) return false;
  return (
    address.protocol === "https:" ||
    (process.env.NODE_ENV !== "production" &&
      address.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(address.hostname))
  );
};

/** Caller persists and consumes state once, bound to the authenticated staff session. */
export const createAuthLink = async (input: {
  state: string;
  redirectUri: string;
  accountId?: string;
}) => {
  const parsed = z
    .object({
      state: z.string().regex(/^[A-Za-z0-9_-]{32,256}$/),
      redirectUri: z.url().max(2000).refine(callbackUrl),
      accountId: accountIdentifier.optional(),
    })
    .safeParse(input);
  if (!parsed.success) return inputError("unipile");
  return unipile(
    "/auth/link",
    z.object({
      object: z.literal("HostedAuthLink"),
      link: z.url().max(4096).refine(hostedUrl),
    }),
    {
      state: parsed.data.state,
      redirect_uri: parsed.data.redirectUri,
      expires_on: new Date(Date.now() + 10 * 60_000).toISOString(),
      ...(parsed.data.accountId
        ? { account_id: parsed.data.accountId }
        : { providers: "linkedin" }),
      config: { linkedin: { products: ["classic"] } },
    },
  );
};

export const getAccount = async (accountId: string) => {
  const parsed = accountIdentifier.safeParse(accountId);
  if (!parsed.success) return inputError("unipile");
  return unipile(
    `/accounts/${encodeURIComponent(parsed.data)}`,
    accountSchema.refine((value) => value.id === parsed.data),
  );
};

const profileIdentifier = (value: string) => {
  const parsed = resultify(() => new URL(value));
  if (!parsed.success) return null;
  const address = parsed.data;
  if (
    address.protocol !== "https:" ||
    address.port ||
    address.username ||
    address.password ||
    !/^(?:www\.|[a-z]{2}\.)?linkedin\.com$/.test(address.hostname)
  )
    return null;
  const path = address.pathname.match(/^\/in\/([^/]+)\/?$/);
  const identifier = path?.[1];
  if (!identifier) return null;
  const decoded = resultify(() => decodeURIComponent(identifier));
  if (
    !decoded.success ||
    !providerIdentifier.safeParse(decoded.data).success ||
    /[/\\?#]/.test(decoded.data)
  )
    return null;
  return decoded.data;
};

export const resolveUser = async (accountId: string, linkedinUrl: string) => {
  const account = accountIdentifier.safeParse(accountId);
  const identifier = profileIdentifier(linkedinUrl);
  if (!account.success || !identifier)
    return inputError("unipile", "Provide a LinkedIn personal profile URL.");
  return unipile(
    `/${encodeURIComponent(account.data)}/users/${encodeURIComponent(identifier)}?variant=linkedin_classic`,
    userSchema,
  );
};

/** Caller must reserve the exact approved message in the durable attempt ledger first. */
export const sendInvitation = async (
  accountId: string,
  userId: string,
  text = "",
) => {
  const parsed = z
    .object({
      accountId: accountIdentifier,
      userId: providerIdentifier,
      text: message.refine((value) => value === "" || value.trim().length > 0),
    })
    .safeParse({ accountId, userId, text });
  if (!parsed.success) return inputError("unipile");
  return unipile(
    `/${encodeURIComponent(parsed.data.accountId)}/users/me/relation-requests`,
    relationRequestSchema.refine((value) => value.type === "sent"),
    {
      user_id: parsed.data.userId,
      ...(parsed.data.text ? { message: parsed.data.text } : {}),
    },
  );
};

/** A string users_ids starts a 1:1 chat; a one-item array attempts to create a group. */
export const startChat = async (
  accountId: string,
  userId: string,
  text: string,
) => {
  const parsed = z
    .object({
      accountId: accountIdentifier,
      userId: providerIdentifier,
      text: nonemptyMessage,
    })
    .safeParse({ accountId, userId, text });
  if (!parsed.success) return inputError("unipile");
  return unipile(
    `/${encodeURIComponent(parsed.data.accountId)}/chats/send`,
    z.object({
      object: z.literal("ChatStarted"),
      chat_id: providerIdentifier,
      message_id: messageIdentifier,
    }),
    { users_ids: parsed.data.userId, text: parsed.data.text },
  );
};

export const sendMessage = async (
  accountId: string,
  chatId: string,
  text: string,
) => {
  const parsed = z
    .object({
      accountId: accountIdentifier,
      chatId: providerIdentifier,
      text: nonemptyMessage,
    })
    .safeParse({ accountId, chatId, text });
  if (!parsed.success) return inputError("unipile");
  return unipile(
    `/${encodeURIComponent(parsed.data.accountId)}/chats/${encodeURIComponent(parsed.data.chatId)}/messages/send`,
    z.object({
      object: z.literal("MessageSent"),
      message_id: messageIdentifier,
    }),
    { text: parsed.data.text },
  );
};

/** Official V2 personal-chat lookup; an empty list means there is no existing chat. */
export const getUserChats = async (accountId: string, userId: string) => {
  const parsed = z
    .object({ accountId: accountIdentifier, userId: providerIdentifier })
    .safeParse({ accountId, userId });
  if (!parsed.success) return inputError("unipile");
  return unipile(
    `/${encodeURIComponent(parsed.data.accountId)}/users/${encodeURIComponent(parsed.data.userId)}/chat`,
    z.object({
      object: z.literal("ChatLookup"),
      data: z
        .array(
          z.object({
            chat_id: providerIdentifier,
            inbox_id: z.string().optional(),
            has_history: z.boolean().optional(),
          }),
        )
        .max(20),
    }),
  );
};

export const chatMessageSchema = z.object({
  object: z.literal("Message"),
  id: providerIdentifier,
  sender_id: providerIdentifier,
  chat_id: providerIdentifier,
  timestamp: z.iso.datetime({ offset: true }),
  is_sender: z.boolean(),
  is_event: z.boolean(),
  text: z.string().max(10000).optional(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** No automatic paging: a full/ambiguous history page is held by the caller. */
export const getChatMessages = async (
  accountId: string,
  chatId: string,
  after?: string,
) => {
  const parsed = z
    .object({
      accountId: accountIdentifier,
      chatId: providerIdentifier,
      after: z.iso.datetime({ offset: true }).optional(),
    })
    .safeParse({ accountId, chatId, after });
  if (!parsed.success) return inputError("unipile");
  const query = new URLSearchParams({ limit: "20" });
  if (parsed.data.after) query.set("after", parsed.data.after);
  return unipile(
    `/${encodeURIComponent(parsed.data.accountId)}/chats/${encodeURIComponent(parsed.data.chatId)}/messages?${query}`,
    z.object({
      data: z.array(chatMessageSchema).max(20),
      total_count: z.number().int().nonnegative().optional(),
      next_cursor: z.string().nullish(),
    }),
  );
};
