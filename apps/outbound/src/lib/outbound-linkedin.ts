import { parseCampaignFilter } from "./outbound-campaign-filter";
import { LINKEDIN_STATUSES, type LinkedInStatus } from "./outbound-status";

export const LINKEDIN_PAGE_SIZE = 50;

export type LinkedInQuery = {
  campaign?: string;
  q: string;
  status: "all" | LinkedInStatus;
  page: number;
};
export type LinkedInSearchParams = {
  campaign?: string | string[];
  q?: string | string[];
  status?: string | string[];
  page?: string | string[] | number;
};
export type LinkedInQueueRow = {
  id: string;
  company: string;
  domain: string;
  name: string;
  title: string;
  linkedinUrl: string;
  status: LinkedInStatus;
  nextActionAt: string | null;
  updatedAt: string;
  hasDraft: boolean;
};
export type LinkedInQueue = {
  rows: LinkedInQueueRow[];
  total: number;
  page: number;
  pageSize: number;
};

const first = <Value>(value: Value | Value[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const parseLinkedInQuery = (
  input: LinkedInSearchParams = {},
): LinkedInQuery => {
  const search = first(input.q);
  const status = first(input.status);
  const page = Number(first(input.page));
  return {
    ...(parseCampaignFilter(input.campaign)
      ? { campaign: parseCampaignFilter(input.campaign) }
      : {}),
    q:
      typeof search === "string"
        ? search.replaceAll("\u0000", "").trim().slice(0, 200)
        : "",
    status: LINKEDIN_STATUSES.find((value) => value === status) ?? "all",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
};

export const linkedinQueueHref = (input: LinkedInSearchParams = {}) => {
  const query = parseLinkedInQuery(input);
  const parameters = new URLSearchParams();
  if (query.campaign) parameters.set("campaign", query.campaign);
  if (query.q) parameters.set("q", query.q);
  if (query.status !== "all") parameters.set("status", query.status);
  if (query.page !== 1) parameters.set("page", String(query.page));
  const suffix = parameters.toString();
  return suffix ? `/linkedin?${suffix}` : "/linkedin";
};
