import { ArrowRightIcon, RadarIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import * as Tracking from "@/server/app/tracking";
import { isSubscriptionRequired } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { AgentTrafficError } from "../../../_components/agent-visits-panel";

export const OverviewTraffic = async ({
  params,
}: {
  params: PageProps<"/[locale]/dashboard/[store]">["params"];
}) => {
  await connection();
  const { store } = await params;
  const [locale, translate, result] = await Promise.all([
    getLocale(),
    getTranslations("dashboard.overview.traffic"),
    Tracking.getAgentTrafficSummary(Environment.SERVER, { store }),
  ]);
  if (!result.success) {
    if (isSubscriptionRequired(result.error)) return null;
    return (
      <div className="min-w-0">
        <AgentTrafficError store={store} />
      </div>
    );
  }
  const summary = result.data;
  const number = new Intl.NumberFormat(locale);
  const referrals = summary.byAgentType
    .filter((entry) => entry.agentType.endsWith("-referral"))
    .reduce((total, entry) => total + entry.count, 0);
  const probes = summary.byAgentType
    .filter((entry) => entry.agentType === "probe-ping")
    .reduce((total, entry) => total + entry.count, 0);

  return (
    <section className="flex h-full min-w-0 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 pt-4">
        <h2 className="flex items-center gap-2 font-semibold text-foreground-rich text-lg">
          <RadarIcon aria-hidden className="size-5 text-primary" />
          {translate("title")}
        </h2>
        <p className="text-foreground-dimmed text-xs">
          {translate("description")}
        </p>
      </header>
      <dl className="grid grid-cols-2 px-6 py-6">
        <div className="pr-4">
          <dt className="text-foreground-dimmed text-xs">
            {translate("referrals")}
          </dt>
          <dd className="mt-2 font-semibold text-3xl text-foreground-rich tabular-nums">
            {number.format(referrals)}
          </dd>
        </div>
        <div className="border-accent-foreground border-l pl-4">
          <dt className="text-foreground-dimmed text-xs">
            {translate("crawlers")}
          </dt>
          <dd className="mt-2 font-semibold text-3xl text-foreground-rich tabular-nums">
            {number.format(summary.total30d - referrals - probes)}
          </dd>
        </div>
      </dl>
      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 px-6 pb-4">
        <p className="max-w-sm text-foreground-dimmed text-xs leading-5">
          {translate("hint")}
        </p>
        <Button
          color="neutral"
          variant="soft"
          className="min-h-9 whitespace-normal text-left text-sm"
          render={<Link href={`/dashboard/${store}/results`} />}
        >
          {translate("action.primary")}
          <ArrowRightIcon aria-hidden className="size-4 shrink-0" />
        </Button>
      </footer>
    </section>
  );
};

export const OverviewTrafficSkeleton = () => (
  <section aria-hidden className="px-6 py-4 motion-reduce:[&_*]:animate-none">
    <div className="h-5 w-40 animate-pulse bg-foreground/10" />
    <div className="my-4 grid grid-cols-2 gap-4">
      {["referrals", "crawlers"].map((key) => (
        <div key={key}>
          <div className="h-3 w-24 animate-pulse bg-foreground/5" />
          <div className="mt-2 h-8 w-16 animate-pulse bg-foreground/10" />
        </div>
      ))}
    </div>
    <div className="h-4 w-64 max-w-full animate-pulse bg-foreground/5" />
  </section>
);
