import { PageSkeleton } from "./_components/skeletons";

// Mirrors the product detail page shell — the same container and Suspense
// fallback the page renders — so navigation lands without shift.
export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <PageSkeleton />
    </div>
  </div>
);
