/**
 * Shared enums/types for database-backed auth (e.g. user role).
 * Used by authorization and any code that checks user.role.
 */
export const USER_ROLES = ["admin", "user", "guest"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const UserRole = {
  ADMIN: "admin",
  USER: "user",
  GUEST: "guest",
} as const;
