"use server";

import type { Campaign, CampaignCriteria } from "@/lib/outbound-campaigns";
import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import * as Campaigns from "./campaigns";

export const listCampaigns = withAuthorization(
  [UserRole.STAFF],
  async (
    _,
    input: {
      page?: number;
      q?: string;
      status?: Campaign["status"] | "all";
    } = {},
  ) => Campaigns.list(input),
  "Outbound.listCampaigns",
);
export const getCampaign = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { id: string; page?: number }) => Campaigns.get(input),
  "Outbound.getCampaign",
);
export const createCampaign = withAuthorization(
  [UserRole.STAFF],
  async (context, input: { name: string }) =>
    Campaigns.create(context.session.user.id, input),
  "Outbound.createCampaign",
);
export const updateCampaign = withAuthorization(
  [UserRole.STAFF],
  async (
    context,
    input: {
      id: string;
      name: string;
      status: Campaign["status"];
      expectedRevision: number;
    },
  ) => Campaigns.update(context.session.user.id, input),
  "Outbound.updateCampaign",
);
export const saveCampaignCriteria = withAuthorization(
  [UserRole.STAFF],
  async (
    context,
    input: {
      id: string;
      expectedRevision: number;
      criteria: CampaignCriteria;
      answers: string;
      claudeGenerationId?: string;
    },
  ) => Campaigns.saveCriteria(context.session.user.id, input),
  "Outbound.saveCampaignCriteria",
);
export const runCampaignDiscovery = withAuthorization(
  [UserRole.STAFF],
  async (
    context,
    input: {
      id: string;
      expectedRevision: number;
      provider?: "auto" | "apollo" | "clay";
    },
  ) => Campaigns.discover(context.session.user.id, input),
  "Outbound.runCampaignDiscovery",
);
