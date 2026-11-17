import { z } from "zod";
export const activityQuerySchema = z.object({
  view: z.enum(["sent", "scheduled"]).default("sent"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  q: z.string().trim().max(200).default(""),
  channel: z.enum(["all", "email", "linkedin"]).default("all"),
  prospect: z.string().uuid().optional(),
  campaign: z.string().uuid().optional(),
});
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
export type ConversationActivityRow = {
  id: string;
  prospectId: string;
  company: string;
  person: string;
  channel: "email" | "linkedin";
  kind: "emailStep" | "linkedinMessage" | "linkedinInvite" | "reply";
  status: "accepted" | "starting" | "failed" | "uncertain" | "scheduled";
  at: string;
  step: number | null;
  exactHref: string | null;
};
export type ConversationActivity = {
  rows: ConversationActivityRow[];
  total: number;
  page: number;
  pageSize: number;
};
export const activityHref = (query: ActivityQuery) => {
  const parameters = new URLSearchParams({ view: query.view });
  if (query.page > 1) parameters.set("page", String(query.page));
  if (query.q) parameters.set("q", query.q);
  if (query.channel !== "all") parameters.set("channel", query.channel);
  if (query.prospect) parameters.set("prospect", query.prospect);
  if (query.campaign) parameters.set("campaign", query.campaign);
  return `/replies?${parameters}`;
};
