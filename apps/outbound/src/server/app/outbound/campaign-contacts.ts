"use server";

import { resultify } from "@zenncore/utils";
import { z } from "zod";
import { normalizeDomain, splitList } from "@/lib/outbound";
import { schema } from "@/server/database";
import { UserRole } from "@/server/database/validators";
import { withAuthorization } from "@/server/utils/authorization";
import { Environment } from "@/server/utils/environment";
import { ConflictError, NotFoundError } from "@/server/utils/error";
import { searchApolloPeople } from "@/server/utils/outbound/providers";
import { repository } from "@/server/utils/repository";
import * as CampaignService from "./campaigns";
import * as Store from "./store";

const Companies = repository(schema.outboundCampaignCompany);
const Campaigns = repository(schema.outboundCampaign);

export const getCompany = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { campaign: string; company: string }) =>
    resultify(async () => {
      const parsed = z
        .object({ campaign: z.string().uuid(), company: z.string().uuid() })
        .parse(input);
      const [company, campaign] = await Promise.all([
        Companies.get(Environment.SERVER, parsed.company),
        Campaigns.get(Environment.SERVER, parsed.campaign),
      ]);
      if (!company.success) throw company.error;
      if (!campaign.success) throw campaign.error;
      if (
        !company.data ||
        !campaign.data ||
        company.data.campaignId !== campaign.data.id
      )
        throw new NotFoundError("Campaign company not found.");
      return { company: company.data, campaign: campaign.data };
    }),
  "Outbound.getCampaignCompany",
);

export const searchPeople = withAuthorization(
  [UserRole.STAFF],
  async (_, input: { campaign: string; company: string; page?: number }) => {
    const parsed = z
      .object({
        campaign: z.string().uuid(),
        company: z.string().uuid(),
        page: z.number().int().min(1).max(100).default(1),
      })
      .parse(input);
    const target = await CampaignService.researchContext({
      campaign: parsed.campaign,
      company: parsed.company,
    });
    if (!target.success) return target;
    if (
      target.data.company.status !== "candidate" ||
      !["draft", "active"].includes(target.data.campaign.status)
    )
      return {
        success: false as const,
        error: new ConflictError(
          "This campaign company is not available for contact research.",
        ),
      };
    const policy = await Store.policy();
    const excludedTitles = [
      ...new Set([
        ...target.data.campaign.criteria.excludedRoles,
        ...splitList(policy.settings.excludedRoles),
      ]),
    ];
    const people = await searchApolloPeople({
      domain: target.data.company.domain,
      titles: target.data.campaign.criteria.targetRoles,
      // Apollo accepts at most 48 exclusion filters. All exclusions are also
      // applied to returned records, including additional global restrictions.
      excludedTitles: excludedTitles.slice(0, 48),
      page: parsed.page,
    });
    if (!people.success) return people;
    return {
      success: true as const,
      data: {
        ...people.data,
        // Domain-less or mismatched employers need manual research; do not claim a match.
        people: people.data.people.filter(
          (person) =>
            Boolean(person.name) &&
            normalizeDomain(person.domain) === target.data.company.domain &&
            !excludedTitles.some((title) =>
              person.title.toLowerCase().includes(title.toLowerCase()),
            ),
        ),
      },
    };
  },
  "Outbound.searchCampaignPeople",
);
