import { ConversationShell } from "../_components/shell";
import { ConversationDetailSkeleton } from "../_components/skeletons";
export default () => (
  <ConversationShell detail>
    <ConversationDetailSkeleton />
  </ConversationShell>
);
