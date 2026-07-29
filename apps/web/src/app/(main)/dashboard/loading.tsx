import {
  PageSkeleton,
  SidebarSkeleton,
  TopbarSkeleton,
} from "./_components/chrome-skeletons";

// Instant feedback for navigations into the dashboard. Without this boundary
// the router keeps the previous screen frozen — with zero visual response to
// the click — until the store guard and first data queries resolve, which reads
// as a dead link.
export default () => (
  <>
    <SidebarSkeleton />
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopbarSkeleton />
      <main className="flex-1 overflow-y-auto">
        <PageSkeleton />
      </main>
    </div>
  </>
);
