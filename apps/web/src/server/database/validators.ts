/**
 * Shared enums/types for database-backed auth (e.g. user role).
 * Used by authorization and any code that checks user.role.
 *
 * Two vocabularies share this column, and conflating them is a privilege
 * escalation:
 * - `staff` is ecentic's own people. Only `scripts/create-admin.ts` writes it,
 *   and it is the only role that opens internal surfaces (`/dev/*`).
 * - `owner` / `administrator` describe a merchant's standing inside *their*
 *   Shopify store, and are minted from the Shopify OAuth payload for anyone
 *   who signs in that way (`lib/auth.ts` → `getUserInfo`). They say nothing
 *   about permissions here, so nothing internal may ever gate on them.
 *
 * Gate internal access through {@link isInternalStaff} rather than comparing
 * the string, so the two vocabularies cannot drift back together.
 */
export const USER_ROLES = [
  "staff",
  "administrator",
  "owner",
  "user",
  "guest",
] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const UserRole = {
  STAFF: "staff",
  ADMINISTRATOR: "administrator",
  OWNER: "owner",
  USER: "user",
  GUEST: "guest",
} as const;

/**
 * Whether a role belongs to ecentic staff. `role` is a nullable text column and
 * the session carries whatever is in it, so this takes `unknown` and narrows
 * rather than trusting a cast.
 */
export const isInternalStaff = (role: unknown): boolean =>
  role === UserRole.STAFF;
