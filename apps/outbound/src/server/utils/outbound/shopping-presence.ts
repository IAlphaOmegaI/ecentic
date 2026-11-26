import "server-only";

import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { resultify } from "@zenncore/utils";
import { z } from "zod";
import { normalizeDomain } from "@/lib/outbound";
import type {
  ShoppingCaptureCompleteness,
  ShoppingDiscovery,
} from "@/lib/outbound-shopping-research";
import {
  type AiCapture,
  aiCaptureSchema,
  publicUrlSchema,
} from "./live-shopping-contract";
import { shoppingPollUrl } from "./scrapellm-cooldown";

type Merchant = { name: string; domain: string; aliases?: string[] };
type Product = { name: string; url: string; aliases?: string[] };
export type DiscoveryBase = Pick<
  ShoppingDiscovery,
  | "queryIndex"
  | "sourceId"
  | "answerHash"
  | "linksHash"
  | "checkedAt"
  | "completeness"
  | "merchantPresent"
  | "matchedAliases"
  | "presenceMethod"
>;
type Replay = {
  answerText: string;
  citationText: string[];
  answerVariants: string[];
  answerHash: string;
  linksHash: string;
  completeness: ShoppingCaptureCompleteness;
};
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const payloadSchema = z
  .object({
    scraper: z.enum(["google_ai_mode", "chatgpt"]),
    status: z.literal("done"),
    job_id: z.string().optional(),
    prompt: z.string().optional(),
    country: z.string().optional(),
    cached: z.boolean(),
    result: z.string().nullish(),
    result_markdown: z.string().nullish(),
    markdown_url: z.string().nullish(),
    raw_url: z.string().nullish(),
    citations: z.array(z.unknown()).optional(),
    links: z.array(z.unknown()).optional(),
  })
  .passthrough();
const responseSchema = z
  .object({
    job_id: z.string(),
    status: z.literal("done"),
    scraper: z.string(),
    prompt: z.string().optional(),
    country: z.string().optional(),
    created_at: z.string().optional(),
    completed_at: z.string(),
    result: payloadSchema,
  })
  .passthrough();

/** This bounded display projection is never used to prove absence. */
export const projectAnswerLinks = (
  payload: Pick<z.infer<typeof payloadSchema>, "citations" | "links">,
  answer: string,
): AiCapture["links"] => {
  const structured = [
    ...(payload.citations ?? []),
    ...(payload.links ?? []),
  ].flatMap((entry) => {
    const link = z
      .object({
        url: z.string(),
        title: z.string().optional(),
        text: z.string().optional(),
        snippet: z.string().optional(),
      })
      .safeParse(entry);
    return link.success && publicUrlSchema.safeParse(link.data.url).success
      ? [
          {
            url: link.data.url,
            title: (link.data.title ?? link.data.text ?? "").slice(0, 1000),
            snippet: (link.data.snippet ?? "").slice(0, 3000),
          },
        ]
      : [];
  });
  const markdown = [
    ...answer.matchAll(/\[([^\]\n]{0,1000})\]\((https:\/\/[^\s)]+)\)/g),
  ].flatMap((match) =>
    match[2] && publicUrlSchema.safeParse(match[2]).success
      ? [{ url: match[2], title: match[1] ?? "", snippet: "" }]
      : [],
  );
  return [
    ...new Map(
      [...structured, ...markdown].map((entry) => [entry.url, entry]),
    ).values(),
  ].slice(0, 50);
};
const readableAnswer = (answer: string) =>
  answer
    .replace(/<img\b[^>]*\bsrc=["']data:image\/[^"']+["'][^>]*>/gi, "")
    .replace(/!\[[^\]]*\]\(data:image\/[^)]+\)/gi, "");
export const shoppingSourceText = (answer: string) =>
  readableAnswer(answer).slice(0, 18000);
const strings = (input: unknown): string[] =>
  typeof input === "string"
    ? [input]
    : Array.isArray(input)
      ? input.flatMap(strings)
      : input && typeof input === "object"
        ? Object.values(input).flatMap(strings)
        : [];

/** Every cited block survives, including duplicate URLs and long snippets. */
const citedBlocks = (input: unknown): unknown[] => {
  if (Array.isArray(input)) return input.flatMap(citedBlocks);
  if (!input || typeof input !== "object") return [];
  return Object.entries(input).flatMap(([key, value]) =>
    key === "search_results"
      ? []
      : ["citations", "links"].includes(key)
        ? [value]
        : typeof value === "object"
          ? citedBlocks(value)
          : [],
  );
};
const captureSignal = (value: unknown): ShoppingCaptureCompleteness | null => {
  if (Array.isArray(value))
    return value.map(captureSignal).find((signal) => signal !== null) ?? null;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const { complete, is_complete, has_more } = record;
  if (
    ["truncated", "is_truncated", "partial", "is_partial", "cut_off"].some(
      (key) => record[key] === true,
    ) ||
    ["status", "capture_status", "finish_reason", "stop_reason"].some((key) =>
      [
        "length",
        "max_tokens",
        "token_limit",
        "truncated",
        "partial",
        "incomplete",
      ].includes(String(record[key] ?? "")),
    ) ||
    complete === false ||
    is_complete === false ||
    has_more === true
  )
    return {
      status: "truncated",
      reason: "The provider marked this answer as partial or cut off.",
    };
  if (
    ["blocked", "captcha", "challenge", "access_denied"].some(
      (key) => record[key] === true,
    ) ||
    ["status", "capture_status", "finish_reason", "stop_reason"].some((key) =>
      [
        "blocked",
        "captcha",
        "content_filter",
        "access_denied",
        "refused",
      ].includes(String(record[key] ?? "")),
    )
  )
    return {
      status: "blocked",
      reason: "The provider reported a blocked answer.",
    };
  if (
    ["error", "errors"].some(
      (key) => record[key] && JSON.stringify(record[key]) !== "[]",
    )
  )
    return {
      status: "uncertain",
      reason: "The provider returned an error alongside this answer.",
    };
  return (
    Object.entries(record)
      .filter(
        ([key]) => !["citations", "links", "search_results"].includes(key),
      )
      .map(([, child]) =>
        typeof child === "object" ? captureSignal(child) : null,
      )
      .find((signal) => signal !== null) ?? null
  );
};

const replay = (
  input: AiCapture,
  now: number,
  requireSavedProof: boolean,
): Replay => {
  const answerText = typeof input?.answer === "string" ? input.answer : "";
  const base = {
    answerText,
    citationText: [] as string[],
    answerVariants: [] as string[],
    answerHash: digest(answerText),
    linksHash: digest("[]"),
  };
  const failed = (
    reason: string,
    status: ShoppingCaptureCompleteness["status"] = "uncertain",
  ): Replay => ({ ...base, completeness: { status, reason } });
  const parsed = aiCaptureSchema.safeParse(input);
  if (!parsed.success)
    return failed(
      "The saved answer does not satisfy the capture contract.",
      answerText.trim() ? "uncertain" : "empty",
    );
  const capture = parsed.data;
  if (capture.raw.some((raw) => digest(raw.body) !== raw.sha256))
    return failed("An original provider response is missing or changed.");
  const provider = capture.raw.find(
    (raw) => raw.url === shoppingPollUrl(capture.job),
  );
  if (provider?.status !== 200)
    return failed("The original completed provider job response is missing.");
  const decoded = resultify(() => JSON.parse(provider.body) as unknown);
  const response = decoded.success
    ? responseSchema.safeParse(decoded.data)
    : null;
  if (!response?.success)
    return failed(
      "The original provider job response is not a complete answer.",
    );
  const job = response.data;
  const payload = job.result;
  if (
    job.job_id !== capture.job.id ||
    job.scraper !== capture.job.query.surface ||
    payload.scraper !== capture.job.query.surface ||
    (payload.job_id !== undefined && payload.job_id !== capture.job.id) ||
    [job.prompt, payload.prompt].filter((value) => value !== undefined)
      .length === 0 ||
    [job.prompt, payload.prompt].some(
      (value) => value !== undefined && value !== capture.job.query.prompt,
    ) ||
    [job.country, payload.country].filter((value) => value !== undefined)
      .length === 0 ||
    [job.country, payload.country].some(
      (value) => value !== undefined && value !== capture.job.query.country,
    ) ||
    payload.cached
  )
    return failed(
      "The original response does not match this uncached shopper query.",
    );
  const completedAt = Date.parse(job.completed_at);
  const submittedAt = Date.parse(capture.job.submittedAt);
  const receivedAt = Date.parse(provider.receivedAt);
  const createdAt =
    job.created_at === undefined ? submittedAt : Date.parse(job.created_at);
  if (
    ![completedAt, submittedAt, receivedAt, createdAt].every(Number.isFinite) ||
    completedAt < submittedAt - 60_000 ||
    createdAt < submittedAt - 60_000 ||
    createdAt > completedAt + 60_000 ||
    receivedAt < completedAt - 60_000 ||
    completedAt > now ||
    receivedAt > now ||
    capture.raw.some(
      (raw) =>
        Date.parse(raw.receivedAt) > now ||
        Date.parse(raw.receivedAt) < submittedAt - 60_000,
    ) ||
    capture.executedAt !== new Date(completedAt).toISOString() ||
    capture.source.checkedAt !== capture.executedAt ||
    capture.receivedAt !== provider.receivedAt
  )
    return failed(
      "The original answer dates do not match the saved query and capture.",
    );
  const inline = payload.result_markdown?.trim()
    ? payload.result_markdown
    : null;
  const hosted =
    !inline && payload.markdown_url
      ? capture.raw.find((raw) => {
          const url = resultify(() => new URL(raw.url));
          return (
            url.success &&
            url.data.origin === "https://scrapellm.com" &&
            /^\/md\/[a-zA-Z0-9_-]+\.md$/.test(url.data.pathname) &&
            raw.url === payload.markdown_url &&
            raw.status === 200
          );
        })
      : undefined;
  if (!inline && payload.markdown_url && !hosted)
    return failed("The provider's full hosted answer was not captured.");
  const original = inline ?? hosted?.body ?? payload.result ?? "";
  if (!original.trim())
    return failed("The provider returned an empty answer.", "empty");
  if (
    capture.raw.some((raw) => raw !== provider && raw !== hosted) ||
    (capture.answer !== original &&
      !(
        capture.completeness === undefined && capture.answer === original.trim()
      ))
  )
    return failed(
      "The saved answer is not the complete original provider text.",
    );
  const rawSource = hosted ?? provider;
  const observedUrl = publicUrlSchema.safeParse(payload.raw_url);
  const validSurfaceUrl =
    observedUrl.success &&
    (() => {
      const address = new URL(observedUrl.data);
      return capture.job.query.surface === "google_ai_mode"
        ? /^(?:www\.)?google\.[a-z.]+$/.test(address.hostname)
        : ["chatgpt.com", "chat.openai.com"].includes(address.hostname);
    })();
  if (
    capture.source.id !== `search-${capture.job.id}` ||
    capture.source.kind !== "search" ||
    capture.source.capture !== "provider" ||
    capture.source.url !==
      (validSurfaceUrl && observedUrl.success
        ? observedUrl.data
        : provider.url) ||
    capture.source.artifact !== `sha256:${rawSource.sha256}` ||
    capture.source.content !== shoppingSourceText(capture.answer).trim() ||
    !isDeepStrictEqual(
      capture.links,
      projectAnswerLinks(payload, capture.answer),
    )
  )
    return failed(
      "The saved answer projection no longer matches its original provider response.",
    );
  const blocks = citedBlocks(decoded.success ? decoded.data : null);
  const markdownLinks = [
    ...original.matchAll(/\]\((https?:\/\/[^\s)]+)\)|href=["']([^"']+)["']/gi),
  ].map((match) => match[1] ?? match[2] ?? "");
  const complete = {
    answerText: original,
    citationText: [...blocks.flatMap(strings), ...markdownLinks],
    answerVariants: [
      ...new Set(
        [original, payload.result].filter(
          (value): value is string =>
            typeof value === "string" && Boolean(value.trim()),
        ),
      ),
    ],
    answerHash: digest(original),
    linksHash: digest(JSON.stringify({ blocks, markdownLinks })),
  };
  const signal = captureSignal(decoded.success ? decoded.data : null);
  const plain = readableAnswer(original)
    .replace(/<[^>]*>/g, " ")
    .trim();
  const blocked =
    /^(?:access denied|verify (?:you are|you're) human|just a moment|sign in to continue|request blocked|captcha)\b/i.test(
      plain,
    ) ||
    /(?:could not|couldn't|unable to) (?:generate|retrieve|load) (?:an? )?(?:ai )?(?:answer|response|result)/i.test(
      plain.slice(0, 700),
    );
  const truncated =
    /\[(?:truncated|cut off|output omitted)\]|(?:answer|response|output) (?:was |is )?truncated\b/i.test(
      original,
    ) ||
    /(?:\.\.\.|…)\s*$/.test(plain) ||
    (original.match(/\x60\x60\x60/g)?.length ?? 0) % 2 === 1;
  const completeness: ShoppingCaptureCompleteness = signal ??
    (blocked
      ? {
          status: "blocked",
          reason:
            "The captured text is an access or answer-generation failure.",
        }
      : null) ??
    (truncated
      ? {
          status: "truncated",
          reason: "The answer contains a cut-off marker or unfinished block.",
        }
      : null) ??
    (requireSavedProof && !capture.completeness
      ? {
          status: "uncertain",
          reason: "This historical capture has no saved completeness proof.",
        }
      : null) ??
    (requireSavedProof &&
    capture.completeness &&
    capture.completeness.status !== "complete"
      ? capture.completeness
      : null) ?? { status: "complete", reason: null };
  return { ...complete, completeness };
};
/** Called by the adapter; every later use independently replays the proof. */
export const deriveCaptureCompleteness = (
  answer: AiCapture,
  now = Date.now(),
) => replay(answer, now, false).completeness;
export const replayShoppingCapture = (answer: AiCapture, now = Date.now()) =>
  replay(answer, now, true);

const decodeText = (value: string) =>
  value
    .replace(/(?:%[a-f0-9]{2})+/gi, (encoded) => {
      const decoded = resultify(() => decodeURIComponent(encoded));
      return decoded.success ? decoded.data : encoded;
    })
    .replace(
      /&#(?:x([a-f0-9]+)|(\d+));/gi,
      (original, hex: string, decimal: string) => {
        const code = Number.parseInt(hex || decimal, hex ? 16 : 10);
        return code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : original;
      },
    )
    .replace(/&amp;/gi, " and ")
    .replace(/&(?:nbsp|quot|apos|ndash|mdash);/gi, " ")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
const normalized = (value: string) =>
  decodeText(value)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const escapePattern = (value: string) =>
  value.replace(/[.*+?^\x24{}()|[\]\\]/g, "\\$&");

/** Match whole normalized names, explicit aliases and real domain boundaries. */
export const matchMerchantText = (
  text: string,
  merchant: Merchant,
  product: Product,
): string[] => {
  const decoded = decodeText(text);
  const body = ` ${normalized(decoded)} `;
  const names = [
    merchant.name,
    ...(merchant.aliases ?? []),
    product.name,
    ...(product.aliases ?? []),
  ].filter((name) => name.trim());
  const matching = names.filter((name) => {
    if (body.includes(` ${normalized(name)} `)) return true;
    // Long whole names sometimes lose their spaces in answer cards. Require
    // every letter in order and whole-name boundaries; never match a prefix.
    const compact = normalized(name).replaceAll(" ", "");
    if (compact.length < 8) return false;
    const variant = new RegExp(
      "(?<![\\p{L}\\p{N}])" +
        [...compact].map(escapePattern).join("\\s*") +
        "(?![\\p{L}\\p{N}])",
      "u",
    );
    return variant.test(body);
  });
  const domain = normalizeDomain(merchant.domain);
  const pattern = domain
    ? new RegExp(
        `(?<![a-z0-9.-])(?:[a-z0-9-]+\\.)*${escapePattern(domain)}(?![a-z0-9.-])`,
        "i",
      )
    : null;
  return [
    ...new Set([...matching, ...(pattern?.test(decoded) ? [domain] : [])]),
  ].slice(0, 50);
};

/** An assessor can append ordering facts, but cannot decide merchant presence. */
export const computeDiscoveryBase = (
  input: { answer: AiCapture; merchant?: Merchant; queryIndex?: number },
  now = Date.now(),
): DiscoveryBase => {
  const proof = replayShoppingCapture(input.answer, now);
  const saved = input.answer.job.query.merchant;
  const merchant = input.merchant ?? saved;
  const identityMatches =
    merchant &&
    normalizeDomain(merchant.domain) ===
      normalizeDomain(input.answer.job.query.product.url) &&
    (!saved ||
      isDeepStrictEqual(
        { ...merchant, aliases: merchant.aliases ?? [] },
        saved,
      ));
  const completeness = identityMatches
    ? proof.completeness
    : {
        status: "uncertain" as const,
        reason:
          "The saved merchant identity is missing or does not match this query.",
      };
  const matchedAliases =
    completeness.status === "complete" && merchant
      ? [
          ...new Set(
            [...proof.answerVariants, ...proof.citationText].flatMap((text) =>
              matchMerchantText(text, merchant, input.answer.job.query.product),
            ),
          ),
        ].slice(0, 50)
      : [];
  return {
    queryIndex: z
      .number()
      .int()
      .min(0)
      .max(4)
      .parse(input.queryIndex ?? 0),
    sourceId: input.answer.source.id,
    answerHash: proof.answerHash,
    linksHash: proof.linksHash,
    checkedAt: input.answer.executedAt,
    completeness,
    merchantPresent:
      completeness.status === "complete" ? matchedAliases.length > 0 : null,
    matchedAliases,
    presenceMethod: "server-v1",
  };
};
