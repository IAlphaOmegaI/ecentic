import type { Metadata } from "next";
import { Suspense } from "react";
import { StageSkeleton } from "../../../_components/skeletons";
import { Stage } from "../../../_components/stage";

type StageParams = PageProps<"/[locale]/agents/stage/[id]">["params"];

export const metadata: Metadata = {
  title: "Stage screen",
  robots: { index: false, follow: false },
};

const Live = async ({ params }: { params: StageParams }) => {
  const { id } = await params;

  return <Stage id={id} />;
};

export default ({ params }: PageProps<"/[locale]/agents/stage/[id]">) => (
  <Suspense fallback={<StageSkeleton />}>
    <Live params={params} />
  </Suspense>
);
