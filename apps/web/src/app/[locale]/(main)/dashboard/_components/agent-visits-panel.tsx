import {
  AlertCircleIcon,
  ArrowRightIcon,
  CommerceGlobePointerIcon,
  GlobeIcon,
  RadarIcon,
} from "@zenncore/icons";
import type { UnwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { CustomHairlineFigure } from "@/components/hairline/custom-figure";
import {
  type ProviderKey,
  ProviderLogo,
} from "@/components/marketing/provider-logo";
import { getPathname, Link } from "@/i18n/navigation";
import * as Tracking from "@/server/app/tracking";
import {
  isSubscriptionRequired,
  unwrapEntitled,
} from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { AgentVisitsChart } from "./agent-visits-chart";
import { Crosshair } from "./grid";

const SOURCES: {
  name: string;
  provider?: ProviderKey;
  types: readonly string[];
}[] = [
  {
    name: "ChatGPT / OpenAI",
    provider: "chatgpt",
    types: [
      "chatgpt-referral",
      "chatgpt-user",
      "chatgpt-agent",
      "gptbot",
      "oai-searchbot",
    ],
  },
  {
    name: "Claude / Anthropic",
    provider: "claude",
    types: ["claude-referral", "claude-user", "claudebot", "claude-searchbot"],
  },
  {
    name: "Perplexity",
    provider: "perplexity",
    types: [
      "perplexity-referral",
      "perplexity-user",
      "perplexity-comet",
      "perplexitybot",
    ],
  },
  {
    name: "Google",
    provider: "google",
    types: ["gemini-referral", "google-extended", "googlebot"],
  },
  {
    name: "Microsoft Copilot",
    provider: "copilot",
    types: ["copilot-referral"],
  },
  { name: "You.com", types: ["you-referral"] },
  { name: "Amazon", provider: "amazon", types: ["amazonbot"] },
  { name: "ByteDance", types: ["bytespider"] },
];

export const AgentVisitsPanel = async ({
  params,
}: {
  params: PageProps<"/[locale]/dashboard/[store]">["params"];
}) => {
  await connection();
  const { store } = await params;
  const [summaryResult, timeSeriesResult] = await Promise.all([
    Tracking.getAgentTrafficSummary(Environment.SERVER, { store }),
    Tracking.getAgentTrafficTimeSeries(Environment.SERVER, { store }),
  ]);
  if (
    (!summaryResult.success && isSubscriptionRequired(summaryResult.error)) ||
    (!timeSeriesResult.success &&
      isSubscriptionRequired(timeSeriesResult.error))
  )
    return null;

  if (!summaryResult.success || !timeSeriesResult.success)
    return <AgentTrafficError store={store} />;

  const summary = unwrapEntitled(summaryResult);
  const timeSeries = unwrapEntitled(timeSeriesResult);
  if (!summary || !timeSeries) return null;
  return <AgentTrafficReport summary={summary} timeSeries={timeSeries} />;
};

export const AgentTrafficError = async ({ store }: { store: string }) => {
  const [translate, locale] = await Promise.all([
    getTranslations("dashboard.traffic"),
    getLocale(),
  ]);
  return (
    <section className="min-w-0 bg-background px-4 py-8 sm:px-6">
      <div role="alert" className="flex items-start gap-3">
        <AlertCircleIcon
          aria-hidden
          className="mt-0.5 size-6 shrink-0 text-warning"
        />
        <div>
          <h2 className="font-semibold text-base text-foreground-rich">
            {translate("error.title")}
          </h2>
          <p className="mt-1 max-w-xl text-foreground-dimmed text-sm leading-6">
            {translate("error.description")}
          </p>
          <Button
            className="mt-4"
            variant="soft"
            color="neutral"
            render={
              <a
                href={getPathname({
                  locale,
                  href: `/dashboard/${store}/results`,
                })}
              />
            }
          >
            {translate("action.secondary")}
            <ArrowRightIcon aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export namespace AgentTrafficReport {
  export type Props = {
    summary: UnwrapResult<
      Awaited<ReturnType<typeof Tracking.getAgentTrafficSummary>>
    >;
    timeSeries: Tracking.TrafficTimeSeriesPoint[];
  };
}

export const AgentTrafficReport = async ({
  summary,
  timeSeries,
}: AgentTrafficReport.Props) => {
  const [translate, locale] = await Promise.all([
    getTranslations("dashboard.traffic"),
    getLocale(),
  ]);
  const number = new Intl.NumberFormat(locale);
  const compactNumber = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const formatCellCount = (count: number) =>
    count >= 1_000_000 ? compactNumber.format(count) : number.format(count);
  const referralCount = summary.byAgentType
    .filter((entry) => entry.agentType.endsWith("-referral"))
    .reduce((total, entry) => total + entry.count, 0);
  const probeCount = summary.byAgentType
    .filter((entry) => entry.agentType === "probe-ping")
    .reduce((total, entry) => total + entry.count, 0);
  const requestCount = summary.total30d - referralCount - probeCount;
  const knownTypes = new Set(SOURCES.flatMap((source) => source.types));
  const sources = [
    ...SOURCES,
    {
      name: translate("other"),
      provider: undefined,
      types: summary.byAgentType
        .filter(
          (entry) =>
            !knownTypes.has(entry.agentType) &&
            entry.agentType !== "probe-ping",
        )
        .map((entry) => entry.agentType),
    },
  ]
    .map((source) => {
      const entries = summary.byAgentType.filter((entry) =>
        source.types.includes(entry.agentType),
      );
      const referrals = entries
        .filter((entry) => entry.agentType.endsWith("-referral"))
        .reduce((total, entry) => total + entry.count, 0);
      const requests = entries
        .filter((entry) => !entry.agentType.endsWith("-referral"))
        .reduce((total, entry) => total + entry.count, 0);
      return { ...source, referrals, requests };
    })
    .filter((source) => source.referrals + source.requests > 0)
    .sort(
      (first, second) =>
        second.referrals + second.requests - first.referrals - first.requests,
    );

  return (
    <section className="min-w-0 bg-background">
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 py-5 sm:px-6">
        <div>
          <h2 className="font-semibold text-foreground-rich text-lg">
            {translate("title")}
          </h2>
          <p className="mt-1 max-w-2xl text-foreground-dimmed text-sm leading-6">
            {translate("description")}
          </p>
        </div>
        <p className="text-foreground-dimmed text-sm">{translate("period")}</p>
      </header>
      <dl className="relative grid grid-cols-2 border-accent-foreground border-y">
        <Crosshair className="top-0 right-0 -translate-y-1/2" />
        <div className="min-w-0 px-4 py-5 sm:px-6">
          <dt className="flex min-h-10 items-center gap-2 font-medium text-foreground text-sm sm:min-h-0">
            <CommerceGlobePointerIcon
              aria-hidden
              className="size-5 shrink-0 text-primary"
            />
            {translate("referrals.title")}
          </dt>
          <dd className="mt-2 font-semibold text-3xl text-foreground-rich tabular-nums">
            {number.format(referralCount)}
          </dd>
          <dd className="mt-2 max-w-md text-foreground-dimmed text-xs leading-5">
            {translate("referrals.detail")}
          </dd>
        </div>
        <div className="min-w-0 border-accent-foreground border-l px-4 py-5 sm:px-6">
          <dt className="flex min-h-10 items-center gap-2 font-medium text-foreground text-sm sm:min-h-0">
            <RadarIcon aria-hidden className="size-5 shrink-0 text-primary" />
            {translate("requests.title")}
          </dt>
          <dd className="mt-2 font-semibold text-3xl text-foreground-rich tabular-nums">
            {number.format(requestCount)}
          </dd>
          <dd className="mt-2 max-w-md text-foreground-dimmed text-xs leading-5">
            {translate("requests.detail")}
          </dd>
        </div>
      </dl>
      {sources.length === 0 ? (
        <div className="flex flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:px-6">
          <div aria-hidden className="w-56 max-w-full shrink-0">
            <CustomHairlineFigure name="analytics-recorder" label="" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base text-foreground-rich">
              {translate("empty.title")}
            </h3>
            <p className="mt-2 text-foreground-dimmed text-sm leading-6">
              {translate("empty.description")}
            </p>
            <Button
              variant="soft"
              color="neutral"
              className="mt-5"
              render={<Link href="/dashboard/settings?tab=integrations" />}
            >
              {translate("action.primary")}
              <ArrowRightIcon aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid min-w-0 xl:grid-cols-2">
          <div className="min-w-0">
            <Table className="table-fixed border-b-0 bg-transparent">
              <TableHeader>
                <TableRow>
                  <TableHead
                    scope="col"
                    className="w-1/2 px-4 py-4 font-medium text-xs normal-case tracking-normal sm:px-6"
                  >
                    {translate("source")}
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="w-1/4 whitespace-normal px-2 py-4 text-right font-medium text-xs normal-case tracking-normal"
                  >
                    {translate("referrals.short")}
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="w-1/4 whitespace-normal px-4 py-4 text-right font-medium text-xs normal-case tracking-normal sm:px-6"
                  >
                    {translate("requests.short")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.name}>
                    <TableHead
                      scope="row"
                      className="whitespace-normal px-4 py-3 text-sm normal-case tracking-normal sm:px-6"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        {source.provider ? (
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent-foreground bg-background-rich">
                            <ProviderLogo
                              provider={source.provider}
                              decorative
                              className="size-6 shrink-0 rounded-none object-contain object-center"
                            />
                          </span>
                        ) : (
                          <GlobeIcon
                            aria-hidden
                            className="size-6 shrink-0 text-foreground-dimmed"
                          />
                        )}
                        <span className="font-medium text-foreground-rich">
                          {source.name}
                        </span>
                      </span>
                    </TableHead>
                    <TableCell className="px-2 py-3 text-right font-medium tabular-nums">
                      <span aria-hidden title={number.format(source.referrals)}>
                        {formatCellCount(source.referrals)}
                      </span>
                      <span className="sr-only">
                        {number.format(source.referrals)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-medium tabular-nums sm:px-6">
                      <span aria-hidden title={number.format(source.requests)}>
                        {formatCellCount(source.requests)}
                      </span>
                      <span className="sr-only">
                        {number.format(source.requests)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="min-w-0 border-accent-foreground border-t px-4 py-5 sm:px-6 xl:border-t-0 xl:border-l">
            <AgentVisitsChart data={timeSeries} />
          </div>
        </div>
      )}
      <footer className="border-accent-foreground border-t px-4 py-4 sm:px-6">
        {probeCount > 0 && (
          <p className="mb-2 text-foreground text-sm">
            {translate("probes", { count: probeCount })}
          </p>
        )}
        <p className="max-w-4xl text-foreground-dimmed text-xs leading-5">
          {translate("limitation")}
        </p>
      </footer>
    </section>
  );
};

export const AgentVisitsPanelSkeleton = () => (
  <section
    aria-hidden
    className="min-w-0 bg-background motion-reduce:[&_*]:animate-none"
  >
    <div className="px-4 py-5 sm:px-6">
      <div className="h-6 w-40 animate-pulse bg-foreground/10" />
      <div className="mt-2 h-5 w-96 max-w-full animate-pulse bg-foreground/5" />
    </div>
    <div className="grid grid-cols-2 border-accent-foreground border-y">
      {["referrals", "requests"].map((key) => (
        <div
          key={key}
          className="min-w-0 border-accent-foreground px-4 py-5 last:border-l sm:px-6"
        >
          <div className="h-5 w-40 max-w-full animate-pulse bg-foreground/5" />
          <div className="mt-2 h-9 w-20 animate-pulse bg-foreground/10" />
          <div className="mt-2 h-5 w-60 max-w-full animate-pulse bg-foreground/5" />
        </div>
      ))}
    </div>
    <div className="grid min-w-0 xl:grid-cols-2">
      <div>
        <div className="grid grid-cols-4 border-accent-foreground border-b px-4 py-4 sm:px-6">
          {["source", "referrals", "requests"].map((key) => (
            <div
              key={key}
              className="h-4 w-16 max-w-full animate-pulse bg-foreground/5 first:col-span-2"
            />
          ))}
        </div>
        {["openai", "anthropic", "google", "perplexity", "copilot"].map(
          (key) => (
            <div
              key={key}
              className="flex items-center gap-3 border-accent-foreground border-b px-4 py-3 last:border-b-0 sm:px-6"
            >
              <div className="size-9 shrink-0 animate-pulse rounded-lg bg-foreground/10" />
              <div className="h-5 w-32 max-w-2/5 animate-pulse bg-foreground/5" />
              <div className="ml-auto h-5 w-8 animate-pulse bg-foreground/10" />
              <div className="ml-7 h-5 w-8 animate-pulse bg-foreground/10" />
            </div>
          ),
        )}
      </div>
      <div className="min-w-0 border-accent-foreground border-t px-4 py-5 sm:px-6 xl:border-t-0 xl:border-l">
        <div className="h-5 w-32 animate-pulse bg-foreground/10" />
        <div className="mt-2 h-5 w-64 max-w-full animate-pulse bg-foreground/5" />
        <div className="mt-4 h-5 w-64 max-w-full animate-pulse bg-foreground/5" />
        <div className="mt-6 flex h-56 flex-col justify-between py-4">
          {["top", "middle", "bottom"].map((key) => (
            <div key={key} className="h-px w-full bg-accent-foreground" />
          ))}
        </div>
        <div className="mt-3 h-5 w-full animate-pulse bg-foreground/5" />
      </div>
    </div>
    <div className="border-accent-foreground border-t px-4 py-4 sm:px-6">
      <div className="h-5 w-full max-w-4xl animate-pulse bg-foreground/5" />
    </div>
  </section>
);
