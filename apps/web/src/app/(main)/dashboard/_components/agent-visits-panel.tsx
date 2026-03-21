import type { AgentTrafficSummary } from "@/server/app/dashboard";

export namespace AgentVisitsPanel {
  export type Props = {
    summary: AgentTrafficSummary;
  };
}

export const AgentVisitsPanel = ({ summary }: AgentVisitsPanel.Props) => {
  const max = Math.max(1, ...summary.byAgentType.map((entry) => entry.count));

  return (
    <div className="border-accent-foreground border-x border-b bg-background-dimmed px-6 py-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-light text-foreground-dimmed text-xs uppercase tracking-widest">
            AI storefront traffic
          </p>
          <p className="mt-2 font-medium text-foreground text-lg">
            Visits by agent (last 30 days)
          </p>
          <p className="mt-1 font-light text-foreground-dimmed text-sm">
            From your ScriptTag tracker — browser-visible AI and referral
            signals only.
          </p>
        </div>
        <p className="font-semibold text-3xl text-foreground tabular-nums">
          {summary.total30d}
          <span className="ml-1 font-light text-foreground-dimmed text-sm">
            total
          </span>
        </p>
      </div>

      {summary.byAgentType.length === 0 ? (
        <p className="font-light text-foreground-dimmed text-sm">
          No AI agent visits recorded yet. Traffic appears when shoppers arrive
          via AI referrers or user-agents your tracker recognizes, or when probe
          mode is enabled.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {summary.byAgentType.map((entry) => (
            <li key={entry.agentType}>
              <div className="mb-1 flex items-center justify-between gap-4">
                <span className="font-light text-foreground text-sm">
                  {entry.label}
                </span>
                <span className="shrink-0 font-medium text-foreground text-sm tabular-nums">
                  {entry.count}
                </span>
              </div>
              <div className="h-1.5 w-full bg-accent-foreground">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${Math.round((entry.count / max) * 100)}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
