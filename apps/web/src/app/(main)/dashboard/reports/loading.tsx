import { PageSkeleton } from "../_components/chrome-skeletons";

// Reports renders bare content inside the dashboard frame — no sidebar and no
// header of its own — so it needs the content placeholder alone. Inheriting the
// parent fallback drew a sidebar and topbar that never arrive.
export default () => <PageSkeleton />;
