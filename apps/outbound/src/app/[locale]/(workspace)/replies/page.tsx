import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { activityQuerySchema } from "@/lib/outbound-conversation-activity";
import {
  type ConversationSearchParams,
  parseConversationQuery,
} from "@/lib/outbound-conversation-view";
import * as Conversations from "@/server/app/outbound/conversation-actions";
import * as Activity from "@/server/app/outbound/conversation-activity-actions";
import { Environment } from "@/server/utils/environment";
import { ConversationActivityTable } from "./_components/activity";
import { ConversationQueue } from "./_components/queue";
import { ConversationShell } from "./_components/shell";
import { ConversationQueueSkeleton } from "./_components/skeletons";
import { ConversationViews } from "./_components/views";
export default ({
  searchParams,
}: {
  searchParams: Promise<ConversationSearchParams>;
}) => (
  <ConversationShell>
    <Suspense fallback={<ConversationQueueSkeleton />}>
      <QueueData searchParams={searchParams} />
    </Suspense>
  </ConversationShell>
);
const QueueData = async ({
  searchParams,
}: {
  searchParams: Promise<ConversationSearchParams>;
}) => {
  const parameters = await searchParams;
  const query = parseConversationQuery(parameters);
  if (parameters.view === "sent" || parameters.view === "scheduled") {
    const activityQuery = activityQuerySchema.parse({
      view: parameters.view,
      page: query.page,
      q: query.q,
      channel: query.channel,
      prospect: activityQuerySchema.shape.prospect.safeParse(
        parameters.prospect,
      ).data,
      campaign: activityQuerySchema.shape.campaign.safeParse(
        parameters.campaign,
      ).data,
    });
    const result = await Activity.listActivity(
      Environment.SERVER,
      activityQuery,
    );
    if (!result.success) {
      const t = await getTranslations("outbound.conversations");
      return (
        <>
          <ConversationViews view={activityQuery.view} />
          <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
            {t("error.generic")}
          </p>
        </>
      );
    }
    return (
      <>
        <ConversationViews view={activityQuery.view} />
        <ConversationActivityTable
          activity={result.data}
          query={activityQuery}
        />
      </>
    );
  }
  const result = await Conversations.listConversations(
    Environment.SERVER,
    query,
  );
  if (!result.success) {
    const t = await getTranslations("outbound.conversations");
    return (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {t("error.generic")}
      </p>
    );
  }
  return (
    <>
      <ConversationViews
        view={
          query.archived ? "archived" : query.needsReply ? "needsReply" : "all"
        }
      />
      <ConversationQueue queue={result.data} query={query} />
    </>
  );
};
