import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import * as Automation from "@/server/app/outbound/automation-actions";
import * as Campaigns from "@/server/app/outbound/campaign-actions";
import * as Claude from "@/server/app/outbound/claude-actions";
import { Environment } from "@/server/utils/environment";
import { CampaignDetail } from "../_components/detail";
import { type CampaignSearchParams, campaignQuery } from "../_components/query";
import { CampaignShell } from "../_components/shell";
import { CampaignDetailSkeleton } from "../_components/skeletons";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<CampaignSearchParams>;
}) {
  return (
    <CampaignShell mode="detail">
      <Suspense fallback={<CampaignDetailSkeleton />}>
        <CampaignData params={params} searchParams={searchParams} />
      </Suspense>
    </CampaignShell>
  );
}

const CampaignData = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<CampaignSearchParams>;
}) => {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const [result, claude, automation] = await Promise.all([
    Campaigns.getCampaign(Environment.SERVER, {
      id,
      page: campaignQuery(search).page,
    }),
    Claude.getStatus(Environment.SERVER),
    Automation.getStatus(Environment.SERVER, { campaignId: id }),
  ]);
  if (!result.success) {
    const t = await getTranslations("outbound.campaigns");
    return (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {t("loadError")}
      </p>
    );
  }
  return (
    <CampaignDetail
      data={result.data}
      claudeConfigured={claude.success ? claude.data.configured : null}
      automationStatus={automation.success ? automation.data : null}
    />
  );
};
