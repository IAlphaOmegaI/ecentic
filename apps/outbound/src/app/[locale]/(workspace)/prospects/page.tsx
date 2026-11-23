import { getTranslations } from "next-intl/server";
import {
  type ProspectSearchParams,
  parseProspectQuery,
} from "@/lib/outbound-prospects";
import * as Outbound from "@/server/app/outbound";
import * as Prospects from "@/server/app/outbound/prospects-actions";
import { Environment } from "@/server/utils/environment";
import { ProspectList } from "../_components/prospect-list";
import { WorkspacePage } from "../_components/workspace";
export default function Page({
  searchParams,
}: {
  searchParams: Promise<ProspectSearchParams>;
}) {
  return (
    <WorkspacePage section="prospects">
      <ProspectData searchParams={searchParams} />
    </WorkspacePage>
  );
}
const ProspectData = async ({
  searchParams,
}: {
  searchParams: Promise<ProspectSearchParams>;
}) => {
  const query = parseProspectQuery(await searchParams);
  const [queue, policy] = await Promise.all([
    Prospects.list(Environment.SERVER, query),
    Outbound.getPlaybook(Environment.SERVER),
  ]);
  if (!queue.success || !policy.success) {
    const t = await getTranslations("outbound.common");
    return (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {t("error")}
      </p>
    );
  }
  return (
    <ProspectList
      queue={queue.data}
      query={query}
      manualPreparation={
        policy.data.settings.automationEnabled
          ? null
          : policy.data.settings.weeklyTarget
      }
    />
  );
};
