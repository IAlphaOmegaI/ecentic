import { PipelineOverview } from "./_components/pipeline-overview";
import { WorkspacePage } from "./_components/workspace";
export default function Page() {
  return (
    <WorkspacePage section="overview">
      <PipelineOverview />
    </WorkspacePage>
  );
}
