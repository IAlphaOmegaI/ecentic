import { getLocale } from "next-intl/server";
import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import { activityHref } from "@/lib/outbound-conversation-activity";
import { parseSentQuery, type SentSearchParams } from "@/lib/outbound-sent";
import { ConversationShell } from "../replies/_components/shell";
import { ConversationQueueSkeleton } from "../replies/_components/skeletons";
export default ({
  searchParams,
}: {
  searchParams: Promise<SentSearchParams>;
}) => (
  <ConversationShell>
    <Suspense fallback={<ConversationQueueSkeleton />}>
      <SentAlias searchParams={searchParams} />
    </Suspense>
  </ConversationShell>
);
const SentAlias = async ({
  searchParams,
}: {
  searchParams: Promise<SentSearchParams>;
}) => {
  const query = parseSentQuery(await searchParams);
  redirect({
    locale: await getLocale(),
    href: activityHref({
      view: "sent",
      q: query.q,
      page: query.page,
      channel: "all",
      prospect: query.prospect,
      campaign: query.campaign,
    }),
  });
  return null;
};
