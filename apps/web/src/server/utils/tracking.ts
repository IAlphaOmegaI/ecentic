import { resultify } from "@zenncore/utils";
import { and, eq, sql } from "drizzle-orm";
import * as Product from "@/server/app/product";
import { schema } from "@/server/database";
import { withContext } from "./context";
import { Environment } from "./environment";
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

  const parsed = resultify(() => new URL(trimmed)?.hostname.toLowerCase());

  if (!parsed.success) return trimmed.toLowerCase();

  return parsed.data;
};

export const isOriginAllowedForStore = ({
  origin,
  storeDomain,
  storefrontHosts,
}: {
  origin: string | null;
  storeDomain: string;
  storefrontHosts: string[] | null;
}) => {
  if (!origin) return true;

  const parsed = resultify(() => new URL(origin).hostname.toLowerCase());

  if (!parsed.success) return false;

  const allowed = storefrontHosts?.length
    ? storefrontHosts.map((host) => normalizeHostname(host))
    : [normalizeHostname(storeDomain)];

  return allowed.includes(parsed.data);
};

const NULL_RESOLUTION = {
  productId: null,
  externalProductId: null,
} as const;

export const resolveProductFromPageUrl = withContext(
  async (_context, { store, pageUrl }: { store: string; pageUrl: string }) => {
    const parsed = resultify(() => new URL(pageUrl));
    if (!parsed.success) {
      return { success: true, data: NULL_RESOLUTION };
    }

    const match = parsed.data.pathname.match(
      /\/(?:products|product)\/([^/?#]+)/,
    );
    if (!match) return { success: true as const, data: NULL_RESOLUTION };

    if (!match[1]) return { success: true, data: NULL_RESOLUTION };

    const handle = decodeURIComponent(match[1]);
    const needle = `/products/${handle}`;

    const result = await Product.find(Environment.SERVER, {
      where: and(
        eq(schema.product.storeId, store),
        sql`strpos(lower(${schema.product.url}), lower(${needle})) > 0`,
      ),
      limit: 1,
    });

    if (!result.success) {
      return {
        success: false,
        error: new DatabaseError(
          `Failed to resolve product from page URL: ${result.error}`,
          { cause: result.error },
        ),
      };
    }

    const row = result.data[0];
    if (!row) return { success: true, data: NULL_RESOLUTION };

    return {
      success: true,
      data: {
        productId: row.id,
        externalProductId: row.externalId ?? null,
      },
    };
  },
  "Tracking.resolveProductFromPageUrl",
);
