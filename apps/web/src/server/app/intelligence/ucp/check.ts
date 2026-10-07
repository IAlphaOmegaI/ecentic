"use server";

import { resultify } from "@zenncore/utils";
import * as Validator from "./validator";

export type {
  ParsedCapability,
  ParsedPaymentHandler,
  ParsedService,
  ParsedSigningKey,
  ParsedSupportedVersion,
  SpecIssue,
  SpecIssueCategory,
  SpecIssueSeverity,
} from "./validator";

export type RobotBotStatus = {
  botId: string;
  label: string;
  description: string;
  allowed: boolean;
};

export type UcpCheckResult = {
  domain: string;
  url: string;
  https: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  found: boolean;
  valid: boolean;
  contentType: string | null;
  data: unknown | null;
  specIssues: Validator.SpecIssue[];
  robots: RobotBotStatus[];
  error: string | null;
  ucpVersion: string | null;
  /**
   * The UCP revision whose rules produced `specIssues`. `null` when the profile
   * was not judged — nothing was found, or it declares a revision the validator
   * does not implement — so an empty `specIssues` is then not a pass.
   */
  validatedAgainst: string | null;
  isLatestVersion: boolean;
  envelopeKind: "wrapped" | "flat" | null;
  services: Validator.ParsedService[];
  capabilities: Validator.ParsedCapability[];
  paymentHandlers: Validator.ParsedPaymentHandler[];
  signingKeys: Validator.ParsedSigningKey[];
  supportedVersions: Validator.ParsedSupportedVersion[];
  signingKeysAdvertised: boolean;
};

const AI_BOTS = [
  { botId: "GPTBot", label: "GPTBot", description: "OpenAI / ChatGPT" },
  {
    botId: "Google-Extended",
    label: "Google-Extended",
    description: "Gemini / Google",
  },
  { botId: "ClaudeBot", label: "ClaudeBot", description: "Claude / Anthropic" },
  {
    botId: "AppleBot-Extended",
    label: "AppleBot-Extended",
    description: "Apple Intelligence",
  },
  { botId: "CCBot", label: "CCBot", description: "Common Crawl" },
] as const;

type RobotsBlock = {
  agents: string[];
  disallows: string[];
  allows: string[];
};

const parseRobotsTxt = (text: string): RobotsBlock[] => {
  const blocks: RobotsBlock[] = [];
  let current: RobotsBlock | null = null;

  for (const rawLine of text.split("\n")) {
    const line = (rawLine.split("#")[0] ?? "").trim();
    if (!line) {
      if (current) {
        blocks.push(current);
        current = null;
      }
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const directive = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (directive === "user-agent") {
      if (!current) {
        current = { agents: [], disallows: [], allows: [] };
      } else if (current.disallows.length > 0 || current.allows.length > 0) {
        blocks.push(current);
        current = { agents: [], disallows: [], allows: [] };
      }
      current.agents.push(value.toLowerCase());
    } else if (directive === "disallow" && current) {
      current.disallows.push(value);
    } else if (directive === "allow" && current) {
      current.allows.push(value);
    }
  }

  if (current) blocks.push(current);
  return blocks;
};

const isBotAllowed = (botId: string, blocks: RobotsBlock[]): boolean => {
  const botLower = botId.toLowerCase();
  const specific = blocks.find((b) => b.agents.includes(botLower));
  const wildcard = blocks.find((b) => b.agents.includes("*"));

  const blocksAll = (block: RobotsBlock) =>
    block.disallows.some((d) => d === "/" || d === "") &&
    !block.allows.some((a) => a === "/");

  if (specific) return !blocksAll(specific);
  if (wildcard) return !blocksAll(wildcard);
  return true;
};

const checkRobots = async (cleaned: string): Promise<RobotBotStatus[]> => {
  const result = await resultify(() =>
    fetch(`https://${cleaned}/robots.txt`, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
      headers: { "User-Agent": "UCP-Validator/1.0" },
    }),
  );

  if (!result.success) {
    return AI_BOTS.map((bot) => ({ ...bot, allowed: true }));
  }

  const text = await resultify(() => result.data.text());
  if (!text.success || !result.data.ok) {
    return AI_BOTS.map((bot) => ({ ...bot, allowed: true }));
  }

  const blocks = parseRobotsTxt(text.data);
  return AI_BOTS.map((bot) => ({
    ...bot,
    allowed: isBotAllowed(bot.botId, blocks),
  }));
};

export const checkUCP = async (
  domain: string,
): Promise<
  { success: true; data: UcpCheckResult } | { success: false; error: string }
> => {
  const cleaned = domain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!cleaned) return { success: false, error: "Please enter a domain." };

  const url = `https://${cleaned}/.well-known/ucp`;
  const startedAt = performance.now();

  // The UCP spec (https://ucp.dev) requires agents to identify themselves via
  // the UCP-Agent header. Many CDNs gate on this header to distinguish AI
  // commerce agents from generic bots.
  const [result, robots] = await Promise.all([
    resultify(() =>
      fetch(url, {
        headers: {
          Accept: "application/json, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "UCP-Agent": 'profile="https://ecentic.ai/ucp-validator"',
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      }),
    ),
    checkRobots(cleaned),
  ]);

  const emptyParsed = Validator.emptyValidation();

  if (!result.success) {
    return {
      success: true,
      data: {
        domain: cleaned,
        url,
        https: true,
        httpStatus: null,
        latencyMs: null,
        found: false,
        valid: false,
        contentType: null,
        data: null,
        specIssues: [],
        robots,
        error: "Could not reach the domain or /.well-known/ucp endpoint.",
        ucpVersion: emptyParsed.ucpVersion,
        validatedAgainst: emptyParsed.validatedAgainst,
        isLatestVersion: emptyParsed.isLatestVersion,
        envelopeKind: emptyParsed.envelopeKind,
        services: emptyParsed.services,
        capabilities: emptyParsed.capabilities,
        paymentHandlers: emptyParsed.paymentHandlers,
        signingKeys: emptyParsed.signingKeys,
        supportedVersions: emptyParsed.supportedVersions,
        signingKeysAdvertised: emptyParsed.signingKeysAdvertised,
      },
    };
  }

  const response = result.data;
  const latencyMs = Math.round(performance.now() - startedAt);
  const httpStatus = response.status;
  const contentType = response.headers.get("content-type");

  const text = await resultify(() => response.text());
  if (!text.success) {
    return {
      success: true,
      data: {
        domain: cleaned,
        url,
        https: true,
        httpStatus,
        latencyMs,
        found: false,
        valid: false,
        contentType,
        data: null,
        specIssues: [],
        robots,
        error: `Endpoint returned HTTP ${httpStatus} and body could not be read.`,
        ucpVersion: emptyParsed.ucpVersion,
        validatedAgainst: emptyParsed.validatedAgainst,
        isLatestVersion: emptyParsed.isLatestVersion,
        envelopeKind: emptyParsed.envelopeKind,
        services: emptyParsed.services,
        capabilities: emptyParsed.capabilities,
        paymentHandlers: emptyParsed.paymentHandlers,
        signingKeys: emptyParsed.signingKeys,
        supportedVersions: emptyParsed.supportedVersions,
        signingKeysAdvertised: emptyParsed.signingKeysAdvertised,
      },
    };
  }

  // Parse regardless of HTTP status — some CDNs (e.g. Akamai + Azure Blob)
  // serve the UCP file with a non-200 status but a valid JSON body.
  const parsed = resultify(() => JSON.parse(text.data) as unknown);

  if (parsed.success && parsed.data !== null) {
    const validation = Validator.validateUcpSpec(parsed.data);
    return {
      success: true,
      data: {
        domain: cleaned,
        url,
        https: true,
        httpStatus,
        latencyMs,
        found: true,
        valid: true,
        contentType,
        data: parsed.data,
        specIssues: validation.issues,
        robots,
        error: null,
        ucpVersion: validation.ucpVersion,
        validatedAgainst: validation.validatedAgainst,
        isLatestVersion: validation.isLatestVersion,
        envelopeKind: validation.envelopeKind,
        services: validation.services,
        capabilities: validation.capabilities,
        paymentHandlers: validation.paymentHandlers,
        signingKeys: validation.signingKeys,
        supportedVersions: validation.supportedVersions,
        signingKeysAdvertised: validation.signingKeysAdvertised,
      },
    };
  }

  return {
    success: true,
    data: {
      domain: cleaned,
      url,
      https: true,
      httpStatus,
      latencyMs,
      found: false,
      valid: false,
      contentType,
      data: null,
      specIssues: [],
      robots,
      error: response.ok
        ? "Response is not valid JSON."
        : `Endpoint returned HTTP ${httpStatus} with no parseable JSON body.`,
      ucpVersion: emptyParsed.ucpVersion,
      validatedAgainst: emptyParsed.validatedAgainst,
      isLatestVersion: emptyParsed.isLatestVersion,
      envelopeKind: emptyParsed.envelopeKind,
      services: emptyParsed.services,
      capabilities: emptyParsed.capabilities,
      paymentHandlers: emptyParsed.paymentHandlers,
      signingKeys: emptyParsed.signingKeys,
      supportedVersions: emptyParsed.supportedVersions,
      signingKeysAdvertised: emptyParsed.signingKeysAdvertised,
    },
  };
};
