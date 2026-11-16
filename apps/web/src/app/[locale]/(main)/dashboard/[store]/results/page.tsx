import { Suspense } from "react";
import {
  AgentVisitsPanel,
  AgentVisitsPanelSkeleton,
} from "../../_components/agent-visits-panel";
import { ResultsShell } from "./_components/shell";

export default ({ params }: PageProps<"/[locale]/dashboard/[store]">) => (
  <ResultsShell>
    <Suspense fallback={<AgentVisitsPanelSkeleton />}>
      <AgentVisitsPanel params={params} />
    </Suspense>
  </ResultsShell>
);
