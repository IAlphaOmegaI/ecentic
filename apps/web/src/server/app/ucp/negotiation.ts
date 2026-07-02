/**
 * UCP capability negotiation (server-selects architecture).
 *
 * Reads the platform's profile URI from the UCP-Agent header, fetches and
 * validates the platform profile (SSRF-guarded, redis-cached, rate-limited),
 * computes the capability intersection with the store's declared set, and
 * surfaces the negotiation error model.
 *
 * Spec: https://ucp.dev/2026-04-08/specification/overview/
 */

import { createHash } from "node:crypto";
import { redis } from "@/server/utils/durable";
import {
  businessCapabilityDefinitions,
  type CapabilityEntry,
  type CapabilityMap,
  capabilitiesIncompatibleBody,
  type Negotiated,
  operationCapability,
  type TransportError,
  transportError,
  UCP_VERSION,
  type UcpOperation,
} from "./protocol";

const PROFILE_CACHE_TTL = 300; // seconds (floored to ≥60 per spec)
const FETCH_TIMEOUT = 3_000; // milliseconds
const MAX_PROFILE_BYTES = 262_144; // 256 KB response cap
const DISCOVERY_WINDOW = 60; // seconds — rolling window for outbound fetches
const DISCOVERY_MAX = 30; // max profile fetches per window (fixed footprint)

// ─── UCP-Agent header ────────────────────────────────────────────────────────

/** Extracts the profile URI from the RFC 8941 dictionary UCP-Agent header. */
export const agentProfileUrl = (headers: Headers): string => {
  const header = headers.get("ucp-agent") ?? "";
  if (header === "") return "";
  const match = header.match(/profile\s*=\s*"([^"]+)"/i);
  return match ? (match[1] as string).trim() : "";
};

// ─── Profile fetching (SSRF-guarded) ─────────────────────────────────────────

export type ProfileFetchResult =
  | { success: true; profile: Record<string, unknown> }
  | { success: false; code: string; content: string; http: number };

const PRIVATE_HOST_PATTERN =
  /^(localhost|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.(local|internal|localhost)$)/i;

const profileFetchAllowed = async (): Promise<boolean> => {
  const key = "ucp:profile:fetches";
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, DISCOVERY_WINDOW);
  return count <= DISCOVERY_MAX;
};

const cacheTtl = (response: Response): number => {
  const cacheControl = response.headers.get("cache-control") ?? "";
  const match = cacheControl.match(/max-age=(\d+)/);
  const ttl = match ? Number(match[1]) : PROFILE_CACHE_TTL;
  return Math.max(60, ttl); // spec: minimum TTL floor of 60s
};

/**
 * Fetches and validates a platform profile. Shared by negotiation and RFC 9421
 * signature verification — the redis cache keeps it to one network round-trip.
 * HTTPS only, no redirects, 256 KB cap, private-host block.
 */
export const fetchPlatformProfile = async (
  url: string,
): Promise<ProfileFetchResult> => {
  const parsed = (() => {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  })();
  if (
    !parsed ||
    parsed.protocol !== "https:" ||
    PRIVATE_HOST_PATTERN.test(parsed.hostname)
  ) {
    return {
      success: false,
      code: "invalid_profile_url",
      content: "Agent profile URL is invalid or not HTTPS.",
      http: 400,
    };
  }

  const cacheKey = `ucp:profile:${createHash("md5").update(url).digest("hex")}`;
  const cached = await redis.get<Record<string, unknown>>(cacheKey);
  if (cached && typeof cached === "object") {
    return { success: true, profile: cached };
  }

  if (!(await profileFetchAllowed())) {
    return {
      success: false,
      code: "profile_unreachable",
      content: "Profile discovery is temporarily rate-limited. Retry shortly.",
      http: 503,
    };
  }

  const response = await (async () => {
    try {
      return await fetch(url, {
        redirect: "manual", // spec: no 3xx on profile fetch
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  })();

  if (response instanceof Error) {
    return {
      success: false,
      code: "profile_unreachable",
      content: `Unable to fetch agent profile: ${response.message}`,
      http: 424,
    };
  }

  if (response.status < 200 || response.status >= 300) {
    // 3xx included: redirects are disallowed and count as unreachable.
    return {
      success: false,
      code: "profile_unreachable",
      content: `Agent profile fetch returned HTTP ${response.status}.`,
      http: 424,
    };
  }

  const body = await response.text();
  const data = (() => {
    if (body.length > MAX_PROFILE_BYTES) return null;
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return null;
    }
  })();

  if (!data || typeof data !== "object" || !("ucp" in data)) {
    return {
      success: false,
      code: "profile_malformed",
      content: "Agent profile is not valid UCP JSON.",
      http: 422,
    };
  }

  await redis.set(cacheKey, data, { ex: cacheTtl(response) });
  return { success: true, profile: data };
};

// ─── Capability intersection (overview algorithm) ────────────────────────────

const versionsOf = (entries: CapabilityEntry[]): string[] => [
  ...new Set(
    entries
      .filter((entry) => entry && typeof entry === "object" && entry.version)
      .map((entry) => String(entry.version)),
  ),
];

const parentsOf = (entries: CapabilityEntry[]): string[] => [
  ...new Set(
    entries.flatMap((entry) =>
      entry && typeof entry === "object" && entry.extends
        ? entry.extends.filter((parent) => parent !== "")
        : [],
    ),
  ),
];

/**
 * Computes the active capability set per the UCP overview Intersection
 * Algorithm: include a business capability when the platform also offers that
 * name; select the highest version present in BOTH declarations (excluding the
 * capability when there is no mutual version); prune extensions whose
 * parent(s) are all absent, repeating until stable.
 */
export const intersectCapabilities = (
  business: CapabilityMap,
  platform: CapabilityMap,
): Record<string, string> => {
  const selected: Record<string, string> = {};

  for (const [name, entries] of Object.entries(business)) {
    const platformEntries = platform[name];
    if (!Array.isArray(entries) || !Array.isArray(platformEntries)) continue;
    const mutual = versionsOf(entries).filter((version) =>
      versionsOf(platformEntries).includes(version),
    );
    if (mutual.length === 0) continue; // no mutually supported version → exclude
    selected[name] = [...mutual].sort()[mutual.length - 1] as string; // highest wins
  }

  // Prune orphaned extensions until the set stabilises.
  const prune = (): boolean => {
    for (const name of Object.keys(selected)) {
      const parents = parentsOf(business[name] ?? []);
      if (parents.length === 0) continue; // root capability — never pruned
      if (!parents.some((parent) => selected[parent])) {
        delete selected[name];
        return true;
      }
    }
    return false;
  };
  while (prune()) {
    // repeat until no orphaned extension remains
  }

  return selected;
};

// ─── Negotiation ─────────────────────────────────────────────────────────────

export type NegotiationOutcome =
  | { outcome: "negotiated"; negotiated: Negotiated }
  | { outcome: "transport_error"; error: TransportError }
  | {
      outcome: "business_error";
      /** HTTP 200 UCP error envelope (capability mismatch). */
      body: Record<string, unknown>;
    };

/**
 * Runs negotiation for a request. The platform MUST advertise its profile URI
 * on every request via the UCP-Agent header — "permissionless onboarding"
 * means no pre-registration is required, NOT that the header may be omitted.
 */
export const negotiate = async ({
  headers,
  operation,
  continueUrl,
}: {
  headers: Headers;
  operation: UcpOperation;
  continueUrl: string;
}): Promise<NegotiationOutcome> => {
  const profileUrl = agentProfileUrl(headers);

  if (profileUrl === "") {
    return {
      outcome: "transport_error",
      error: transportError(
        "invalid_profile_url",
        'UCP-Agent profile URI is required (e.g. UCP-Agent: profile="https://agent.example/profile.json").',
        400,
        continueUrl,
      ),
    };
  }

  const fetched = await fetchPlatformProfile(profileUrl);
  if (!fetched.success) {
    return {
      outcome: "transport_error",
      error: transportError(
        fetched.code,
        fetched.content,
        fetched.http,
        continueUrl,
      ),
    };
  }

  const ucp = fetched.profile["ucp"] as
    | { version?: unknown; capabilities?: unknown }
    | undefined;

  // Protocol version compatibility (we serve a single version).
  const platformVersion = typeof ucp?.version === "string" ? ucp.version : "";
  if (platformVersion !== UCP_VERSION) {
    return {
      outcome: "transport_error",
      error: transportError(
        "version_unsupported",
        `Protocol version ${platformVersion || "unknown"} is not supported. This business supports ${UCP_VERSION}.`,
        422,
        continueUrl,
      ),
    };
  }

  const platformCapabilities =
    ucp?.capabilities && typeof ucp.capabilities === "object"
      ? (ucp.capabilities as CapabilityMap)
      : {};
  const selected = intersectCapabilities(
    businessCapabilityDefinitions(),
    platformCapabilities,
  );

  if (Object.keys(selected).length === 0) {
    return {
      outcome: "business_error",
      body: capabilitiesIncompatibleBody(continueUrl),
    };
  }

  // Per-operation gate: the ROOT capability for THIS operation must be in the
  // negotiated intersection.
  const root = operationCapability(operation);
  if (root !== "" && !selected[root]) {
    return {
      outcome: "business_error",
      body: capabilitiesIncompatibleBody(
        continueUrl,
        `This operation requires the "${root}" capability, which the platform did not negotiate.`,
      ),
    };
  }

  return {
    outcome: "negotiated",
    negotiated: { active: selected, profile: fetched.profile, profileUrl },
  };
};
