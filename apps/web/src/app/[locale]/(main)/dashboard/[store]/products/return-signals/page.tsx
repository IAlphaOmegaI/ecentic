import { Suspense } from "react";
import {
  LoopSignals,
  LoopSignalsSkeleton,
} from "../../_components/loop-signals";
import { ReturnSignalsShell } from "./_components/shell";

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/products/return-signals">) => (
  <ReturnSignalsShell>
    <Suspense fallback={<LoopSignalsSkeleton />}>
      <LoopSignals params={params} standalone />
    </Suspense>
  </ReturnSignalsShell>
);
