import { unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import * as Tracking from "@/server/app/tracking";
import { Environment } from "@/server/utils/environment";
import { AgentVisitsChart } from "./agent-visits-chart";
import { SectionKicker } from "./grid";

export const AgentVisitsPanel = async ({
  params,
}: {
  params: PageProps<"/dashboard/[store]">["params"];
}) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.agentVisits");
  const [summary, timeSeries] = await Promise.all([
    unwrapResult(
      Tracking.getAgentTrafficSummary(Environment.SERVER, { store }),
    ),
    unwrapResult(
      Tracking.getAgentTrafficTimeSeries(Environment.SERVER, { store }),
    ),
  ]);
  const max = Math.max(1, ...summary.byAgentType.map((entry) => entry.count));

  return (
    <div className="bg-background-rich p-4">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionKicker>{translate("kicker")}</SectionKicker>
          <p className="mt-2 font-semibold text-foreground-rich text-lg">
            {translate("title")}
          </p>
          <p className="mt-1 text-foreground-dimmed text-sm">
            {translate("description")}
          </p>
        </div>
        <p className="font-bold text-4xl text-foreground-rich tabular-nums tracking-[-0.02em]">
          {summary.total30d}
          <span className="ml-1.5 font-medium text-foreground-dimmed text-xl">
            {translate("total")}
          </span>
        </p>
      </div>

      <AgentVisitsChart data={timeSeries} className="mb-6" />

      {summary.byAgentType.length === 0 ? (
        <p className="text-foreground-dimmed text-sm">
          {translate("states.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {summary.byAgentType.map((entry) => (
            <li key={entry.agentType}>
              <div className="mb-1 flex items-center justify-between gap-4">
                <span className="text-foreground text-sm">{entry.label}</span>
                <span className="shrink-0 font-medium text-foreground-rich text-sm tabular-nums">
                  {entry.count}
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-accent-foreground">
                <div
                  className="h-full rounded-full bg-primary"
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
