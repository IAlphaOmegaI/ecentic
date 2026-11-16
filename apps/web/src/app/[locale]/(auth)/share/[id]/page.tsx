import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import * as Scan from "@/server/app/scan";
import { Environment } from "@/server/utils/environment";
import { ShareReport } from "./_components/report";
import { ShareReportSkeleton, ShareShell } from "./_components/shell";

const ReportContent = async ({
  params,
}: Pick<PageProps<"/[locale]/share/[id]">, "params">) => {
  await connection();
  const { id } = await params;
  const result = await Scan.getShareData(Environment.SERVER, { id });
  if (!result.success) notFound();
  return <ShareReport {...result.data} />;
};

export default ({ params }: PageProps<"/[locale]/share/[id]">) => (
  <ShareShell>
    <Suspense fallback={<ShareReportSkeleton />}>
      <ReportContent params={params} />
    </Suspense>
  </ShareShell>
);
