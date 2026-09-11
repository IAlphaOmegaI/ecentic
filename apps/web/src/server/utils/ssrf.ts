import { lookup } from "node:dns/promises";
import { isIPv4 } from "node:net";

/**
 * SSRF guard for server-side requests to user-supplied URLs (e.g. a merchant's
 * store URL in the WooCommerce connect flow): HTTPS only, no embedded
 * credentials, and every DNS answer must be a public address.
 *
 * In development, plain-HTTP and private hosts are allowed so local stores
 * like http://ecentic-test.local keep working.
 *
 * Hardening note: this resolves DNS and then the actual fetch re-resolves, so
 * a rebinding window remains. Closing it fully needs a pinned-IP agent or an
 * egress proxy; for the connect flow the blast radius is a POST to
 * `/ucp-connect/token`, which additionally requires a valid one-time code.
 */

// Every IPv4 range that is not the public internet: this-network, private,
// loopback, link-local, carrier-grade NAT, IETF protocol assignments,
// benchmarking, multicast and the reserved/broadcast block.
const PRIVATE_V4 = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^192\.0\.0\./,
  /^198\.1[89]\./,
  /^(22[4-9]|23\d|24\d|25[0-5])\./,
];

const isPrivateIp = (ip: string): boolean => {
  if (isIPv4(ip)) return PRIVATE_V4.some((pattern) => pattern.test(ip));
  const value = ip.toLowerCase();
  // Unspecified (`::` reaches loopback on Linux) and loopback.
  if (value === "::" || value === "::1") return true;
  // Link-local is all of fe80::/10, not just the `fe80:` prefix.
  if (/^fe[89ab]/.test(value)) return true;
  // Unique-local, multicast.
  if (/^f[cd]/.test(value) || value.startsWith("ff")) return true;
  // NAT64 (`64:ff9b::/96`) and IPv4-mapped addresses carry an IPv4 target.
  const embedded = value.match(/^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/);
  if (embedded) return isPrivateIp(embedded[1] as string);
  // The same mapping written in hex (`::ffff:a00:1` is 10.0.0.1).
  const hex = value.match(/^::ffff:([\da-f]{1,4}):([\da-f]{1,4})$/);
  if (hex) {
    const high = Number.parseInt(hex[1] as string, 16);
    const low = Number.parseInt(hex[2] as string, 16);
    return isPrivateIp(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }
  // Any other NAT64 form is refused outright rather than decoded.
  return value.startsWith("64:ff9b:");
};

/**
 * What a merchant types as their store — `acme.com`, `https://www.acme.com/`,
 * a product URL — reduced to the storefront origin plus a display host.
 *
 * Paths, queries and credentials are dropped; a bare word or an IP literal is
 * not a storefront. Production always speaks https on the default port; local
 * development keeps the scheme and port so test stores such as
 * `http://ecentic-test.local:8080` still work. Pair it with
 * `isSafePublicHttpUrl` (or `HTTP.request`'s `guard`) before fetching anything.
 */
export const resolveOrigin = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const url = (() => {
    try {
      return new URL(candidate);
    } catch {
      return null;
    }
  })();
  if (!url) return null;

  const hostname = url.hostname.replace(/\.$/, "");

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (!hostname.includes(".") || isIPv4(hostname)) return null;

  const origin =
    process.env.NODE_ENV === "production"
      ? `https://${hostname}`
      : `${url.protocol}//${url.host.replace(/\.(?=:|$)/, "")}`;

  return { origin, host: hostname.replace(/^www\./, "") };
};

export const isSafePublicHttpUrl = async (raw: string): Promise<boolean> => {
  const url = (() => {
    try {
      return new URL(raw);
    } catch {
      return null;
    }
  })();
  if (!url) return false;
  if (url.username || url.password) return false;
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;

  // Local development stores run over plain HTTP on private hosts.
  if (process.env.NODE_ENV !== "production") return true;

  if (url.protocol !== "https:") return false;

  try {
    const addresses = await lookup(url.hostname, { all: true });
    return (
      addresses.length > 0 &&
      addresses.every((address) => !isPrivateIp(address.address))
    );
  } catch {
    return false;
  }
};
