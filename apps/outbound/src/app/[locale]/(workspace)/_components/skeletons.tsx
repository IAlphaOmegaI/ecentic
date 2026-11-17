import { ProspectSummarySkeleton } from "../prospects/[id]/_components/skeletons";

export const WorkspaceSkeleton = ({
  section = "overview",
}: {
  section?: string;
}) => {
  if (section === "detail") return <ProspectSummarySkeleton />;
  const form = [
    "playbook",
    "integrations",
    "new",
    "review",
    "linkedin",
    "replies",
  ].includes(section);
  if (form)
    return (
      <div
        className="animate-pulse bg-background-rich motion-reduce:animate-none"
        aria-busy="true"
      >
        <div className="grid gap-8 border-accent-foreground border-b px-4 py-7 sm:px-6 xl:grid-cols-[15rem_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="h-5 w-40 rounded-sm bg-accent-foreground/60" />
            <div className="h-3 w-48 rounded-sm bg-accent-foreground/60" />
          </div>
          <div className="grid max-w-4xl gap-5 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="space-y-3">
                <div className="h-3 w-28 rounded-sm bg-accent-foreground/60" />
                <div className="h-10 rounded-sm bg-accent-foreground/60" />
              </div>
            ))}
            <div className="h-32 rounded-sm bg-accent sm:col-span-2" />
            <div className="h-10 w-32 rounded-sm bg-accent-foreground/60" />
          </div>
        </div>
      </div>
    );
  return (
    <div
      className="animate-pulse bg-background-rich motion-reduce:animate-none"
      aria-busy="true"
    >
      {section === "overview" ? (
        <div className="grid grid-cols-2 gap-px border-accent-foreground border-b bg-accent-foreground lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="space-y-4 bg-background-rich px-4 py-5 sm:px-6"
            >
              <div className="h-3 w-24 rounded-sm bg-accent-foreground/60" />
              <div className="h-8 w-16 rounded-sm bg-accent-foreground/60" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex justify-between border-accent-foreground border-b px-4 py-4 sm:px-6">
          <div className="h-10 w-64 rounded-sm bg-accent-foreground/60" />
          <div className="h-10 w-32 rounded-sm bg-accent-foreground/60" />
        </div>
      )}
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="flex gap-8 border-accent-foreground border-b px-4 py-5 sm:px-6"
        >
          <div className="h-4 w-1/3 rounded-sm bg-accent-foreground/60" />
          <div className="h-4 w-1/4 rounded-sm bg-accent-foreground/60" />
        </div>
      ))}
    </div>
  );
};
