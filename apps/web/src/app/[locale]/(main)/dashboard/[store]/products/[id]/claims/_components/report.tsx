"use client";

import {
  CheckBadgeIcon,
  CircleMinusIcon,
  RobotIcon,
  XCircleIcon,
} from "@zenncore/icons";
import { useFormatter, useTranslations } from "next-intl";
import type * as Rules from "@/server/app/intelligence/claim-check-rules";
import {
  Band,
  SectionGutter,
  SectionHeader,
  SectionKicker,
  StatCell,
  StatusPill,
} from "../../../../../_components/grid";
import { RunClaimCheck } from "./actions";
import { ClaimsList } from "./claims-list";
import { CoreFactsTable } from "./core-facts";
import {
  VERDICT_ICON,
  VERDICT_KEY,
  VERDICT_ORDER,
  VERDICT_TONE,
} from "./verdicts";

export const ProductBand = ({
  product,
  checkedAt,
  listingChanged,
}: {
  product: { title: string; url: string | null };
  checkedAt: Date | null;
  listingChanged: boolean;
}) => {
  const translate = useTranslations("dashboard.claims.product");
  const format = useFormatter();

  return (
    <Band>
      <div className="flex flex-col gap-1 px-6 py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <SectionKicker>{translate("label")}</SectionKicker>
          <p className="mt-1 truncate font-semibold text-foreground-rich">
            {product.title}
          </p>
        </div>
        {checkedAt && (
          <p className="shrink-0 text-foreground-dimmed text-xs">
            {translate("checkedAt", { time: format.relativeTime(checkedAt) })}
          </p>
        )}
      </div>
      {listingChanged && (
        <div className="border-accent-foreground border-t bg-warning/5 px-6 py-3">
          <p className="text-sm text-warning">{translate("changed")}</p>
        </div>
      )}
    </Band>
  );
};

export const FailedNote = ({
  expired,
  error,
}: {
  expired: boolean;
  error: string | null;
}) => {
  const translate = useTranslations("dashboard.claims.failed");

  return (
    <Band surface={false} className="bg-warning/5 px-6 py-4">
      <div>
        <p className="font-medium text-sm text-warning">{translate("title")}</p>
        <p className="mt-1 text-foreground-dimmed text-xs">
          {expired ? translate("expired") : (error ?? translate("description"))}
        </p>
      </div>
    </Band>
  );
};

export const ClaimsEmpty = ({
  params,
}: {
  params: Promise<{ store: string; id: string }>;
}) => {
  const translate = useTranslations("dashboard.claims.empty");

  return (
    <Band>
      <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
        <p className="font-semibold text-foreground-rich text-lg">
          {translate("title")}
        </p>
        <p className="max-w-md text-foreground-dimmed text-sm">
          {translate("description")}
        </p>
        <RunClaimCheck params={params} />
      </div>
    </Band>
  );
};

/**
 * The page's answer first — how many claims anything outside the store backs —
 * then what the words mean, then the evidence: core facts, claims, and how the
 * run went.
 *
 * Client components with plain-data props: the dashboard fetches the report on
 * the server and hands it down, and the staff demo (`/dev/claim-check`) renders
 * the one its action returned.
 */
export const ClaimsReport = ({ report }: { report: Rules.Report }) => {
  const translate = useTranslations("dashboard.claims");
  const { summary } = report;

  return (
    <>
      <Band marks="none">
        <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
          <StatCell
            label={translate("summary.verified")}
            icon={<CheckBadgeIcon className="size-7.5 text-success" />}
            value={summary.verified}
            tone="success"
            progress={
              summary.claims > 0 ? (summary.verified / summary.claims) * 100 : 0
            }
            detail={translate("summary.verifiedDetail", {
              count: summary.claims,
            })}
          />
          <StatCell
            label={translate("summary.merchantOnly")}
            icon={<CircleMinusIcon className="size-7.5 text-warning" />}
            value={summary.merchantOnly}
            detail={translate("summary.merchantOnlyDetail")}
          />
          <StatCell
            label={translate("summary.contradicted")}
            icon={<XCircleIcon className="size-7.5 text-error" />}
            value={summary.contradicted}
            detail={translate("summary.contradictedDetail")}
          />
          <StatCell
            label={translate("summary.divergent")}
            icon={<RobotIcon className="size-7.5 text-primary" />}
            value={summary.divergent}
            detail={translate("summary.divergentDetail")}
          />
        </div>
      </Band>

      <SectionGutter />
      <VerdictDefinitions />

      <SectionGutter />
      <Band marks="top">
        <SectionHeader
          kicker={translate("facts.kicker")}
          title={translate("facts.title")}
          description={translate("facts.description")}
        />
        <CoreFactsTable facts={report.coreFacts} />
      </Band>

      <SectionGutter />
      <Band marks="top">
        <SectionHeader
          kicker={translate("claims.kicker")}
          title={translate("claims.title")}
          description={translate("claims.description", {
            checked: report.claims.length,
            found: report.extraction.found,
          })}
        />
        {report.extraction.status === "failed" ? (
          <p className="px-5 py-6 text-foreground-dimmed text-sm">
            {translate("claims.extractionFailed")}
          </p>
        ) : report.claims.length === 0 ? (
          <p className="px-5 py-6 text-foreground-dimmed text-sm">
            {translate("claims.none")}
          </p>
        ) : (
          <ClaimsList claims={report.claims} />
        )}
      </Band>

      <SectionGutter />
      <RunDetails report={report} />
    </>
  );
};

/**
 * The report defines its own words. "Verified" has no shared meaning among
 * shoppers, so the page states exactly what earns it here.
 */
const VerdictDefinitions = () => {
  const translate = useTranslations("dashboard.claims.verdicts");

  return (
    <Band marks="top">
      <SectionHeader
        kicker={translate("kicker")}
        title={translate("title")}
        description={translate("description")}
      />
      <dl className="grid gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-3">
        {VERDICT_ORDER.map((verdict) => (
          <div
            key={verdict}
            className="flex flex-col gap-2 bg-background-rich p-4"
          >
            <dt>
              <StatusPill tone={VERDICT_TONE[verdict]}>
                {VERDICT_ICON[verdict]}
                {translate(`${VERDICT_KEY[verdict]}.label`)}
              </StatusPill>
            </dt>
            <dd className="text-foreground-dimmed text-sm">
              {translate(`${VERDICT_KEY[verdict]}.definition`)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="border-accent-foreground border-t px-4 py-3 text-foreground-dimmed text-xs">
        {translate("assistants")}
      </p>
    </Band>
  );
};

const RunDetails = ({ report }: { report: Rules.Report }) => {
  const translate = useTranslations("dashboard.claims.details");
  const format = useFormatter();

  const pageLine = (() => {
    switch (report.page.status) {
      case "found":
        return translate("page.found");
      case "missing":
        return translate("page.missing");
      case "unreachable":
        return translate("page.unreachable");
      default:
        return translate("page.noUrl");
    }
  })();

  const researchLine = (() => {
    switch (report.research.status) {
      case "ok":
        return translate("research.ok", { count: report.research.sources });
      case "failed":
        return translate("research.failed");
      default:
        return translate("research.skipped");
    }
  })();

  const rows = [
    { key: "page", label: translate("rows.page"), value: pageLine },
    ...report.assistants.map((run) => ({
      key: run.assistant,
      label: run.label,
      value:
        run.status === "failed"
          ? translate("assistant.failed")
          : run.recognized
            ? translate("assistant.ok")
            : translate("assistant.okUnrecognized"),
    })),
    { key: "research", label: translate("rows.research"), value: researchLine },
    {
      key: "sources",
      label: translate("rows.sources"),
      value: translate("sources", {
        read: report.sources.read,
        attempted: report.sources.attempted,
      }),
    },
    ...(report.judge.status === "failed"
      ? [
          {
            key: "judge",
            label: translate("rows.judge"),
            value: translate("judge.failed"),
          },
        ]
      : []),
    {
      key: "synced",
      label: translate("rows.synced"),
      value: report.listing.syncedAt
        ? format.dateTime(new Date(report.listing.syncedAt), {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : translate("never"),
    },
  ];

  return (
    <Band marks="top">
      <SectionHeader
        kicker={translate("kicker")}
        title={translate("title")}
        description={translate("description")}
      />
      <dl className="divide-y divide-accent-foreground">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-6"
          >
            <dt className="w-44 shrink-0 text-foreground-dimmed text-sm">
              {row.label}
            </dt>
            <dd className="text-foreground text-sm">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-1 border-accent-foreground border-t px-4 py-3 text-foreground-dimmed text-xs">
        <p>{translate("apiNote")}</p>
        <p>{translate("brandNote")}</p>
      </div>
    </Band>
  );
};
