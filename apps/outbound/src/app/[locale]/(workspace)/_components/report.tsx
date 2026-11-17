"use client";

import {
  AlertCircleIcon,
  BarChartIcon,
  ClockIcon,
  EnvelopeIcon,
} from "@zenncore/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { useFormatter, useTranslations } from "next-intl";
import type * as Outbound from "@/server/app/outbound";

type Report = Extract<
  Awaited<ReturnType<typeof Outbound.getWeeklyReport>>,
  { success: true }
>["data"];
const columns = [
  "prospects",
  "held",
  "acceptedFirsts",
  "acceptedFollowups",
  "replies",
  "bounces",
  "meetings",
] as const;

export const ReportPanel = ({ report }: { report: Report }) => {
  const t = useTranslations("outbound.report");
  const format = useFormatter();
  return (
    <section className="border-accent-foreground border-t">
      <div className="space-y-3 px-4 py-6 sm:px-6">
        <h2 className="flex items-center gap-2 font-semibold text-foreground-rich text-lg">
          <BarChartIcon aria-hidden className="size-5 text-primary" />
          {t("title")}
        </h2>
        <p className="max-w-3xl text-foreground-dimmed text-sm">
          {t("description")}
        </p>
        <p className="flex items-center gap-2 text-foreground-dimmed text-xs tabular-nums">
          <ClockIcon aria-hidden className="size-4" />
          {t("period", {
            from: report.from.slice(0, 10),
            to: report.to.slice(0, 10),
          })}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-px border-accent-foreground border-y bg-accent-foreground lg:grid-cols-4">
        {(
          [
            "acceptedFirsts",
            "acceptedFollowups",
            "replies",
            "uncertain",
          ] as const
        ).map((key) => (
          <div
            key={key}
            className="min-w-0 bg-background-rich px-4 py-6 sm:px-6"
          >
            <p className="flex items-center justify-between gap-3 text-foreground-dimmed text-sm">
              {t(`fields.${key}`)}
              {key === "uncertain" ? (
                <AlertCircleIcon aria-hidden className="size-4 shrink-0" />
              ) : (
                <EnvelopeIcon aria-hidden className="size-4 shrink-0" />
              )}
            </p>
            <p className="mt-3 font-semibold text-3xl text-foreground-rich tabular-nums tracking-tight">
              {format.number(report.totals[key])}
            </p>
          </div>
        ))}
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table className="min-w-200 [&_td]:font-normal [&_th]:bg-background/70">
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 normal-case tracking-normal sm:px-6">
                {t("fields.source")}
              </TableHead>
              {columns.map((key) => (
                <TableHead
                  key={key}
                  className="text-right normal-case tracking-normal"
                >
                  {t(`fields.${key}`)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.bySource.map((source) => (
              <TableRow key={source.source}>
                <TableCell className="max-w-64 truncate px-4 py-3 sm:px-6">
                  {source.source}
                </TableCell>
                {columns.map((key) => (
                  <TableCell key={key} className="text-right tabular-nums">
                    {format.number(source[key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {report.holdReasons.length > 0 && (
        <div className="px-4 py-8 sm:px-6">
          <h3 className="font-medium">{t("holdReasons")}</h3>
          <dl className="mt-4 max-w-3xl divide-y divide-accent-foreground">
            {report.holdReasons.map((hold) => (
              <div
                key={hold.reason}
                className="flex justify-between gap-6 py-3 text-sm"
              >
                <dt className="min-w-0 break-words text-foreground-dimmed">
                  {hold.reason}
                </dt>
                <dd className="shrink-0 tabular-nums">
                  {format.number(hold.count)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
};
