import { parseCampaignFilter } from "./outbound-campaign-filter";

export const REVIEW_PAGE_SIZE = 50;
export const REVIEW_STATUSES = ["draft", "held", "approved", "active"] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type ReviewQuery = {
  campaign?: string;
  q: string;
  status: "all" | ReviewStatus;
  page: number;
};
export type ReviewSearchParams = {
  campaign?: string | string[];
  q?: string | string[];
  status?: string | string[];
  page?: string | string[] | number;
};
export type ReviewQueueRow = {
  id: string;
  company: string;
  domain: string;
  name: string;
  email: string;
  subject: string;
  status: ReviewStatus;
  updatedAt: string;
};
export type ReviewQueue = {
  rows: ReviewQueueRow[];
  total: number;
  page: number;
  pageSize: number;
};

const first = <Value>(value: Value | Value[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const parseReviewQuery = (
  input: ReviewSearchParams = {},
): ReviewQuery => {
  const search = first(input.q);
  const status = first(input.status);
  const requestedPage = first(input.page);
  const page = Number(requestedPage);
  return {
    ...(parseCampaignFilter(input.campaign)
      ? { campaign: parseCampaignFilter(input.campaign) }
      : {}),
    q:
      typeof search === "string"
        ? search.replaceAll("\u0000", "").trim().slice(0, 200)
        : "",
    status: REVIEW_STATUSES.find((value) => value === status) ?? "all",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
};

export const reviewQueueHref = (input: ReviewSearchParams = {}) => {
  const query = parseReviewQuery(input);
  const parameters = new URLSearchParams();
  if (query.campaign) parameters.set("campaign", query.campaign);
  if (query.q) parameters.set("q", query.q);
  if (query.status !== "all") parameters.set("status", query.status);
  if (query.page !== 1) parameters.set("page", String(query.page));
  const suffix = parameters.toString();
  return suffix ? `/review?${suffix}` : "/review";
};
