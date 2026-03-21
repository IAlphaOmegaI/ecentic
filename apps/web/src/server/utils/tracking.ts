import { resultify } from "@zenncore/utils";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/server/database";
import { withContext } from "./context";
import { DatabaseError } from "./error";

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

  if (!trimmed.includes("://")) {
    return trimmed.split("/")[0]?.toLowerCase() ?? trimmed.toLowerCase();
  }

  return (() => {
    try {
      return new URL(trimmed).hostname.toLowerCase();
    } catch {
      return trimmed.toLowerCase();
    }
  })();
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

  const originHost = (() => {
    try {
      return new URL(origin).hostname.toLowerCase();
    } catch {
      return null;
    }
  })();

  if (!originHost) return false;

  const allowed = storefrontHosts?.length
    ? storefrontHosts.map((host) => normalizeHostname(host))
    : [normalizeHostname(storeDomain)];

  return allowed.includes(originHost);
};

const NULL_RESOLUTION = {
  productId: null,
  externalProductId: null,
} as const;

export const resolveProductFromPageUrl = withContext(
  async (
    _,
    { storeId, pageUrl }: { storeId: string; pageUrl: string },
  ) => {
    const parsed = await resultify(() => new URL(pageUrl));
    if (!parsed.success) {
      return { success: true as const, data: NULL_RESOLUTION };
    }

    const match = parsed.data.pathname.match(
      /\/(?:products|product)\/([^/?#]+)/,
    );
    if (!match) return { success: true as const, data: NULL_RESOLUTION };

    const handle = decodeURIComponent(match[1]);
    const needle = `/products/${handle}`;

    const result = await resultify(async () =>
      db
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
        .limit(1),
    );

    if (!result.success) {
      return {
        success: false as const,
        error: new DatabaseError(
          `Failed to resolve product from page URL: ${result.error}`,
          { cause: result.error },
        ),
      };
    }

    const row = result.data?.[0];
    if (!row) return { success: true as const, data: NULL_RESOLUTION };

    return {
      success: true as const,
      data: {
        productId: row.id,
        externalProductId: row.externalId ?? null,
      },
    };
  },
  "Tracking.resolveProductFromPageUrl",
);
