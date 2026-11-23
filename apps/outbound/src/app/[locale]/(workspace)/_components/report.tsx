"use client";

import { BarChartIcon, ClockIcon } from "@zenncore/icons";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { useFormatter, useMessages, useTranslations } from "next-intl";
import type * as Outbound from "@/server/app/outbound";
import { Measurements } from "./measurements";

const columns = [
  "prospects",
  "held",
  "acceptedFirsts",
  "acceptedFollowups",
  "replies",
  "bounces",
  "meetings",
] as const;

export const ReportPanel = ({ report }: ReportPanel.Props) => {
  const translate = useTranslations("outbound.report");
  const pipeline = useTranslations("outbound.pipeline");
  const format = useFormatter();
  const messages = useMessages();
  const reason = (value: string) =>
    Object.hasOwn(messages.outbound.issues, value)
      ? messages.outbound.issues[value as keyof typeof messages.outbound.issues]
      : value;
  const entries = (
    ["acceptedFirsts", "acceptedFollowups", "replies"] as const
  ).map((key) => ({
    key,
    label: translate(`fields.${key}`),
    value: report.totals[key],
  }));
  const date = (value: string) =>
    format.dateTime(new Date(value), {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

  return (
    <section className="border-accent-foreground border-b">
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 pt-6 sm:px-6">
        <h2 className="flex items-center gap-2 font-semibold text-foreground-rich text-lg">
          <BarChartIcon aria-hidden className="size-5 text-primary" />
          {translate("title")}
        </h2>
        <p className="flex items-center gap-2 text-foreground-dimmed text-xs tabular-nums">
          <ClockIcon aria-hidden className="size-4" />
          {translate("period", {
            from: date(report.from),
            to: date(report.to),
          })}
        </p>
      </div>
      <div className="grid gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <Measurements entries={entries} label={translate("title")} />
          {(
            [
              "acceptedFirsts",
              "acceptedFollowups",
              "replies",
              "meetings",
              "bounces",
              "uncertain",
            ] as const
          ).every((key) => report.totals[key] === 0) && (
            <p className="text-foreground-dimmed text-sm">
              {translate("empty")}
            </p>
          )}
          <p className="text-foreground-dimmed text-xs leading-5">
            {pipeline("acceptedHelp")}
          </p>
        </div>
        <div className="min-w-0 border-accent-foreground border-t pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <dl className="divide-y divide-accent-foreground">
            {(["meetings", "bounces", "uncertain"] as const).map((key) => (
              <div
                key={key}
                className="flex items-baseline justify-between gap-4 py-4 first:pt-0"
              >
                <dt className="text-foreground-dimmed text-sm">
                  {translate(`fields.${key}`)}
                </dt>
                <dd className="font-heading font-semibold text-2xl text-foreground-rich tabular-nums">
                  {format.number(report.totals[key])}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-foreground-dimmed text-xs leading-5">
            {pipeline("meetingsHelp")}
          </p>
        </div>
      </div>
      <Accordion className="px-4 sm:px-6">
        <AccordionItem value="sources" className="border-0">
          <AccordionTrigger className="border-accent-foreground border-t py-4 text-sm">
            {translate("detailsTitle")}
          </AccordionTrigger>
          <AccordionPanel className="pb-6">
            <p className="mb-4 text-foreground-dimmed text-sm leading-6">
              {translate("description")}
            </p>
            <div className="max-w-full overflow-x-auto">
              <Table
                aria-label={translate("sourcesTitle")}
                className="min-w-200 [&_td]:font-normal [&_th]:bg-background/70"
              >
                <TableHeader>
                  <TableRow>
                    <TableHead className="normal-case tracking-normal">
                      {translate("fields.source")}
                    </TableHead>
                    {columns.map((key) => (
                      <TableHead
                        key={key}
                        className="text-right normal-case tracking-normal"
                      >
                        {translate(`fields.${key}`)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.bySource.map((source) => (
                    <TableRow key={source.source}>
                      <TableCell
                        className="max-w-64 truncate py-4"
                        title={source.source}
                      >
                        {source.source}
                      </TableCell>
                      {columns.map((key) => (
                        <TableCell
                          key={key}
                          className="text-right tabular-nums"
                        >
                          {format.number(source[key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {report.holdReasons.length > 0 && (
              <div className="pt-6">
                <h3 className="font-medium text-sm">
                  {translate("holdReasons")}
                </h3>
                <dl className="mt-4 max-w-3xl divide-y divide-accent-foreground">
                  {report.holdReasons.map((hold) => (
                    <div
                      key={hold.reason}
                      className="flex justify-between gap-6 py-4 text-sm"
                    >
                      <dt className="min-w-0 break-words text-foreground-dimmed">
                        {reason(hold.reason)}
                      </dt>
                      <dd className="shrink-0 tabular-nums">
                        {format.number(hold.count)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </section>
  );
};

export namespace ReportPanel {
  export type Props = {
    report: Extract<
      Awaited<ReturnType<typeof Outbound.getWeeklyReport>>,
      { success: true }
    >["data"];
  };
}
