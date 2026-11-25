import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  type LinkedInSearchParams,
  parseLinkedInQuery,
} from "@/lib/outbound-linkedin";
import * as Outbound from "@/server/app/outbound";
import { Environment } from "@/server/utils/environment";
import { CampaignContext } from "../_components/campaign-context";
import { LinkedInQueueTable } from "./_components/queue";
import { LinkedInShell } from "./_components/shell";
import { LinkedInQueueSkeleton } from "./_components/skeletons";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<LinkedInSearchParams>;
}) {
  return (
    <LinkedInShell mode="queue">
      <Suspense fallback={<LinkedInQueueSkeleton />}>
        <QueueData searchParams={searchParams} />
      </Suspense>
    </LinkedInShell>
  );
}

const QueueData = async ({
  searchParams,
}: {
  searchParams: Promise<LinkedInSearchParams>;
}) => {
  const query = parseLinkedInQuery(await searchParams);
  const result = await Outbound.getLinkedInQueue(Environment.SERVER, query);
  if (!result.success) {
    const translate = await getTranslations("outbound.linkedin.queue");
    return (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {translate("error")}
      </p>
    );
  }
  return (
    <>
      <CampaignContext campaign={query.campaign} />
      <LinkedInQueueTable
        queue={result.data}
        query={{ ...query, page: result.data.page }}
      />
    </>
  );
};
