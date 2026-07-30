import { OptimizeSkeleton } from "./_components/skeletons";

// Mirrors the optimize page shell so navigation lands without layout shift.
export default () => (
  <div className="flex flex-col">
    <div className="mx-8 border-accent-foreground border-x">
      <OptimizeSkeleton />
    </div>
  </div>
);
