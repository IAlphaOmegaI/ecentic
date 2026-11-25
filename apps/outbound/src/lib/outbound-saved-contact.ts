import { z } from "zod";

export const LEGACY_CONTACT_IMPORT_ACTOR = "legacy-migration:2026-W46";

export const savedContactIdentitySchema = z.object({
  company: z.string().min(1),
  domain: z.string().min(1),
  country: z.string().min(1),
  name: z.string().min(1),
  first: z.string().min(1),
  title: z.string().min(1),
  email: z.email(),
  emailStatus: z.literal("verified"),
  emailSource: z.string().min(1),
  emailVerifiedAt: z.string(),
  roleSource: z.string(),
  roleCheckedAt: z.string(),
  linkedinUrl: z.string(),
  source: z.string().min(1),
});

export const savedContactReceiptSchema = z.object({
  operation: z.literal("savedContactVerification"),
  prospectId: z.string().uuid(),
  importedBy: z.literal(LEGACY_CONTACT_IMPORT_ACTOR),
  importedAt: z.iso.datetime(),
  acceptedBy: z.string().min(1),
  acceptedAt: z.iso.datetime(),
  originalRevision: z.number().int().nonnegative(),
  identity: savedContactIdentitySchema,
});

export const savedContactSourceVerified = (input: unknown) => {
  const identity = savedContactIdentitySchema.safeParse(input);
  if (!identity.success) return false;
  const contact = identity.data;
  return (
    contact.name.trim().split(/\s+/).length >= 2 &&
    (([
      "legacy W46: StoreInspect export 2026-11-10 (A: $500K-$10M, marketing/e-com contact)",
      "legacy W46: StoreInspect export 2026-11-10 (earlier reveals (mostly UK founders))",
    ].includes(contact.source) &&
      contact.emailSource === "StoreInspect (verified)") ||
      (contact.source === "legacy W46: Keaz Signals export 2026-11-10" &&
        contact.emailSource === "Keaz (email marked verified)"))
  );
};

/** This is eligibility only; the server must also match the immutable receipt. */
export const savedContactVerificationReady = (
  input: {
    savedContactVerificationId?: string;
    emailVerifiedAt?: string;
    roleCheckedAt?: string;
  },
  settings: { trustSavedContactVerification: boolean },
  now = Date.now(),
) =>
  settings.trustSavedContactVerification &&
  z.string().uuid().safeParse(input.savedContactVerificationId).success &&
  savedContactSourceVerified(input) &&
  [input.emailVerifiedAt, input.roleCheckedAt].every(
    (value) =>
      value === "" ||
      (typeof value === "string" &&
        Number.isFinite(Date.parse(value)) &&
        Date.parse(value) <= now),
  );

export const savedContactReceiptMatches = (
  receipt: unknown,
  prospect: {
    id: string;
    createdBy: string;
    createdAt: Date;
    details: unknown;
  },
) => {
  const parsed = savedContactReceiptSchema.safeParse(receipt);
  const identity = savedContactIdentitySchema.safeParse(prospect.details);
  return (
    parsed.success &&
    identity.success &&
    prospect.createdBy === LEGACY_CONTACT_IMPORT_ACTOR &&
    parsed.data.prospectId === prospect.id &&
    parsed.data.importedAt === prospect.createdAt.toISOString() &&
    savedContactSourceVerified(identity.data) &&
    Object.entries(parsed.data.identity).every(
      ([key, value]) =>
        identity.data[key as keyof typeof identity.data] === value,
    )
  );
};
