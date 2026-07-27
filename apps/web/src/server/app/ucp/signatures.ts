/**
 * HTTP Message Signatures (RFC 9421) for hosted UCP REST traffic.
 *
 * UCP signs and verifies HTTP messages with ECDSA over the curves the spec
 * mandates: ES256 (P-256, required) and ES384 (P-384, optional). Signatures
 * use fixed-width raw `r||s` encoding (RFC 9421 §3.3.1, node:crypto
 * `dsaEncoding: "ieee-p1363"`), the body is bound with an RFC 9530
 * `Content-Digest` over the exact bytes, and keys are published/consumed as
 * JWK (RFC 7517) via the party's `/.well-known/ucp` `signing_keys[]`.
 *
 * Three operations, mirroring the reference implementation:
 *   - signRequest()   outbound webhooks (business → platform)
 *   - signResponse()  outbound responses, `@status content-digest content-type`
 *   - verifyRequest() inbound platform → business requests
 *
 * The `alg` parameter is intentionally NOT emitted in `Signature-Input`; the
 * algorithm is derived from the verifying key's `crv` (per spec).
 *
 * Spec: https://ucp.dev/latest/specification/signatures/
 */

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as ecdsaSign,
  verify as ecdsaVerify,
} from "node:crypto";

/** RFC 9421 signature label UCP uses. */
const SIG_LABEL = "sig1";

/** crv → coordinate size in bytes + digest algorithm, used for verification. */
const CURVES: Record<string, { size: number; hash: string }> = {
  "P-256": { size: 32, hash: "sha256" },
  "P-384": { size: 48, hash: "sha384" },
};

export type PublicJwk = {
  kid: string;
  kty: string;
  crv: string;
  x: string;
  y: string;
  use?: string;
  alg?: string;
};

export type SigningKey = {
  privateKeyPem: string;
  publicJwk: PublicJwk;
  kid: string;
};

// ─── Platform signing key ────────────────────────────────────────────────────

const signingKeyCache = new Map<string, SigningKey | null>();

/**
 * The platform ES256 signing key from `UCP_SIGNING_PRIVATE_KEY` (PEM; literal
 * `\n` sequences are tolerated for single-line env storage). One key signs on
 * behalf of every hosted store; each store's discovery profile publishes the
 * same public JWK. Returns null when unconfigured — callers send unsigned.
 */
export const platformSigningKey = (): SigningKey | null => {
  const raw = process.env.UCP_SIGNING_PRIVATE_KEY;
  if (!raw) return null;

  const cached = signingKeyCache.get(raw);
  if (cached !== undefined) return cached;

  const key = (() => {
    try {
      const privateKeyPem = raw.includes("-----")
        ? raw.replace(/\\n/g, "\n")
        : Buffer.from(raw, "base64").toString();
      const exported = createPublicKey(createPrivateKey(privateKeyPem)).export({
        format: "jwk",
      }) as { kty?: string; crv?: string; x?: string; y?: string };
      if (exported.kty !== "EC" || !exported.x || !exported.y) return null;
      const kid = `ucp-${createHash("sha256")
        .update(exported.x + exported.y)
        .digest("hex")
        .slice(0, 12)}`;
      return {
        privateKeyPem,
        kid,
        publicJwk: {
          kid,
          kty: "EC",
          crv: exported.crv ?? "P-256",
          x: exported.x,
          y: exported.y,
          use: "sig",
          alg: exported.crv === "P-384" ? "ES384" : "ES256",
        },
      } satisfies SigningKey;
    } catch {
      return null;
    }
  })();

  signingKeyCache.set(raw, key);
  return key;
};

// ─── RFC 9530 Content-Digest ─────────────────────────────────────────────────

/** Builds the `sha-256=:<base64>:` structured-field value over the raw body bytes. */
export const contentDigest = (body: string): string =>
  `sha-256=:${createHash("sha256").update(body).digest("base64")}:`;

// ─── Signature base assembly (RFC 9421 §2.5) ─────────────────────────────────

const assembleBase = (
  components: string[],
  values: Record<string, string>,
  params: string,
): string =>
  [
    ...components.map(
      (component) => `"${component}": ${values[component] ?? ""}`,
    ),
    `"@signature-params": ${params}`,
  ].join("\n");

const formatParams = (
  components: string[],
  params: Record<string, string | number>,
): string => {
  const inner = `(${components.map((component) => `"${component}"`).join(" ")})`;
  return Object.entries(params).reduce(
    (accumulated, [key, value]) =>
      key === "created"
        ? `${accumulated};created=${Math.trunc(Number(value))}`
        : `${accumulated};${key}="${value}"`,
    inner,
  );
};

// ─── ECDSA primitives (raw r||s via ieee-p1363) ──────────────────────────────

const signBase = (base: string, privateKeyPem: string): Buffer | null => {
  try {
    return ecdsaSign("sha256", Buffer.from(base), {
      key: privateKeyPem,
      dsaEncoding: "ieee-p1363",
    });
  } catch {
    return null;
  }
};

const verifyBase = (
  base: string,
  rawSignature: Buffer,
  jwk: PublicJwk,
): boolean => {
  const curve = CURVES[jwk.crv];
  if (!curve) return false;
  if (rawSignature.length !== curve.size * 2) return false;
  try {
    const publicKey = createPublicKey({
      key: { kty: "EC", crv: jwk.crv, x: jwk.x, y: jwk.y },
      format: "jwk",
    });
    return ecdsaVerify(
      curve.hash,
      Buffer.from(base),
      {
        key: publicKey,
        dsaEncoding: "ieee-p1363",
      },
      rawSignature,
    );
  } catch {
    return false;
  }
};

// ─── Outbound request signing (webhooks) ─────────────────────────────────────

/**
 * Signs an outbound HTTP request and returns the headers to attach.
 *
 * Covered components (RFC 9421, UCP REST request binding):
 *   `@method @authority @path [@query] [ucp-agent] [idempotency-key]
 *   [content-digest content-type]`
 *
 * Conditional components are included only when the corresponding header/value
 * is present. Returns an empty object when key material is unavailable so the
 * caller can send unsigned.
 */
export const signRequest = (
  method: string,
  url: string,
  body: string,
  headers: Record<string, string> = {},
): Record<string, string> => {
  const key = platformSigningKey();
  if (!key) return {};

  const target = (() => {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  })();
  if (!target) return {};

  const lowered = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );

  const output: Record<string, string> = {};
  const components = ["@method", "@authority", "@path"];
  const values: Record<string, string> = {
    "@method": method.toUpperCase(),
    "@authority": target.host.toLowerCase(),
    "@path": target.pathname,
  };

  if (target.search !== "") {
    components.push("@query");
    values["@query"] = target.search;
  }
  if (lowered["ucp-agent"] !== undefined) {
    components.push("ucp-agent");
    values["ucp-agent"] = lowered["ucp-agent"];
  }
  if (lowered["idempotency-key"] !== undefined) {
    components.push("idempotency-key");
    values["idempotency-key"] = lowered["idempotency-key"];
  }
  if (body !== "") {
    const digest = contentDigest(body);
    output["Content-Digest"] = digest;
    components.push("content-digest", "content-type");
    values["content-digest"] = digest;
    values["content-type"] = lowered["content-type"] ?? "application/json";
  }

  const params = formatParams(components, { keyid: key.kid });
  const raw = signBase(
    assembleBase(components, values, params),
    key.privateKeyPem,
  );
  if (!raw) return {};

  output["Signature-Input"] = `${SIG_LABEL}=${params}`;
  output.Signature = `${SIG_LABEL}=:${raw.toString("base64")}:`;
  return output;
};

// ─── Outbound response signing ───────────────────────────────────────────────

/**
 * Signs an outbound response and returns the headers to attach. Covered
 * components: `@status content-digest content-type`, with a `created` param.
 * The digest MUST be computed over the exact bytes that will be sent.
 */
export const signResponse = (
  status: number,
  body: string,
): Record<string, string> => {
  const key = platformSigningKey();
  if (!key) return {};

  const digest = contentDigest(body);
  const components = ["@status", "content-digest", "content-type"];
  const values: Record<string, string> = {
    "@status": String(status),
    "content-digest": digest,
    "content-type": "application/json",
  };

  const params = formatParams(components, {
    created: Math.floor(Date.now() / 1000),
    keyid: key.kid,
  });
  const raw = signBase(
    assembleBase(components, values, params),
    key.privateKeyPem,
  );
  if (!raw) return {};

  return {
    "Content-Digest": digest,
    "Signature-Input": `${SIG_LABEL}=${params}`,
    Signature: `${SIG_LABEL}=:${raw.toString("base64")}:`,
  };
};

// ─── Inbound request verification ────────────────────────────────────────────

export type VerificationResult =
  | { status: "unsigned" }
  | { status: "verified"; profileUrl: string }
  | { status: "error"; code: string; content: string; http: number };

const verificationError = (
  code: string,
  content: string,
  http: number,
): VerificationResult => ({ status: "error", code, content, http });

/**
 * Parses a Signature-Input header value for the UCP signature. `params` is the
 * verbatim `(...)...;keyid="..."` text, reused as the @signature-params value
 * so the base matches what the signer produced.
 */
const parseSignatureInput = (
  header: string,
): {
  label: string;
  components: string[];
  params: string;
  keyid: string;
} | null => {
  const match = header.match(/([A-Za-z0-9_-]+)\s*=\s*(\(.*)$/s);
  if (!match) return null;
  const label = match[1] as string;
  const rest = (match[2] as string).trimEnd();

  const close = rest.indexOf(")");
  if (close === -1) return null;
  const inner = rest.slice(1, close);

  const components = [...inner.matchAll(/"([^"]+)"/g)].map(
    (component) => component[1] as string,
  );
  if (components.length === 0) return null;

  const keyidMatch = rest.match(/;\s*keyid\s*=\s*"([^"]+)"/);

  return {
    label,
    components,
    params: rest,
    keyid: keyidMatch ? (keyidMatch[1] as string) : "",
  };
};

/** Decodes the raw signature bytes for `label` from a Signature header value. */
const parseSignatureValue = (header: string, label: string): Buffer | null => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = header.match(new RegExp(`${escaped}\\s*=\\s*:([^:]*):`));
  if (!match) return null;
  return Buffer.from(match[1] as string, "base64");
};

/** Finds a JWK by `kid` in a profile's `signing_keys[]` (under ucp or top level). */
const findKey = (
  profile: Record<string, unknown>,
  kid: string,
): PublicJwk | null => {
  const keys =
    (profile.ucp as { signing_keys?: unknown } | undefined)?.signing_keys ??
    profile.signing_keys;
  if (!Array.isArray(keys)) return null;
  for (const key of keys) {
    if (key && typeof key === "object" && (key as PublicJwk).kid === kid) {
      return key as PublicJwk;
    }
  }
  return null;
};

export type InboundRequest = {
  method: string;
  /** Authority the client targeted (Host / X-Forwarded-Host). */
  authority: string;
  path: string;
  /** Query string without the leading `?`, or "". */
  query: string;
  headers: Headers;
  /** Exact raw request body bytes as text. */
  body: string;
};

/**
 * Verifies an inbound REST request signature (RFC 9421). Resolves the signer's
 * key by `keyid` in the profile's `signing_keys[]`, checks the body digest,
 * reconstructs the signature base from the live request, and verifies the
 * ECDSA signature. The caller supplies the profile fetcher so verification and
 * negotiation share one cached, SSRF-safe fetch per request.
 */
export const verifyRequest = async (
  request: InboundRequest,
  agentProfileUrl: string,
  fetchProfile: (
    url: string,
  ) => Promise<
    | { success: true; profile: Record<string, unknown> }
    | { success: false; code: string; content: string; http: number }
  >,
): Promise<VerificationResult> => {
  const signatureHeader = request.headers.get("signature") ?? "";
  const inputHeader = request.headers.get("signature-input") ?? "";

  if (signatureHeader === "" && inputHeader === "")
    return { status: "unsigned" };
  if (signatureHeader === "" || inputHeader === "") {
    return verificationError(
      "signature_missing",
      "Both Signature and Signature-Input headers are required.",
      401,
    );
  }

  const parsed = parseSignatureInput(inputHeader);
  if (!parsed) {
    return verificationError(
      "signature_invalid",
      "Malformed Signature-Input header.",
      401,
    );
  }
  if (parsed.keyid === "") {
    return verificationError(
      "signature_invalid",
      "Signature-Input is missing the keyid parameter.",
      401,
    );
  }

  const rawSignature = parseSignatureValue(signatureHeader, parsed.label);
  if (!rawSignature || rawSignature.length === 0) {
    return verificationError(
      "signature_invalid",
      "Malformed Signature header.",
      401,
    );
  }

  if (agentProfileUrl === "") {
    return verificationError(
      "invalid_profile_url",
      "A UCP-Agent profile is required to verify the signature.",
      400,
    );
  }

  const fetched = await fetchProfile(agentProfileUrl);
  if (!fetched.success) {
    return verificationError(fetched.code, fetched.content, fetched.http);
  }

  const jwk = findKey(fetched.profile, parsed.keyid);
  if (!jwk) {
    return verificationError(
      "key_not_found",
      `Key kid=${parsed.keyid} not found in signer signing_keys.`,
      401,
    );
  }

  if ((jwk.kty ?? "EC") !== "EC" || !CURVES[jwk.crv]) {
    return verificationError(
      "algorithm_unsupported",
      `Unsupported signing key curve "${jwk.crv || "unknown"}".`,
      400,
    );
  }

  if (parsed.components.includes("content-digest")) {
    const provided = request.headers.get("content-digest") ?? "";
    if (provided === "" || provided !== contentDigest(request.body)) {
      return verificationError(
        "digest_mismatch",
        "Content-Digest does not match the request body.",
        400,
      );
    }
  }

  const values: Record<string, string> = {};
  for (const component of parsed.components) {
    switch (component) {
      case "@method":
        values[component] = request.method.toUpperCase();
        break;
      case "@authority":
        values[component] = request.authority.toLowerCase();
        break;
      case "@path":
        values[component] = request.path;
        break;
      case "@query":
        values[component] = `?${request.query}`;
        break;
      case "@target-uri":
        values[component] =
          `https://${request.authority}${request.path}${request.query ? `?${request.query}` : ""}`;
        break;
      default:
        values[component] = request.headers.get(component) ?? "";
    }
  }

  const base = assembleBase(parsed.components, values, parsed.params);
  if (!verifyBase(base, rawSignature, jwk)) {
    return verificationError(
      "signature_invalid",
      `Request signature verification failed for key kid=${parsed.keyid}.`,
      401,
    );
  }

  return { status: "verified", profileUrl: agentProfileUrl };
};
