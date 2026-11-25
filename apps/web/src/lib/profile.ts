import { z } from "zod";
import { profileRoleValues, profileSourceValues } from "./auth-profile-options";

/** Merchant profile fields never include account privileges or verification. */
export const profileSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  surname: z.string().trim().min(1).max(120),
  email: z.email(),
  jobTitle: z.literal(profileRoleValues),
  company: z.string().trim().min(1).max(200),
  source: z.literal(profileSourceValues),
});

// An update is partial by design, but an empty/unknown-only patch is not a save.
export const updateSchema = profileSchema
  .partial()
  .refine((profile) => Object.keys(profile).length > 0);

export const completionSchema = profileSchema
  .pick({ company: true, jobTitle: true, source: true })
  .partial({ source: true });
