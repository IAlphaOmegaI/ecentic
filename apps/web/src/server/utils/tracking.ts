import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/server/database";

/**
 * Public origin used for `tracker.js` ScriptTag and (via the script URL) beacon
 * `fetch` targets. Use when `APP_HOST` is `http://localhost:...` — HTTPS
 * storefronts block loading scripts from `http://` (mixed content). Set
 * `ECENTIC_TRACKER_PUBLIC_ORIGIN` to an HTTPS tunnel (ngrok, cloudflared) that
 * forwards to your dev server.
 */
export const resolveTrackerPublicOrigin = (): string => {
  const explicit = process.env.ECENTIC_TRACKER_PUBLIC_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const app = process.env.APP_HOST?.trim() ?? "";
  return app.replace(/\/$/, "");
};

export const normalizeHostname = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  try {
    if (trimmed.includes("://")) return new URL(trimmed).hostname.toLowerCase();
    return trimmed.split("/")[0]?.toLowerCase() ?? trimmed.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
};

export const isOriginAllowedForStore = ({
  origin,
  storeDomain,
  storefrontHosts,
}: {
  origin: string | null;
  storeDomain: string;
  storefrontHosts: string[] | null;
}): boolean => {
  if (!origin) return true;

  let originHost: string;
  try {
    originHost = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }

  const fallback = [normalizeHostname(storeDomain)];
  const allowed = storefrontHosts?.length
    ? storefrontHosts.map((host) => normalizeHostname(host))
    : fallback;

  return allowed.includes(originHost);
};

export const resolveProductFromPageUrl = async ({
  storeId,
  pageUrl,
}: {
  storeId: string;
  pageUrl: string;
}): Promise<{
  productId: string | null;
  externalProductId: string | null;
}> => {
  let pathname: string;
  try {
    pathname = new URL(pageUrl).pathname;
  } catch {
    return { productId: null, externalProductId: null };
  }

  const match = pathname.match(/\/(?:products|product)\/([^/?#]+)/);
  if (!match) return { productId: null, externalProductId: null };

  const handle = decodeURIComponent(match[1]);
  const needle = `/products/${handle}`;

  const [row] = await db
    .select({
      id: schema.product.id,
      externalId: schema.product.externalId,
    })
    .from(schema.product)
    .where(
      and(
        eq(schema.product.storeId, storeId),
        sql`strpos(lower(${schema.product.url}), lower(${needle})) > 0`,
      ),
    )
    .limit(1);

  if (!row) return { productId: null, externalProductId: null };

  return {
    productId: row.id,
    externalProductId: row.externalId ?? null,
  };
};
