import { cn } from "@zenncore/utils";
import { FeedbackState } from "@/components/feedback-state";

export const DashboardEmptyState = (props: DashboardEmptyState.Props) => (
  <FeedbackState {...props} />
);

export namespace DashboardEmptyState {
  export type Props = FeedbackState.Props;
}

export const DashboardEmptyStateSkeleton = ({
  actions = 0,
  scope = "section",
}: {
  actions?: number;
  scope?: "page" | "section";
}) => (
  <div
    aria-hidden
    className={cn(
      "flex min-w-0 flex-col items-start gap-5 bg-background-rich px-4 py-8 sm:flex-row sm:items-center sm:gap-8 sm:px-6",
      scope === "page" &&
        "flex-1 items-center justify-center sm:justify-center",
    )}
  >
    <div className="h-24 w-32 shrink-0 animate-pulse rounded-lg bg-accent-foreground/20 motion-reduce:animate-none sm:h-36 sm:w-44" />
    <div className="w-full min-w-0 max-w-2xl flex-1">
      <div className="h-7 w-64 max-w-full animate-pulse bg-accent-foreground/30 motion-reduce:animate-none" />
      <div className="mt-3 h-4 w-full animate-pulse bg-accent-foreground/20 motion-reduce:animate-none" />
      <div className="mt-2 h-4 w-3/4 animate-pulse bg-accent-foreground/20 motion-reduce:animate-none" />
      {actions > 0 && (
        <div className="mt-5 flex flex-wrap gap-3">
          {Array.from({ length: actions }, (_, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: immutable skeleton positions.
              key={index}
              className="h-10 w-40 animate-pulse rounded-lg bg-accent-foreground/20 motion-reduce:animate-none"
            />
          ))}
        </div>
      )}
    </div>
  </div>
);
