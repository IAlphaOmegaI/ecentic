import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import * as Optimization from "@/server/app/optimization";
import { Crosshair, SectionGutter } from "../_components/grid";
import { OptimizeClient } from "./_components/optimize-client";

const OptimizeSkeleton = () => (
  <>
    <div className="-mx-8 border-accent-foreground border-b">
      <div className="relative mx-8 flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
        <div>
          <div className="h-5 w-44 animate-pulse rounded-full bg-foreground/10" />
          <div className="mt-3 h-8 w-64 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-4 w-80 animate-pulse bg-foreground/10" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-9 w-44 animate-pulse rounded-md bg-foreground/10" />
          <div className="h-9 w-36 animate-pulse rounded-md bg-foreground/10" />
        </div>
      </div>
    </div>

    <div className="-mx-8 border-accent-foreground border-b">
      <div className="relative mx-8 bg-background-rich">
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
        <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-3">
          {(["a", "b", "c"] as const).map((key) => (
            <div
              key={key}
              className="relative flex h-44 flex-col justify-between bg-background-rich p-5"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-32 animate-pulse bg-foreground/10" />
                <div className="absolute top-5 right-5 size-7.5 animate-pulse bg-foreground/10" />
              </div>
              <div className="h-10 w-16 animate-pulse bg-foreground/10" />
            </div>
          ))}
        </div>
      </div>
    </div>

    <SectionGutter />

    <div className="-mx-8 border-accent-foreground border-t border-b">
      <div className="relative mx-8 bg-background-rich">
        <Crosshair className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Crosshair className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
        <div className="border-accent-foreground border-b p-4">
          <div className="h-3 w-44 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-6 w-56 animate-pulse bg-foreground/10" />
        </div>
        <div className="flex flex-col gap-3 p-4">
          {(["d", "e", "f"] as const).map((key) => (
            <div
              key={key}
              className="rounded-lg border border-accent-foreground bg-background-rich p-4"
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

const OptimizeContent = async () => {
  await connection();
  const data = unwrapResult(await Optimization.listDashboard());
  return <OptimizeClient data={data} />;
};

export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <Suspense fallback={<OptimizeSkeleton />}>
        <OptimizeContent />
      </Suspense>
    </div>
  </div>
);
