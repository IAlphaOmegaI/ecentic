export const ProspectSummarySkeleton = () => (
  <div aria-busy="true" className="animate-pulse motion-reduce:animate-none">
    <div className="flex flex-wrap justify-between gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
      <div className="space-y-3">
        <div className="h-7 w-48 rounded-sm bg-accent-foreground/60" />
        <div className="h-4 w-64 rounded-sm bg-accent-foreground/60" />
        <div className="h-4 w-52 rounded-sm bg-accent-foreground/60" />
      </div>
      <div className="h-10 w-36 rounded-sm bg-accent-foreground/60" />
    </div>
    <div className="grid border-accent-foreground border-b sm:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="space-y-4 px-4 py-5 sm:px-6">
          <div className="h-4 w-28 rounded-sm bg-accent-foreground/60" />
          <div className="h-6 w-24 rounded-sm bg-accent-foreground/60" />
          <div className="h-3 w-32 rounded-sm bg-accent-foreground/60" />
        </div>
      ))}
    </div>
    <div className="grid border-accent-foreground border-b xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4 px-4 py-6 sm:px-6">
        <div className="h-5 w-32 rounded-sm bg-accent-foreground/60" />
        <div className="h-4 w-48 rounded-sm bg-accent-foreground/60" />
        <div className="h-20 w-full max-w-2xl rounded-sm bg-accent-foreground/60" />
      </div>
      <div className="space-y-4 px-4 py-6 sm:px-6">
        <div className="h-5 w-32 rounded-sm bg-accent-foreground/60" />
        <div className="h-6 w-24 rounded-sm bg-accent-foreground/60" />
      </div>
    </div>
    <div className="space-y-4 px-4 py-6 sm:px-6">
      <div className="h-5 w-40 rounded-sm bg-accent-foreground/60" />
      <div className="h-4 w-4/5 max-w-lg rounded-sm bg-accent-foreground/60" />
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-12 rounded-sm bg-accent-foreground/60" />
      ))}
    </div>
  </div>
);
