import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { Suspense } from "react";
import * as Optimization from "@/server/app/optimization";
import { Environment } from "@/server/utils/environment";
import { OptimizeClient } from "./_components/optimize-client";
import { OptimizeSkeleton } from "./_components/shell";

type StoreParams = PageProps<"/dashboard/[store]/optimize">["params"];

const OptimizeContent = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const data = unwrapResult(
    await Optimization.listDashboard(Environment.SERVER, { store }),
  );
  return <OptimizeClient data={data} />;
};

export default ({ params }: PageProps<"/dashboard/[store]/optimize">) => {
  return (
    <div className="flex flex-col">
      <div className="mx-8 border-accent-foreground border-x">
        <Suspense fallback={<OptimizeSkeleton />}>
          <OptimizeContent params={params} />
        </Suspense>
      </div>
    </div>
  );
};
