import { cn, unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import * as ListingQuality from "@/server/app/intelligence/listing-quality";
import { Environment } from "@/server/utils/environment";
import { StatusPill } from "../../_components/grid";
import {
  QualityShell,
  RowsSkeleton,
  SummarySkeleton,
} from "./_components/shell";

type StoreParams = PageProps<"/dashboard/[store]/quality">["params"];

const STATUS_TONES = {
  blocker: "error",
  warning: "warning",
  info: "neutral",
  ready: "success",
} as const;

const SEVERITY_TONES = {
  blocker: "error",
  warning: "warning",
  info: "neutral",
} as const;

const RING_RADIUS = 28;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const ScoreRing = ({ value }: { value: number }) => (
  <div className="relative size-18 shrink-0">
    <svg viewBox="0 0 64 64" className="size-full" role="presentation">
      <circle
        cx="32"
        cy="32"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="6"
        className="stroke-accent-foreground"
      />
      <circle
        cx="32"
        cy="32"
        r={RING_RADIUS}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
        transform="rotate(-90 32 32)"
        className={cn(
          "stroke-current transition-[stroke-dasharray] duration-600",
          (() => {
            switch (true) {
              case value >= 80:
                return "text-success";
              case value >= 50:
                return "text-warning";
              default:
                return "text-error";
            }
          })(),
        )}
      />
    </svg>
    <p className="absolute inset-0 flex items-center justify-center font-bold text-foreground-rich text-lg tabular-nums tracking-[-0.02em]">
      {value}
    </p>
  </div>
);

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
  <div className="flex flex-wrap items-center gap-2">
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
          className="font-medium text-primary text-xs underline-offset-2 hover:underline"
        >
          {labels.reference} ↗
        </a>
      </span>
    ))}
  </div>
);

const Summary = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.quality");
  const report = await unwrapResult(
    ListingQuality.auditListings(Environment.SERVER, { store }),
  );

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground md:grid-cols-3">
      {ListingQuality.SURFACES.map((surface) => {
        const summary = report.surfaces[surface];
        return (
          <div
            key={surface}
            className="flex flex-col justify-between gap-6 bg-background-rich p-5"
          >
            <p className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
              {translate(`platform.${surface}`)}
            </p>
            <div className="flex items-center gap-6">
              <ScoreRing value={summary.readyShare} />
              <div>
                <p className="text-foreground-dimmed text-xs">
                  {translate("summary.readyShare", { count: report.total })}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusPill tone="error">
                    {translate("summary.blockers", { count: summary.blockers })}
                  </StatusPill>
                  <StatusPill tone="warning">
                    {translate("summary.warnings", { count: summary.warnings })}
                  </StatusPill>
                  <StatusPill tone="success">
                    {translate("summary.ready", { count: summary.ready })}
                  </StatusPill>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TopIssues = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.quality");
  const report = await unwrapResult(
    ListingQuality.auditListings(Environment.SERVER, { store }),
  );

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
          <div key={issue.rule} className="flex flex-col gap-1.5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground text-sm">
                {translate(`rules.${issue.rule}.title`)}
              </p>
              <StatusPill tone="primary">
                {translate("issues.affected", { count: issue.count })}
              </StatusPill>
            </div>
            <p className="max-w-3xl text-foreground-dimmed text-sm">
              {translate(`rules.${issue.rule}.detail`)}
            </p>
            <PlatformVerdicts
              universal={issue.universal}
              entries={issue.platforms}
              labels={{
                platform: (surface) => translate(`platform.${surface}`),
                severity: (severity) => translate(`severity.${severity}`),
                reference: translate("reference"),
              }}
            />
            <details className="group mt-1">
              <summary className="w-fit cursor-pointer list-none font-medium text-primary-text text-sm underline-offset-2 hover:underline">
                <span className="mr-1 inline-block text-xs transition-transform group-open:rotate-90">
                  ▸
                </span>
                {translate("issues.viewAffected")}
              </summary>
              <ul className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto pl-4">
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
        );
      })}
    </div>
  );
};

const Products = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.quality");
  const report = await unwrapResult(
    ListingQuality.auditListings(Environment.SERVER, { store }),
  );

  if (report.products.length === 0)
    return (
      <p className="p-4 text-foreground-dimmed text-sm">
        {translate("products.empty")}
      </p>
    );

  return (
    <div className="divide-y divide-accent-foreground">
      {report.products.map((product) => {
        const pills = (
          <span className="flex flex-wrap items-center gap-2">
            {ListingQuality.SURFACES.map((surface) => (
              <StatusPill
                key={surface}
                tone={STATUS_TONES[product.status[surface]]}
              >
                {translate(`platform.${surface}`)} ·{" "}
                {translate(`status.${product.status[surface]}`)}
              </StatusPill>
            ))}
          </span>
        );

        if (product.findings.length === 0)
          return (
            <div
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-2 p-4"
            >
              <p className="font-medium text-foreground text-sm">
                {product.title}
              </p>
              {pills}
            </div>
          );

        return (
          <details key={product.id} className="group">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4 transition-colors hover:bg-background">
              <span className="flex items-center gap-2">
                <span className="text-foreground-dimmed text-xs transition-transform group-open:rotate-90">
                  ▸
                </span>
                <span className="font-medium text-foreground text-sm">
                  {product.title}
                </span>
                <span className="text-foreground-dimmed text-xs">
                  {translate("products.findings", {
                    count: product.findings.length,
                  })}
                </span>
              </span>
              {pills}
            </summary>
            <div className="divide-y divide-accent-foreground border-accent-foreground border-t bg-background-dimmed">
              {product.findings.map((finding) => (
                <div
                  key={finding.rule}
                  className="flex flex-col gap-1.5 px-4 py-3 pl-10"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground-dimmed">
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
                      severity: (severity) => translate(`severity.${severity}`),
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
  );
};

export default ({ params }: PageProps<"/dashboard/[store]/quality">) => (
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
