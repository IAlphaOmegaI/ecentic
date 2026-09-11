import { z } from "zod";

/**
 * Validates a `?redirect=` target before it is used as an OAuth `callbackURL`
 * or handed to `router.push`.
 *
 * This has to be enforced by us. Better Auth's `originCheckMiddleware` only
 * validates `callbackURL` when `ctx.request` is present, and the sign-in server
 * actions call `auth.api.*` directly (no request), so the middleware
 * early-returns. An unvalidated `?redirect=` would be an open redirect: the
 * value survives the whole OAuth round trip and lands in `window.location`.
 *
 * The pattern mirrors Better Auth's own relative-path rule — a single leading
 * slash, and never `//`, `/\`, `%2f` or `%5c`, all of which browsers resolve to
 * a different origin.
 */
const INTERNAL_PATH = /^\/(?!\/|\\|%2f|%5c)[\w\-.+/@]*(?:\?[\w\-.+/=&%@]*)?$/i;

export const sanitizeRedirect = (
  value: string | null | undefined,
  fallback: string,
) => (value && INTERNAL_PATH.test(value) ? value : fallback);

/**
 * The store a visitor typed into the landing hero, carried through sign-up.
 *
 * Every new-account path (email verification, Google, complete-profile) ends on
 * `/onboarding/connect` in the same browser, so a cookie survives all of them
 * where a `?redirect=` would be dropped along the way. Set by `Entry.begin`,
 * consumed by `Entry.connect`, and read by the proxy to route a signed-in user
 * with a pending import back to onboarding. httpOnly: the import it drives is
 * never taken from a URL a third party could craft.
 */
export const ENTRY_COOKIE = "ecentic_entry";

export const entrySchema = z.object({
  /** A bare http(s) origin — never a path, never another scheme. */
  origin: z.string().regex(/^https?:\/\/[^/?#\s]+$/),
  host: z.string().min(1),
  platform: z.enum(["shopify", "woocommerce", "unknown"]),
  name: z.string().nullable(),
  products: z.number().int().nonnegative().nullable(),
  /**
   * `pending` until `Entry.connect` resolves it. The rest are outcomes the
   * onboarding panel explains: `locked` (recognised platform, public catalog
   * closed), `unsupported` (not Shopify or WooCommerce), `claimed` (another
   * account holds the store).
   */
  status: z.enum(["pending", "locked", "unsupported", "claimed"]),
});

export type Entry = z.infer<typeof entrySchema>;

/** The entry a cookie value carries, `null` when absent or tampered with. */
export const parseEntry = (value: string | undefined) => {
  if (!value) return null;

  const parsed = (() => {
    try {
      return entrySchema.safeParse(JSON.parse(value));
    } catch {
      return null;
    }
  })();

  return parsed?.success ? parsed.data : null;
};
