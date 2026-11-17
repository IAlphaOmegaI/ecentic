import { ArrowLeftIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import {
  type LinkedInSearchParams,
  linkedinQueueHref,
  parseLinkedInQuery,
} from "@/lib/outbound-linkedin";
import * as Outbound from "@/server/app/outbound";
import { Environment } from "@/server/utils/environment";
import { Empty } from "../../_components/common";
import { LinkedInShell } from "../_components/shell";
import { LinkedInDetailSkeleton } from "../_components/skeletons";
import { LinkedInEditor } from "./_components/editor";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<LinkedInSearchParams>;
};

export default function Page({ params, searchParams }: PageProps) {
  return (
    <LinkedInShell mode="detail">
      <Suspense fallback={<LinkedInDetailSkeleton />}>
        <LinkedInDetailData params={params} searchParams={searchParams} />
      </Suspense>
    </LinkedInShell>
  );
}

const LinkedInDetailData = async ({ params, searchParams }: PageProps) => {
  const [path, search] = await Promise.all([params, searchParams]);
  const backHref = linkedinQueueHref(parseLinkedInQuery(search));
  const result = await Outbound.getLinkedInItem(Environment.SERVER, {
    id: path.id,
  });
  const translate = await getTranslations("outbound.linkedin.queue");
  if (!result.success)
    return (
      <p role="alert" className="px-4 py-8 text-error text-sm sm:px-6">
        {translate("error")}
      </p>
    );
  if (!result.data)
    return (
      <Empty
        title={translate("missingTitle")}
        description={translate("missingDescription")}
      >
        <Button
          variant="outline"
          color="neutral"
          render={<Link href={backHref} />}
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          {translate("action.secondary")}
        </Button>
      </Empty>
    );
  return (
    <LinkedInEditor
      key={`${result.data.prospect.id}-${result.data.prospect.updatedAt}`}
      prospect={result.data.prospect}
      playbook={result.data.playbook}
      backHref={backHref}
    />
  );
};
