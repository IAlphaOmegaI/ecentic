import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import * as Optimization from "@/server/app/optimization";
import { OptimizeClient } from "./_components/optimize-client";

const OptimizeSkeleton = () => (
  <>
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="mx-8 flex items-center justify-between px-6 py-8">
        <div>
          <div className="h-10 w-64 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-7 w-40 animate-pulse bg-foreground/10" />
        </div>
        <div className="h-9 w-36 animate-pulse bg-foreground/10" />
      </div>
    </div>

    <div className="-mx-8 border-accent-foreground border-b">
      <div className="mx-8">
        <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-3">
          {(["a", "b", "c"] as const).map((key) => (
            <div key={key} className="bg-background-rich p-4">
              <div className="h-3 w-28 animate-pulse bg-foreground/10" />
              <div className="mt-3 h-8 w-16 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="h-8" />

    <div className="-mx-8 mb-12 border-accent-foreground border-t border-b">
      <div className="mx-8 px-6 py-6">
        <div className="mb-4 h-9 w-56 animate-pulse bg-foreground/10" />
        <div className="flex flex-col gap-3">
          {(["d", "e", "f"] as const).map((key) => (
            <div
              key={key}
              className="border border-accent-foreground bg-background-rich p-4"
            >
              <div className="h-5 w-48 animate-pulse bg-foreground/10" />
              <div className="mt-2 h-3 w-full animate-pulse bg-foreground/10" />
              <div className="mt-1 h-3 w-3/4 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
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
