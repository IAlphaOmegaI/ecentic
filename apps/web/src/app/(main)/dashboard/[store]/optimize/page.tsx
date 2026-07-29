import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import * as Optimization from "@/server/app/optimization";
import { Environment } from "@/server/utils/environment";
import { OptimizeClient } from "./_components/optimize-client";
import { OptimizeSkeleton } from "./_components/skeletons";

const OptimizeContent = async ({ store }: { store: string }) => {
  await connection();
  const data = unwrapResult(
    await Optimization.listDashboard(Environment.SERVER, { store }),
  );
  return <OptimizeClient data={data} />;
};

export default async ({ params }: { params: Promise<{ store: string }> }) => {
  const { store } = await params;

  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <Suspense fallback={<OptimizeSkeleton />}>
          <OptimizeContent store={store} />
        </Suspense>
      </div>
    </div>
  );
};
