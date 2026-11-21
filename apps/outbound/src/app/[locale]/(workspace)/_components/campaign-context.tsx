import { ArrowLeftIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import * as Campaigns from "@/server/app/outbound/campaign-actions";
import { Environment } from "@/server/utils/environment";

export const CampaignContext = async ({ campaign }: { campaign?: string }) => {
  if (!campaign) return null;
  const result = await Campaigns.getCampaignSummary(Environment.SERVER, {
    id: campaign,
  });
  const t = await getTranslations("outbound");
  if (!result.success)
    return (
      <p role="alert" className="px-4 py-6 text-error text-sm sm:px-6">
        {t("common.error")}
      </p>
    );
  return (
    <div className="border-accent-foreground border-b px-4 py-4 sm:px-6">
      <Button
        variant="soft"
        color="neutral"
        render={<Link href={`/campaigns/${campaign}`} />}
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        {result.data.name}
      </Button>
    </div>
  );
};
