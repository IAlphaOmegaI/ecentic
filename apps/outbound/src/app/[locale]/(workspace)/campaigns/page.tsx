import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import * as Campaigns from "@/server/app/outbound/campaign-actions";
import { Environment } from "@/server/utils/environment";
import { CampaignList } from "./_components/list";
import { type CampaignSearchParams, campaignQuery } from "./_components/query";
import { CampaignShell } from "./_components/shell";
import { CampaignTableSkeleton } from "./_components/skeletons";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<CampaignSearchParams>;
}) {
  return (
    <CampaignShell mode="list">
      <Suspense fallback={<CampaignTableSkeleton />}>
        <CampaignData searchParams={searchParams} />
      </Suspense>
    </CampaignShell>
  );
}

const CampaignData = async ({
  searchParams,
}: {
  searchParams: Promise<CampaignSearchParams>;
}) => {
  const query = campaignQuery(await searchParams);
  const result = await Campaigns.listCampaigns(Environment.SERVER, query);
  if (!result.success) {
    const t = await getTranslations("outbound.campaigns");
    return (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {t("loadError")}
      </p>
    );
  }
  return <CampaignList queue={result.data} query={query} />;
};
