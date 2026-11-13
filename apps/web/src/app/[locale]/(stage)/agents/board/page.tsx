import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Board } from "../../_components/board";
import { BoardSkeleton } from "../../_components/skeletons";

export const generateMetadata = async (): Promise<Metadata> => {
  const translate = await getTranslations("agentReadiness");
  return {
    title: translate("meta.board"),
    robots: { index: false, follow: false },
  };
};

export default () => (
  <Suspense fallback={<BoardSkeleton />}>
    <Board />
  </Suspense>
);
