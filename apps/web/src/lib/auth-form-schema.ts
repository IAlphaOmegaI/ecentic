import { z } from "zod";

/** RFC 5321 maximum length for email addresses. */
const EMAIL_MAX_LENGTH = 254;

/**
 * Email shown on sign-in / sign-up: trimmed, length-capped, Zod email check.
 */
export const authEmailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address")
  .max(EMAIL_MAX_LENGTH, "Email address is too long")
  .email("Use a valid email format (e.g. name@company.com)");

/**
 * Sign-in: accept any non-empty password (existing accounts may predate stricter rules).
 */
export const signInPasswordSchema = z
  .string()
  .min(1, "Enter your password")
  .max(256, "Password is too long");

/**
 * Sign-up: length + character classes aligned with common security baselines.
 */
export const signUpPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-z]/, "Include at least one lowercase letter (a–z)")
  .regex(/[A-Z]/, "Include at least one uppercase letter (A–Z)")
  .regex(/[0-9]/, "Include at least one number")
  .regex(/[^A-Za-z0-9]/, "Include at least one symbol (e.g. ! @ # $ %)");

export const signUpPasswordRequirementsText =
  "12+ characters with uppercase, lowercase, a number, and a symbol.";
