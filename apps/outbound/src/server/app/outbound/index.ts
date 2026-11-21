"use server";

import { z } from "zod";
import type { Playbook, ProspectInput } from "@/lib/outbound";
import { splitList } from "@/lib/outbound";
import type { LinkedInSearchParams } from "@/lib/outbound-linkedin";
import type { ReviewSearchParams } from "@/lib/outbound-review";
import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import { ValidationError } from "@/server/utils/error";
import {
  getIntegrationStatus as integrationStatus,
  searchApolloPeople,
} from "@/server/utils/outbound/providers";
import * as Store from "./store";

export type { Workspace } from "./store";

export const getLinkedInQueue = withAuthorization(
  [UserRole.STAFF],
  async (_, input: LinkedInSearchParams = {}) => Store.getLinkedInQueue(input),
  "Outbound.getLinkedInQueue",
);

export const getLinkedInItem = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { id: string }) => Store.getLinkedInItem(input),
  "Outbound.getLinkedInItem",
);

export const getReviewQueue = withAuthorization(
  [UserRole.STAFF],
  async (_, input: ReviewSearchParams = {}) => Store.getReviewQueue(input),
  "Outbound.getReviewQueue",
);

export const getReviewItem = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { id: string }) => Store.getReviewItem(input),
  "Outbound.getReviewItem",
);

export const getProspectItem = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { id: string }) => Store.getProspectItem(input),
  "Outbound.getProspectItem",
);

export const getInboxSummaries = withAuthorization(
  [UserRole.STAFF],
  async () => Store.getInboxSummaries(),
  "Outbound.getInboxSummaries",
);

export const getPreparationSummary = withAuthorization(
  [UserRole.STAFF],
  async () => Store.getPreparationSummary(),
  "Outbound.getPreparationSummary",
);

export const getWorkspace = withAuthorization(
  [UserRole.STAFF],
  async () => {
    const workspace = await Store.getWorkspace();
    if (!workspace.success) return workspace;
    return {
      success: true as const,
      data: { ...workspace.data, integrationStatus: await integrationStatus() },
    };
  },
  "Outbound.getWorkspace",
);

export const getPlaybook = withAuthorization(
  [UserRole.STAFF],
  async () => ({ success: true as const, data: await Store.policy() }),
  "Outbound.getPlaybook",
);

export const savePlaybook = withAuthorization(
  [UserRole.STAFF],
  async (context, input: Playbook) =>
    Store.savePlaybook(context.session.user.id, input),
  "Outbound.savePlaybook",
);
export const saveProspect = withAuthorization(
  [UserRole.STAFF],
  async (context, input: ProspectInput) =>
    Store.saveProspect(context.session.user.id, input),
  "Outbound.saveProspect",
);
export const saveCampaignProspect = withAuthorization(
  [UserRole.STAFF],
  async (
    context,
    input: { company: string; revision: number; prospect: ProspectInput },
  ) => Store.saveCampaignProspect(context.session.user.id, input),
  "Outbound.saveCampaignProspect",
);
export const importProspects = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { content: string }) =>
    Store.importProspects(context.session.user.id, input),
  "Outbound.importProspects",
);
export const generateDrafts = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { prospect: string }) =>
    Store.generateDrafts(context.session.user.id, input),
  "Outbound.generateDrafts",
);
export const saveDraft = withAuthorization(
  [UserRole.STAFF],
  async (
    context,
    input: {
      prospect: string;
      revision: number;
      subject: string;
      body: string;
      followupOne: string;
      followupTwo: string;
    },
  ) => Store.saveDraft(context.session.user.id, input),
  "Outbound.saveDraft",
);
export const reviewProspect = withAuthorization(
  [UserRole.STAFF],
  async (
    context,
    input: {
      prospect: string;
      revision: number;
      decision: "approve" | "hold" | "skip" | "review";
      reason?: string;
    },
  ) => Store.reviewProspect(context.session.user.id, input),
  "Outbound.reviewProspect",
);
export const updateLinkedIn = withAuthorization(
  [UserRole.STAFF],
  async (
    context,
    input: {
      prospect: string;
      status:
        | "research"
        | "ready"
        | "invited"
        | "connected"
        | "messaged"
        | "replied"
        | "closed";
      draft: string;
      nextActionAt: string;
      note?: string;
    },
  ) => Store.updateLinkedIn(context.session.user.id, input),
  "Outbound.updateLinkedIn",
);
export const recordOutcome = withAuthorization(
  [UserRole.STAFF],
  async (
    context,
    input: {
      prospect: string;
      kind:
        | "reply"
        | "positive"
        | "negative"
        | "optout"
        | "bounce"
        | "meeting"
        | "note";
      note?: string;
    },
  ) => Store.recordOutcome(context.session.user.id, input),
  "Outbound.recordOutcome",
);

export const searchPeople = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { domain: string }) => {
    if (
      !z.object({ domain: z.string().trim().min(3).max(253) }).safeParse(input)
        .success
    )
      return {
        success: false as const,
        error: new ValidationError("Enter a store domain."),
      };
    const configuration = await Store.policy();
    return searchApolloPeople({
      domain: input.domain,
      titles: splitList(configuration.settings.targetRoles),
      excludedTitles: splitList(configuration.settings.excludedRoles),
    });
  },
  "Outbound.searchPeople",
);

export const getWeeklyReport = withAuthorization(
  [UserRole.STAFF],
  async () => Store.getWeeklyReport(),
  "Outbound.getWeeklyReport",
);
