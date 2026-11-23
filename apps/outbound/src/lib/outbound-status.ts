/** Lightweight status values shared by list URLs, UI labels and domain validation. */
export const PROSPECT_STATUSES = [
  "candidate",
  "draft",
  "approved",
  "active",
  "held",
  "skipped",
  "replied",
  "optedOut",
  "bounced",
  "finished",
] as const;
export const LINKEDIN_STATUSES = [
  "research",
  "ready",
  "invited",
  "connected",
  "messaged",
  "replied",
  "closed",
] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];
export type LinkedInStatus = (typeof LINKEDIN_STATUSES)[number];
