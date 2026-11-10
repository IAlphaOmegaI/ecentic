export const EditorialArticlesSkeleton = ({ label }: { label: string }) => (
  <div role="status" aria-label={label} className="marketing-grid">
    {[0, 1, 2].map((index) => (
      <div key={index} aria-hidden="true" className="min-h-64">
        <div className="h-8 w-3/4 bg-background-dimmed" />
        <div className="mt-4 h-4 w-full bg-background-dimmed" />
        <div className="mt-2 h-4 w-3/4 bg-background-dimmed" />
        <div className="mt-8 h-4 w-1/2 bg-background-dimmed" />
      </div>
    ))}
  </div>
);
