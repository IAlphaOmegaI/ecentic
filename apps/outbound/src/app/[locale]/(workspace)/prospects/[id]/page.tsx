import { WorkspacePage } from "../../_components/workspace";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <WorkspacePage section="detail" params={params} />;
}
