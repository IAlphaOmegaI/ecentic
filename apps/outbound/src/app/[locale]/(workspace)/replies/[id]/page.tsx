import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { z } from "zod";
import type { ConversationSearchParams } from "@/lib/outbound-conversation-view";
import * as Conversations from "@/server/app/outbound/conversation-actions";
import { Environment } from "@/server/utils/environment";
import { ConversationDetailView } from "../_components/detail";
import { ConversationShell } from "../_components/shell";
import { ConversationDetailSkeleton } from "../_components/skeletons";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<ConversationSearchParams>;
};
export default (props: Props) => (
  <ConversationShell detail>
    <Suspense fallback={<ConversationDetailSkeleton />}>
      <DetailData {...props} />
    </Suspense>
  </ConversationShell>
);
const DetailData = async ({ params, searchParams }: Props) => {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const page =
    z.coerce.number().int().min(1).max(10000).safeParse(query.page).data ?? 1;
  const threadId = z.string().uuid().safeParse(query.thread).data;
  const result = await Conversations.getConversation(Environment.SERVER, {
    id,
    page,
    threadId,
  });
  if (!result.success) {
    if (result.error.name === "not-found-error") notFound();
    const t = await getTranslations("outbound.conversations");
    return (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {t("error.generic")}
      </p>
    );
  }
  return <ConversationDetailView detail={result.data} />;
};
