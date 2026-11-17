import { resultify } from "@zenncore/utils";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import * as Warmup from "@/server/app/outbound/warmup-actions";
import { Environment } from "@/server/utils/environment";
import { WarmupShell } from "../_components/shell";
import { WarmupSkeleton } from "../_components/skeletons";
import { MailboxControls } from "../_components/workspace";

export default function Page({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  return (
    <WarmupShell detail>
      <Suspense fallback={<WarmupSkeleton />}>
        <MailboxData params={params} />
      </Suspense>
    </WarmupShell>
  );
}
const MailboxData = async ({
  params,
}: {
  params: Promise<{ email: string }>;
}) => {
  const [{ email }, result] = await Promise.all([
    params,
    Warmup.getWorkspace(Environment.SERVER),
  ]);
  const t = await getTranslations("outbound.warmup");
  const decoded = await resultify(() => decodeURIComponent(email));
  const address = decoded.success ? decoded.data : email;
  if (!result.success)
    return (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {t("loadError")}
      </p>
    );
  const mailbox = result.data.mailboxes.find(
    (row) => row.email.toLowerCase() === address.toLowerCase(),
  );
  if (!mailbox)
    return (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {t("missingMailbox")}
      </p>
    );
  return (
    <MailboxControls
      key={`${mailbox.email}-${mailbox.check?.checkedAt ?? "unchecked"}`}
      mailbox={mailbox}
    />
  );
};
