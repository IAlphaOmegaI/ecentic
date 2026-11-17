import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { SentDetail } from "@/lib/outbound-sent";
import { Status } from "../../_components/common";
import { SentStatusBadge } from "./queue";

export const SentDetailView = async ({ detail }: { detail: SentDetail }) => {
  const t = await getTranslations("outbound.sent");
  const format = await getFormatter();
  const date = (value: string) =>
    format.dateTime(new Date(value), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
  const row = detail.row;
  return (
    <div>
      <section className="space-y-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading font-medium text-2xl text-foreground-rich">
              {row.company}
            </h2>
            <p className="mt-1 break-all text-foreground-dimmed text-sm">
              {row.recipient || t("unknown")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SentStatusBadge status={row.status} />
            {row.test && (
              <span className="rounded-sm bg-background px-2 py-1 text-foreground-dimmed text-xs">
                {t("test")}
              </span>
            )}
          </div>
        </div>
        {row.campaignName && (
          <p className="text-foreground-dimmed text-sm">
            {t("columns.campaign")}:{" "}
            <Link
              href={`/campaigns/${row.campaignId}`}
              className="text-primary-text"
            >
              {row.campaignName}
            </Link>
          </p>
        )}
        <p className="text-foreground-dimmed text-xs leading-5">
          {row.status === "accepted"
            ? t("acceptanceNote")
            : t(`message.${row.status}`)}{" "}
          {row.test && t("message.test")}
        </p>
      </section>
      <section className="border-accent-foreground border-b px-4 py-6 sm:px-6">
        <h2 className="font-heading font-medium text-foreground-rich text-lg">
          {t("message.title")}
        </h2>
        <dl className="mt-4 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
          <dt className="text-foreground-dimmed">{t("message.from")}</dt>
          <dd className="break-all">
            {detail.fromName ? `${detail.fromName} · ` : ""}
            {row.sender || t("unknown")}
          </dd>
          <dt className="text-foreground-dimmed">{t("message.to")}</dt>
          <dd className="break-all">{row.recipient || t("unknown")}</dd>
          <dt className="text-foreground-dimmed">{t("message.subject")}</dt>
          <dd className="break-words font-medium text-foreground-rich">
            {row.subject || t("unknown")}
          </dd>
          <dt className="text-foreground-dimmed">{t("message.recorded")}</dt>
          <dd>
            <time dateTime={row.recordedAt}>{date(row.recordedAt)} UTC</time>
          </dd>
        </dl>
        {detail.body === null ? (
          <p role="status" className="mt-6 text-sm text-warning leading-6">
            {t("message.contentMissing")}
          </p>
        ) : (
          <pre className="mt-6 whitespace-pre-wrap break-words font-body text-foreground-rich text-sm leading-7">
            {detail.body}
          </pre>
        )}
        <dl className="mt-7 grid gap-x-5 gap-y-2 border-accent-foreground border-t pt-4 text-xs sm:grid-cols-[auto_minmax(0,1fr)]">
          <dt className="text-foreground-dimmed">{t("message.messageId")}</dt>
          <dd className="break-all font-mono">{detail.messageId}</dd>
          <dt className="text-foreground-dimmed">{t("message.providerId")}</dt>
          <dd className="break-all font-mono">
            {detail.providerMessageId || t("unknown")}
          </dd>
        </dl>
      </section>
      <section className="border-accent-foreground border-b py-6">
        <div className="space-y-3 px-4 sm:px-6">
          <h2 className="font-heading font-medium text-foreground-rich text-lg">
            {t("sequence.title")}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-foreground-dimmed">
              {t("sequence.status")}
            </span>
            <Status value={row.sequenceStatus} />
          </div>
          <p className="text-foreground-dimmed text-sm">
            {detail.nextSendAt
              ? t("sequence.next", { time: `${date(detail.nextSendAt)} UTC` })
              : t("sequence.noSchedule")}
          </p>
          {detail.nextSendAt && (
            <p className="text-foreground-dimmed text-xs">
              {t("sequence.scheduleNote")}
            </p>
          )}
          {row.sequenceStatus === "bounced" && (
            <p className="text-error text-sm leading-6">
              {t("sequence.bounced")}. {t("sequence.bounceNote")}
            </p>
          )}
        </div>
        <div className="mt-5 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.step")}</TableHead>
                <TableHead>{t("columns.subject")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.time")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.sequence.map((message) => (
                <TableRow
                  key={message.id}
                  className={message.id === row.id ? "bg-primary/5" : ""}
                >
                  <TableCell className="whitespace-nowrap">
                    {t("step", { step: String(message.step) })}
                  </TableCell>
                  <TableCell className="max-w-64 truncate">
                    {message.subject || t("unknown")}
                  </TableCell>
                  <TableCell>
                    <SentStatusBadge status={message.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {date(message.recordedAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="soft"
                      color="neutral"
                      size="icon"
                      aria-label={`${t("action.primary")}: ${t("step", { step: String(message.step) })}`}
                      render={
                        <Link href={`/sent/${message.id}`} prefetch={false} />
                      }
                    >
                      <ArrowRightIcon aria-hidden className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
      <section className="px-4 py-6 sm:px-6">
        <h2 className="font-heading font-medium text-foreground-rich text-lg">
          {t("sequence.activity")}
        </h2>
        {detail.activity.length ? (
          <ol className="mt-4 divide-y divide-accent-foreground">
            {detail.activity.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span>{t(`activity.${event.kind}`)}</span>
                <time
                  dateTime={event.recordedAt}
                  className="text-foreground-dimmed text-xs"
                >
                  {date(event.recordedAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-foreground-dimmed text-sm">
            {t("sequence.emptyActivity")}
          </p>
        )}
        {detail.activityLimited && (
          <p className="mt-3 text-foreground-dimmed text-xs">
            {t("sequence.limitedActivity")}
          </p>
        )}
        <p className="mt-4 text-foreground-dimmed text-xs">{t("timezone")}</p>
      </section>
    </div>
  );
};
