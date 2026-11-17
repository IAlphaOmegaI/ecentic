import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import * as Warmup from "@/server/app/outbound/warmup-actions";
import { Environment } from "@/server/utils/environment";
import {
  WarmblyNetworkData,
  WarmblyNetworkSkeleton,
} from "./_components/network-data";
import { WarmupShell } from "./_components/shell";
import { WarmupSkeleton } from "./_components/skeletons";
import { MailboxList } from "./_components/workspace";

export default function Page() {
  return (
    <WarmupShell>
      <Suspense fallback={<WarmblyNetworkSkeleton />}>
        <WarmblyNetworkData />
      </Suspense>
      <Suspense fallback={<WarmupSkeleton />}>
        <MailboxData />
      </Suspense>
    </WarmupShell>
  );
}
const MailboxData = async () => {
  const result = await Warmup.getWorkspace(Environment.SERVER);
  if (!result.success) {
    const t = await getTranslations("outbound.warmup");
    return (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {t("loadError")}
      </p>
    );
  }
  return <MailboxList mailboxes={result.data.mailboxes} />;
};
