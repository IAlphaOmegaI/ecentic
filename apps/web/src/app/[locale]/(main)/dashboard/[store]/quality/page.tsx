import {
  BullseyeIcon,
  ChevronRightIcon,
  GaugeIcon,
  RadarIcon,
  ShareIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import * as ListingQuality from "@/server/app/intelligence/listing-quality";
import { unwrapEntitled } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { StatCell, StatusPill } from "../../_components/grid";
import {
  QualityShell,
  RowsSkeleton,
  SummarySkeleton,
} from "./_components/shell";

type StoreParams = PageProps<"/[locale]/dashboard/[store]/quality">["params"];

const SEVERITY_TONES = {
  blocker: "error",
  warning: "warning",
  info: "neutral",
} as const;

/**
 * One product row: identity, then a fixed column per surface.
 *
 * Was `flex-wrap justify-between`, which pushed the status group onto a second
 * line whenever the title was long — so row height and pill alignment changed
 * product by product down the list. Fixed columns keep the rhythm regardless of
 * title length, and let the eye run down a single surface.
 */
const ROW_GRID =
  "grid grid-cols-1 gap-x-4 gap-y-2 px-4 sm:grid-cols-[minmax(0,1fr)_repeat(3,8rem)] sm:items-center";

const COLUMN_HEADER =
  "font-semibold text-[11px] text-foreground-dimmed uppercase tracking-[0.06em]";

const STATUS_DOTS = {
  blocker: "bg-error",
  warning: "bg-warning",
  info: "bg-foreground-dimmed",
  ready: "bg-success",
} as const;

/** Status alone — the surface it belongs to is the column it sits in. */
const StatusCell = ({
  status,
  surfaceLabel,
  statusLabel,
}: {
  status: keyof typeof STATUS_DOTS;
  surfaceLabel: string;
  statusLabel: string;
}) => (
  <span className="flex items-center gap-1.5">
    <span
      aria-hidden
      className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOTS[status])}
    />
    {/* No column headers below `sm`, so the cell names its own surface. */}
    <span className="text-foreground-dimmed text-xs sm:hidden">
      {surfaceLabel}
    </span>
    <span className="text-foreground text-xs">{statusLabel}</span>
  </span>
);

const SURFACE_ICONS: Record<ListingQuality.Surface, ReactNode> = {
  universal: <RadarIcon />,
  google: <GaugeIcon />,
  chatgpt: <BullseyeIcon />,
};

/**
 * Readiness thresholds for this page.
 *
 * Deliberately stricter than the win-rate scale in design.md §4.4: a feed is
 * either accepted or it is not, so "most of the catalog passes" is not a good
 * result the way a 60% win rate is.
 */
const readyTone = (share: number) => {
  switch (true) {
    case share >= 80:
      return "success" as const;
    case share >= 50:
      return "warning" as const;
    default:
      return "error" as const;
  }
};

const PlatformVerdicts = ({
  universal,
  entries,
  labels,
}: {
  universal: ListingQuality.Severity | null;
  entries: {
    platform: ListingQuality.Platform;
    verdict: ListingQuality.Verdict;
  }[];
  labels: {
    platform: (surface: ListingQuality.Surface) => string;
    severity: (severity: ListingQuality.Severity) => string;
    reference: string;
  };
}) => (
  // `gap-x-5` between platforms against `gap-1.5` within one: the two used to
  // be 2 and 1.5, so a platform's "Docs" link sat as close to the next
  // platform's pill as to its own and the line read as one undifferentiated run.
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
    {universal && (
      <StatusPill tone={SEVERITY_TONES[universal]}>
        {labels.platform("universal")} · {labels.severity(universal)}
      </StatusPill>
    )}
    {entries.map((entry) => (
      <span key={entry.platform} className="flex items-center gap-1.5">
        <StatusPill tone={SEVERITY_TONES[entry.verdict.severity]}>
          {labels.platform(entry.platform)} ·{" "}
          {labels.severity(entry.verdict.severity)}
        </StatusPill>
        {entry.verdict.code && (
          <code className="rounded bg-background-dimmed px-1.5 py-0.5 font-mono text-[11px] text-foreground-dimmed">
            {entry.verdict.code}
          </code>
        )}
        <a
          href={entry.verdict.reference}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary-text text-xs underline-offset-2 hover:underline"
        >
          {labels.reference}
          <ShareIcon aria-hidden className="size-3" />
        </a>
      </span>
    ))}
  </div>
);

const Summary = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.quality");
  // Renders beneath the paywall overlay for accounts without a plan — see
  // `unwrapEntitled`.
  const report = unwrapEntitled(
    await ListingQuality.auditListings(Environment.SERVER, { store }),
  );
  if (!report) return null;

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
      <StatCell
        label={translate("summary.totalLabel")}
        icon={<ShoppingCartIcon />}
        value={report.total}
        detail={translate("summary.totalDetail")}
      />
      {ListingQuality.SURFACES.map((surface) => {
        const summary = report.surfaces[surface];

        return (
          <StatCell
            key={surface}
            label={translate(`platform.${surface}`)}
            icon={SURFACE_ICONS[surface]}
            value={summary.readyShare}
            suffix="%"
            progress={summary.readyShare}
            tone={readyTone(summary.readyShare)}
            detail={
              <span className="flex flex-wrap gap-1.5">
                <StatusPill tone="error">
                  {translate("summary.blockers", {
                    count: String(summary.blockers),
                  })}
                </StatusPill>
                <StatusPill tone="warning">
                  {translate("summary.warnings", {
                    count: String(summary.warnings),
                  })}
                </StatusPill>
                <StatusPill tone="success">
                  {translate("summary.ready", { count: String(summary.ready) })}
                </StatusPill>
              </span>
            }
          />
        );
      })}
    </div>
  );
};

const TopIssues = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.quality");
  // Renders beneath the paywall overlay for accounts without a plan — see
  // `unwrapEntitled`.
  const report = unwrapEntitled(
    await ListingQuality.auditListings(Environment.SERVER, { store }),
  );
  if (!report) return null;

  if (report.topIssues.length === 0)
    return (
      <p className="p-4 text-foreground-dimmed text-sm">
        {translate("issues.empty")}
      </p>
    );

  return (
    <div className="divide-y divide-accent-foreground">
      {report.topIssues.map((issue) => {
        const affected = report.products.filter((product) =>
          product.findings.some((finding) => finding.rule === issue.rule),
        );

        return (
          <div
            key={issue.rule}
            className="flex flex-col gap-2 p-4 sm:grid sm:grid-cols-[9rem_1fr] sm:gap-4"
          >
            <div>
              <StatusPill tone="primary">
                {translate("issues.affected", { count: issue.count })}
              </StatusPill>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <div>
                <p className="font-medium text-foreground text-sm">
                  {translate(`rules.${issue.rule}.title`)}
                </p>
                <p className="mt-1 max-w-3xl text-foreground-dimmed text-sm">
                  {translate(`rules.${issue.rule}.detail`)}
                </p>
              </div>
              <PlatformVerdicts
                universal={issue.universal}
                entries={issue.platforms}
                labels={{
                  platform: (surface) => translate(`platform.${surface}`),
                  severity: (severity) => translate(`severity.${severity}`),
                  reference: translate("reference"),
                }}
              />
              <details className="group">
                <summary className="flex w-fit cursor-pointer list-none items-center gap-1 font-medium text-primary-text text-sm underline-offset-2 hover:underline">
                  <ChevronRightIcon
                    aria-hidden
                    className="size-3.5 transition-transform group-open:rotate-90"
                  />
                  {translate("issues.viewAffected")}
                </summary>
                <ul className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto pl-4.5">
                  {affected.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/dashboard/${store}/products/${product.id}`}
                        className="text-foreground text-sm underline-offset-2 hover:text-primary-text hover:underline"
                      >
                        {product.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Products = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.quality");
  // Renders beneath the paywall overlay for accounts without a plan — see
  // `unwrapEntitled`.
  const report = unwrapEntitled(
    await ListingQuality.auditListings(Environment.SERVER, { store }),
  );
  if (!report) return null;

  if (report.products.length === 0)
    return (
      <p className="p-4 text-foreground-dimmed text-sm">
        {translate("products.empty")}
      </p>
    );

  return (
    <div className="flex flex-col">
      {/* Column headers carry the surface names once. The row cells used to
        repeat them in every pill — "Google Merchant · Blocked" twenty-five
        times over — which is what made the section a wall of red. */}
      <div className={cn(ROW_GRID, "hidden bg-background-dimmed py-2 sm:grid")}>
        <p className={COLUMN_HEADER}>{translate("products.headers.product")}</p>
        {ListingQuality.SURFACES.map((surface) => (
          <p key={surface} className={COLUMN_HEADER}>
            {translate(`platform.${surface}`)}
          </p>
        ))}
      </div>

      <div className="divide-y divide-accent-foreground">
        {report.products.map((product) => {
          const statuses = ListingQuality.SURFACES.map((surface) => (
            <StatusCell
              key={surface}
              status={product.status[surface]}
              surfaceLabel={translate(`platform.${surface}`)}
              statusLabel={translate(`status.${product.status[surface]}`)}
            />
          ));

          if (product.findings.length === 0)
            return (
              <div key={product.id} className={cn(ROW_GRID, "py-3")}>
                {/* Indented to match the rows that carry a disclosure caret. */}
                <p className="min-w-0 truncate pl-5.5 font-medium text-foreground text-sm">
                  {product.title}
                </p>
                {statuses}
              </div>
            );

          return (
            <details key={product.id} className="group">
              <summary
                className={cn(
                  ROW_GRID,
                  "cursor-pointer list-none py-3 transition-colors hover:bg-background",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <ChevronRightIcon
                    aria-hidden
                    className="size-3.5 shrink-0 text-foreground-dimmed transition-transform group-open:rotate-90"
                  />
                  <span className="truncate font-medium text-foreground text-sm">
                    {product.title}
                  </span>
                  <span className="shrink-0 text-foreground-dimmed text-xs">
                    {translate("products.findings", {
                      count: product.findings.length,
                    })}
                  </span>
                </span>
                {statuses}
              </summary>
              {/* `bg-background`, not `bg-background-dimmed`: dimmed is two
                steps down from the white row and reads as a slab across the
                full width, and it is also the neutral `StatusPill` surface, so
                an "advisory" verdict disappeared into it. This matches the row
                hover, so expanding feels continuous with the interaction. */}
              <div className="divide-y divide-accent-foreground border-accent-foreground border-t bg-background">
                {product.findings.map((finding) => (
                  <div
                    key={finding.rule}
                    className="flex flex-col gap-1.5 px-4 py-3 pl-10"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded bg-background-dimmed px-1.5 py-0.5 font-mono text-[11px] text-foreground-dimmed">
                        {finding.attribute}
                      </code>
                      <p className="font-medium text-foreground text-sm">
                        {translate(`rules.${finding.rule}.title`)}
                      </p>
                    </div>
                    <p className="max-w-3xl text-foreground-dimmed text-sm">
                      {translate(`rules.${finding.rule}.detail`)}
                    </p>
                    <PlatformVerdicts
                      universal={finding.universal}
                      entries={finding.platforms}
                      labels={{
                        platform: (surface) => translate(`platform.${surface}`),
                        severity: (severity) =>
                          translate(`severity.${severity}`),
                        reference: translate("reference"),
                      }}
                    />
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
};

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/quality">) => (
  <QualityShell
    summary={
      <Suspense fallback={<SummarySkeleton />}>
        <Summary params={params} />
      </Suspense>
    }
    issues={
      <Suspense fallback={<RowsSkeleton />}>
        <TopIssues params={params} />
      </Suspense>
    }
    products={
      <Suspense fallback={<RowsSkeleton />}>
        <Products params={params} />
      </Suspense>
    }
  />
);
