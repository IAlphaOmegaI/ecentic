import type { Metadata } from "next";
import { Suspense } from "react";
import { Board } from "../../_components/board";
import { BoardSkeleton } from "../../_components/skeletons";

export const metadata: Metadata = {
  title: "Room board",
  robots: { index: false, follow: false },
};

export default () => (
  <Suspense fallback={<BoardSkeleton />}>
    <Board />
  </Suspense>
);
