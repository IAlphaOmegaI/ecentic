import {
  ArrowRightIcon,
  CommerceGlobePointerIcon,
  GlobeIcon,
  RadarIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { ScrollArea } from "@zenncore/web/components/scroll-area";
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
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Link } from "@/i18n/navigation";
import { getTrafficBreakdown } from "@/lib/agent-traffic";
import * as Tracking from "@/server/app/tracking";
import { isSubscriptionRequired } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { AgentTrafficError } from "../../../_components/agent-visits-panel";
import { DashboardEmptyState } from "../../../_components/empty-state";

export const OverviewTraffic = async ({
  params,
}: {
  params: PageProps<"/[locale]/dashboard/[store]">["params"];
}) => {
  await connection();
  const { store } = await params;
  const [locale, translate, traffic, result] = await Promise.all([
    getLocale(),
    getTranslations("dashboard.overview.traffic"),
    getTranslations("dashboard.traffic"),
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
  const { referrals, requests, sources } = getTrafficBreakdown(
    summary.byAgentType,
    traffic("other"),
  );
  const compactNumber = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const formatCount = (count: number) =>
    count >= 10000 ? compactNumber.format(count) : number.format(count);

  return (
    <section className="flex h-full min-w-0 flex-col bg-background-rich">
      <header className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-foreground-rich text-lg">
          <RadarIcon aria-hidden className="size-5 text-primary" />
          {translate("title")}
        </h2>
        <p className="text-foreground-dimmed text-xs">{traffic("period")}</p>
      </header>
      <dl className="grid grid-cols-2 border-accent-foreground border-y bg-background">
        <div className="min-w-0 px-6 py-4">
          <dt className="flex items-start gap-2 text-foreground-dimmed text-xs leading-5">
            <CommerceGlobePointerIcon
              aria-hidden
              className="size-4 shrink-0 text-primary"
            />
            {translate("referrals")}
          </dt>
          <dd className="mt-2 font-semibold text-3xl text-foreground-rich tabular-nums">
            {number.format(referrals)}
          </dd>
        </div>
        <div className="min-w-0 border-accent-foreground border-l px-6 py-4">
          <dt className="flex items-start gap-2 text-foreground-dimmed text-xs leading-5">
            <RadarIcon
              aria-hidden
              className="size-4 shrink-0 text-foreground-dimmed"
            />
            {translate("crawlers")}
          </dt>
          <dd className="mt-2 font-semibold text-3xl text-foreground-rich tabular-nums">
            {number.format(requests)}
          </dd>
        </div>
      </dl>
      {sources.length === 0 ? (
        <DashboardEmptyState
          compact
          figure="analytics-recorder"
          title={traffic("empty.title")}
          description={traffic("empty.description")}
          className="flex-1"
        />
      ) : (
        <ScrollArea
          className="min-h-0"
          classList={{ viewport: "max-h-72" }}
          viewportProps={{
            role: "region",
            "aria-label": traffic("source"),
            tabIndex: 0,
          }}
        >
          <Table className="table-fixed border-b-0 text-xs">
            <TableHeader className="sticky top-0 z-10 bg-background-rich">
              <TableRow>
                <TableHead scope="col" className="w-1/2 px-6 py-2 text-xs">
                  {traffic("source")}
                </TableHead>
                <TableHead
                  scope="col"
                  className="w-1/4 whitespace-normal px-2 py-2 text-right text-xs"
                >
                  {traffic("referrals.short")}
                </TableHead>
                <TableHead
                  scope="col"
                  className="w-1/4 whitespace-normal px-6 py-2 text-right text-xs"
                >
                  {traffic("requests.short")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.name}>
                  <TableHead
                    scope="row"
                    className="whitespace-normal px-6 py-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-accent-foreground bg-background-rich">
                        {source.provider ? (
                          <ProviderLogo
                            provider={source.provider}
                            decorative
                            className="size-5 rounded-none object-center"
                          />
                        ) : (
                          <GlobeIcon
                            aria-hidden
                            className="size-4 text-foreground-dimmed"
                          />
                        )}
                      </span>
                      <span className="min-w-0 font-medium text-foreground-rich">
                        {source.name}
                      </span>
                    </span>
                  </TableHead>
                  <TableCell className="px-2 py-2 text-right font-medium text-foreground-rich tabular-nums">
                    <span aria-hidden title={number.format(source.referrals)}>
                      {formatCount(source.referrals)}
                    </span>
                    <span className="sr-only">
                      {number.format(source.referrals)}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-2 text-right font-medium text-foreground-rich tabular-nums">
                    <span aria-hidden title={number.format(source.requests)}>
                      {formatCount(source.requests)}
                    </span>
                    <span className="sr-only">
                      {number.format(source.requests)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
      <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-t px-6 py-4">
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
  <section
    aria-hidden
    className="flex h-full flex-col bg-background-rich motion-reduce:[&_*]:animate-none"
  >
    <div className="px-6 py-4">
      <div className="h-5 w-40 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
    </div>
    <div className="grid grid-cols-2 border-accent-foreground border-y bg-background px-6 py-4">
      {["referrals", "crawlers"].map((key) => (
        <div key={key}>
          <div className="h-3 w-24 animate-pulse bg-foreground/5 motion-reduce:animate-none" />
          <div className="mt-2 h-8 w-16 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
    <div className="flex items-center justify-between border-accent-foreground border-b px-6 py-2">
      <div className="h-4 w-16 animate-pulse bg-foreground/5 motion-reduce:animate-none" />
      <div className="h-4 w-32 animate-pulse bg-foreground/5 motion-reduce:animate-none" />
    </div>
    <div className="divide-y divide-accent-foreground">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-2 px-6 py-2">
          <div className="size-8 shrink-0 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
          <div className="h-4 w-24 animate-pulse bg-foreground/5 motion-reduce:animate-none" />
          <div className="ml-auto h-4 w-20 animate-pulse bg-foreground/5 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
    <div className="mt-auto space-y-3 border-accent-foreground border-t px-6 py-4">
      <div className="h-4 w-64 max-w-full animate-pulse bg-foreground/5 motion-reduce:animate-none" />
      <div className="h-9 w-36 animate-pulse rounded-lg bg-foreground/10 motion-reduce:animate-none" />
    </div>
  </section>
);
