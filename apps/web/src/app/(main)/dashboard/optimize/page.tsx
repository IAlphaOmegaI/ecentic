import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import * as Optimization from "@/server/app/optimization";
import { OptimizeClient } from "./_components/optimize-client";

const OptimizeSkeleton = () => (
  <div className="mx-8 animate-pulse px-6 py-8">
    <div className="mb-8 h-8 w-64 rounded bg-background-dimmed" />
    <div className="mb-4 h-10 w-full max-w-md rounded bg-background-dimmed" />
    <div className="space-y-3">
      <div className="h-24 rounded border border-accent-foreground bg-background-dimmed" />
      <div className="h-24 rounded border border-accent-foreground bg-background-dimmed" />
    </div>
  </div>
);

async function OptimizeContent() {
  await connection();
  const data = unwrapResult(await Optimization.listDashboard());
  return <OptimizeClient data={data} />;
}

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <Suspense fallback={<OptimizeSkeleton />}>
        <OptimizeContent />
      </Suspense>
    </div>
  </div>
);
