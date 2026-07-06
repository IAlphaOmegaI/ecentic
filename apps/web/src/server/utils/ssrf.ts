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

const PRIVATE_V4 = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

const isPrivateIp = (ip: string): boolean => {
  if (isIPv4(ip)) return PRIVATE_V4.some((pattern) => pattern.test(ip));
  const value = ip.toLowerCase();
  if (value === "::1" || value.startsWith("fe80:")) return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIp(mapped[1] as string) : false;
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
