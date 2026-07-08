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
