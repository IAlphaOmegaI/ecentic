import {
  type ConversationQuery,
  conversationQuerySchema,
} from "./outbound-conversations";

export type ConversationSearchParams = {
  page?: string | string[];
  thread?: string | string[];
  view?: string | string[];
  prospect?: string | string[];
  campaign?: string | string[];
  q?: string | string[];
  channel?: string | string[];
  stage?: string | string[];
  needsReply?: string | string[];
} & Record<string, string | string[] | undefined>;
export const parseConversationQuery = (
  parameters: ConversationSearchParams,
) => {
  const single = (key: string) =>
    typeof parameters[key] === "string" ? parameters[key] : undefined;
  return conversationQuerySchema.parse({
    page:
      conversationQuerySchema.shape.page.safeParse(single("page")).data ?? 1,
    q: (single("q") ?? "").trim().slice(0, 200),
    channel:
      conversationQuerySchema.shape.channel.safeParse(single("channel")).data ??
      "all",
    stage:
      conversationQuerySchema.shape.stage.safeParse(single("stage")).data ??
      "all",
    archived: single("view") === "archived",
    needsReply: single("needsReply") === "1",
  });
};
export const conversationHref = (query: ConversationQuery = {}) => {
  const parameters = new URLSearchParams();
  if (query.archived) parameters.set("view", "archived");
  if (query.q) parameters.set("q", query.q);
  if (query.channel && query.channel !== "all")
    parameters.set("channel", query.channel);
  if (query.stage && query.stage !== "all")
    parameters.set("stage", query.stage);
  if ("needsReply" in query && query.needsReply)
    parameters.set("needsReply", "1");
  if (query.page && Number(query.page) > 1)
    parameters.set("page", String(query.page));
  const serialized = parameters.toString();
  return `/replies${serialized ? `?${serialized}` : ""}`;
};
