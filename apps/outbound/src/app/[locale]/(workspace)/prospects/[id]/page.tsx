import { getTranslations } from "next-intl/server";
import * as Outbound from "@/server/app/outbound";
import * as Connections from "@/server/app/outbound/integrations";
import * as Progress from "@/server/app/outbound/prospect-progress-actions";
import { Environment } from "@/server/utils/environment";
import { Empty } from "../../_components/status";
import { WorkspacePage } from "../../_components/workspace";
import { ProspectSummary } from "./_components/summary";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <WorkspacePage section="detail">
      <ProspectData params={params} />
    </WorkspacePage>
  );
}
const ProspectData = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const [item, clay, progress] = await Promise.all([
    Outbound.getProspectItem(Environment.SERVER, { id }),
    Connections.getClayStatus(Environment.SERVER),
    Progress.getProgress(Environment.SERVER, { prospectIds: [id] }),
  ]);
  if (!item.success || !item.data) {
    const t = await getTranslations("outbound");
    return item.success ? (
      <Empty
        title={t("prospect.emptyTitle")}
        description={t("prospect.emptyDescription")}
      />
    ) : (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {t("common.error")}
      </p>
    );
  }
  return (
    <ProspectSummary
      prospect={item.data.prospect}
      clay={clay.success ? clay.data : null}
      progress={progress.success ? (progress.data[0] ?? null) : null}
    />
  );
};
