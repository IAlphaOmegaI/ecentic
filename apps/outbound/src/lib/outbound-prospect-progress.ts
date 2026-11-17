import type { Prospect } from "./outbound";

export const PROSPECT_LIFECYCLES = [
  "researching",
  "scheduled",
  "sent",
  "replied",
  "held",
] as const;
export type ProspectLifecycle = (typeof PROSPECT_LIFECYCLES)[number];
export type ProspectProgress = {
  prospectId: string;
  nextSendAt: string | null;
  research: "queued" | "running" | "held" | "uncertain" | "complete" | null;
};

export const prospectLifecycles = (
  prospect: Pick<Prospect, "status" | "sentStep" | "messages" | "approvalHash">,
  progress?: ProspectProgress,
): ProspectLifecycle[] => [
  ...(["queued", "running"].includes(progress?.research ?? "")
    ? ["researching" as const]
    : []),
  ...(["approved", "active"].includes(prospect.status) &&
  progress?.nextSendAt &&
  prospect.approvalHash &&
  prospect.sentStep < prospect.messages.length
    ? ["scheduled" as const]
    : []),
  ...(prospect.sentStep > 0 ? ["sent" as const] : []),
  ...(prospect.status === "replied" ? ["replied" as const] : []),
  ...(prospect.status === "held" ||
  ["held", "uncertain"].includes(progress?.research ?? "")
    ? ["held" as const]
    : []),
];
