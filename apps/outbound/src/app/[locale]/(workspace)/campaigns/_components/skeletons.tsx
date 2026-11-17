import { AutomationSkeleton } from "../../_components/automation";

export const CampaignTableSkeleton = () => (
  <div aria-hidden className="animate-pulse motion-reduce:animate-none">
    <div className="flex gap-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
      <div className="h-10 w-72 max-w-full rounded-sm bg-accent-foreground/40" />
      <div className="ml-auto h-10 w-40 rounded-sm bg-accent-foreground/40" />
    </div>
    {[1, 2, 3, 4, 5].map((row) => (
      <div
        key={row}
        className="grid grid-cols-3 gap-6 border-accent-foreground border-b px-4 py-6 sm:px-6"
      >
        <div className="h-4 w-3/4 rounded-sm bg-accent-foreground/40" />
        <div className="h-4 w-1/2 rounded-sm bg-accent-foreground/40" />
        <div className="h-4 w-2/3 rounded-sm bg-accent-foreground/40" />
      </div>
    ))}
  </div>
);

export const CampaignFormSkeleton = () => (
  <div
    aria-hidden
    className="space-y-6 px-4 py-6 motion-safe:animate-pulse sm:px-6"
  >
    <div className="h-6 w-48 rounded-sm bg-accent-foreground/40" />
    <div className="grid gap-6 sm:grid-cols-2">
      {[1, 2, 3, 4].map((field) => (
        <div key={field} className="h-16 rounded-sm bg-accent-foreground/40" />
      ))}
    </div>
    <div className="h-10 w-40 rounded-sm bg-accent-foreground/40" />
  </div>
);

export const CampaignDetailSkeleton = () => (
  <>
    <div aria-hidden className="motion-safe:animate-pulse">
      <div className="space-y-2 border-accent-foreground border-b px-4 py-4 sm:px-6">
        <div className="h-6 w-64 rounded-sm bg-accent-foreground/40" />
        <div className="h-5 w-40 rounded-sm bg-accent-foreground/40" />
      </div>
      <AutomationSkeleton />
      {[1, 2, 3].map((section) => (
        <div
          key={section}
          className="border-accent-foreground border-b px-4 py-4 sm:px-6"
        >
          <div className="h-6 w-48 rounded-sm bg-accent-foreground/40" />
        </div>
      ))}
      <div className="space-y-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
        <div className="h-7 w-32 rounded-sm bg-accent-foreground/40" />
        <div className="h-5 w-3/4 rounded-sm bg-accent-foreground/40" />
      </div>
    </div>
    <CampaignTableSkeleton />
  </>
);
