import { PageSkeleton } from "../../_components/chrome-skeletons";

// Covers navigations between a store's sub-pages: the sidebar and topbar
// persist from the layout while the next page's payload streams in, so only
// the content column needs a placeholder.
export default () => <PageSkeleton />;
