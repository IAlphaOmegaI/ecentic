import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { z } from "zod";
import * as Sent from "@/server/app/outbound/sent-actions";
import { Environment } from "@/server/utils/environment";
import { SentDetailView } from "../_components/detail";
import { SentShell } from "../_components/shell";
import { SentDetailSkeleton } from "../_components/skeletons";

export default ({ params }: { params: Promise<{ id: string }> }) => (
  <SentShell detail>
    <Suspense fallback={<SentDetailSkeleton />}>
      <DetailData params={params} />
    </Suspense>
  </SentShell>
);
const DetailData = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const parsed = z.string().uuid().safeParse(id);
  const result = parsed.success
    ? await Sent.detail(Environment.SERVER, { id: parsed.data })
    : null;
  if (!result?.success || !result.data) {
    const t = await getTranslations("outbound.sent");
    return (
      <p
        role="status"
        className="px-4 py-8 text-foreground-dimmed text-sm sm:px-6"
      >
        {t(result && !result.success ? "error" : "missing")}
      </p>
    );
  }
  return <SentDetailView detail={result.data} />;
};
