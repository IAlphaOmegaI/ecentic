import type { ProspectStatus } from "./outbound";
import { parseCampaignFilter } from "./outbound-campaign-filter";

export const SENT_PAGE_SIZE = 50;
export const SENT_STATUSES = [
  "accepted",
  "failed",
  "uncertain",
  "claimed",
] as const;
export type SentStatus = (typeof SENT_STATUSES)[number];
export type SentQuery = {
  q: string;
  status: "all" | SentStatus | "bounced";
  kind: "all" | "outreach" | "test";
  page: number;
  campaign?: string;
  prospect?: string;
};
export type SentSearchParams = {
  q?: string | string[];
  status?: string | string[];
  kind?: string | string[];
  page?: string | string[] | number;
  campaign?: string | string[];
  prospect?: string | string[];
};
export type SentRow = {
  id: string;
  prospectId: string;
  company: string;
  recipient: string;
  sender: string;
  subject: string;
  campaignId: string | null;
  campaignName: string | null;
  status: SentStatus;
  sequenceStatus: ProspectStatus;
  step: number;
  test: boolean;
  recordedAt: string;
  acceptedAt: string | null;
  snapshotAvailable: boolean;
};
export type SentQueue = {
  rows: SentRow[];
  total: number;
  page: number;
  pageSize: number;
};
export type SentDetail = {
  row: SentRow;
  body: string | null;
  fromName: string | null;
  messageId: string;
  providerMessageId: string | null;
  sequence: SentRow[];
  nextSendAt: string | null;
  activity: {
    id: string;
    kind:
      | "sent"
      | "sendFailed"
      | "sendUncertain"
      | "reply"
      | "bounce"
      | "optout";
    recordedAt: string;
  }[];
  activityLimited: boolean;
};
const first = <Value>(value: Value | Value[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
export const parseSentQuery = (input: SentSearchParams = {}): SentQuery => {
  const status = first(input.status);
  const kind = first(input.kind);
  const page = Number(first(input.page));
  const campaign = parseCampaignFilter(input.campaign);
  const prospect = parseCampaignFilter(input.prospect);
  return {
    q: String(first(input.q) ?? "")
      .replaceAll("\u0000", "")
      .trim()
      .slice(0, 200),
    status:
      status === "bounced"
        ? "bounced"
        : (SENT_STATUSES.find((value) => value === status) ?? "all"),
    kind: kind === "test" || kind === "outreach" ? kind : "all",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    ...(campaign ? { campaign } : {}),
    ...(prospect ? { prospect } : {}),
  };
};
export const sentHref = (input: SentSearchParams = {}) => {
  const query = parseSentQuery(input);
  const search = new URLSearchParams();
  if (query.q) search.set("q", query.q);
  if (query.status !== "all") search.set("status", query.status);
  if (query.kind !== "all") search.set("kind", query.kind);
  if (query.page !== 1) search.set("page", String(query.page));
  if (query.campaign) search.set("campaign", query.campaign);
  if (query.prospect) search.set("prospect", query.prospect);
  return search.size ? `/sent?${search}` : "/sent";
};
