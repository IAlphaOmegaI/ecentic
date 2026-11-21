import {
  PROSPECT_LIFECYCLES,
  type ProspectLifecycle,
} from "./outbound-prospect-progress";
import {
  LINKEDIN_STATUSES,
  type LinkedInStatus,
  PROSPECT_STATUSES,
  type ProspectStatus,
} from "./outbound-status";

export const PROSPECT_PAGE_SIZE = 50;
export type ProspectQuery = {
  q: string;
  status: "all" | ProspectStatus;
  lifecycle: "all" | ProspectLifecycle;
  linkedin: "all" | LinkedInStatus;
  page: number;
};
export type ProspectSearchParams = {
  q?: string | string[];
  status?: string | string[];
  lifecycle?: string | string[];
  linkedin?: string | string[];
  page?: string | string[] | number;
};
export type ProspectListRow = {
  id: string;
  company: string;
  domain: string;
  name: string;
  title: string;
  email: string;
  status: ProspectStatus;
  linkedinUrl: string;
  linkedinStatus: LinkedInStatus;
  lifecycles: ProspectLifecycle[];
};
export type ProspectList = {
  rows: ProspectListRow[];
  total: number;
  page: number;
  pageSize: number;
};

const first = <Value>(value: Value | Value[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const parseProspectQuery = (
  input: ProspectSearchParams = {},
): ProspectQuery => {
  const search = first(input.q);
  const page = Number(first(input.page));
  return {
    q:
      typeof search === "string"
        ? search.replaceAll("\u0000", "").trim().slice(0, 200)
        : "",
    status:
      PROSPECT_STATUSES.find((value) => value === first(input.status)) ?? "all",
    lifecycle:
      PROSPECT_LIFECYCLES.find((value) => value === first(input.lifecycle)) ??
      "all",
    linkedin:
      LINKEDIN_STATUSES.find((value) => value === first(input.linkedin)) ??
      "all",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
};

export const prospectsHref = (input: ProspectSearchParams = {}) => {
  const query = parseProspectQuery(input);
  const parameters = new URLSearchParams();
  if (query.q) parameters.set("q", query.q);
  if (query.status !== "all") parameters.set("status", query.status);
  if (query.lifecycle !== "all") parameters.set("lifecycle", query.lifecycle);
  if (query.linkedin !== "all") parameters.set("linkedin", query.linkedin);
  if (query.page !== 1) parameters.set("page", String(query.page));
  const suffix = parameters.toString();
  return suffix ? `/prospects?${suffix}` : "/prospects";
};
