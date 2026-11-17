export const LINKEDIN_ACCOUNT_STATUSES = [
  "running",
  "errored",
  "disconnected",
  "degraded",
  "partial",
] as const;

export type LinkedInAccountStatus = (typeof LINKEDIN_ACCOUNT_STATUSES)[number];

export type LinkedInAccount = {
  id: string;
  name: string;
  status: LinkedInAccountStatus;
  isLocked: boolean;
  lastCheckedAt: string;
};
