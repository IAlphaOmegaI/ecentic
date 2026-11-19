import { ChevronLeftIcon, ChevronRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ConversationDetail } from "@/lib/outbound-conversations";
import { ConversationEditor } from "./editor";
import { ConversationStageBadge } from "./queue";

export const ConversationDetailView = async ({
  detail,
}: {
  detail: ConversationDetail;
}) => {
  const t = await getTranslations("outbound.conversations");
  const navigation = await getTranslations("outbound.sent");
  const format = await getFormatter();
  const date = (value: string) =>
    format.dateTime(new Date(value), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
  const pages = Math.max(1, Math.ceil(detail.total / detail.pageSize));
  return (
    <div>
      <section className="flex flex-wrap items-start justify-between gap-4 border-accent-foreground border-b px-4 py-6 sm:px-6">
        <div className="min-w-0">
          <Link
            href={`/prospects/${detail.thread.prospectId}`}
            className="font-heading font-medium text-2xl text-foreground-rich hover:text-primary-text"
          >
            {detail.thread.company}
          </Link>
          <p className="mt-1 break-words text-foreground-dimmed text-sm">
            {detail.thread.person} · {detail.thread.counterpart}
          </p>
          <p className="mt-2 break-words text-foreground-dimmed text-xs">
            {t(`channel.${detail.thread.channel}`)} ·{" "}
            {detail.thread.accountLabel}
          </p>
        </div>
        <ConversationStageBadge
          stage={detail.thread.stage}
          needsReply={detail.thread.needsReply}
        />
      </section>
      <div className="grid xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-b px-4 py-4 sm:px-6">
            <h2 className="min-w-0 break-words font-medium text-foreground-rich">
              {detail.thread.subject || t("noSubject")}
            </h2>
            <p className="text-foreground-dimmed text-xs">{t("newestFirst")}</p>
          </div>
          {detail.messages.length ? (
            <ol className="divide-y divide-accent-foreground">
              {detail.messages.map((message) => (
                <li key={message.id} className="px-4 py-6 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 break-all font-medium text-foreground-rich text-sm">
                      {message.from}
                    </p>
                    <time
                      dateTime={message.sentAt}
                      className="text-foreground-dimmed text-xs"
                    >
                      {date(message.sentAt)} UTC
                    </time>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-foreground-dimmed text-xs">
                    <span>{t(`direction.${message.direction}`)}</span>
                    <span>{t(`channel.${message.channel}`)}</span>
                    {message.isAutomated && <span>{t("automated")}</span>}
                    <span className="break-all">
                      {t("to")}: {message.to}
                    </span>
                  </div>
                  <p className="mt-5 whitespace-pre-wrap break-words text-foreground-rich text-sm leading-7">
                    {message.bodyText || t("emptyBody")}
                  </p>
                  {message.truncated && (
                    <p className="mt-4 text-sm text-warning leading-6">
                      {t("truncated")}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-4 py-10 text-foreground-dimmed text-sm sm:px-6">
              {t("emptyMessages")}
            </p>
          )}
          {pages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-t px-4 py-4 sm:px-6">
              <p className="text-foreground-dimmed text-xs">
                {navigation("pagination.page", {
                  page: String(detail.page),
                  pages: String(pages),
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="soft"
                  color="neutral"
                  disabled={detail.page <= 1}
                  render={
                    detail.page > 1 ? (
                      <Link
                        href={`/replies/${detail.thread.prospectId}?thread=${detail.thread.id}&page=${detail.page - 1}`}
                      />
                    ) : undefined
                  }
                >
                  <ChevronLeftIcon aria-hidden className="size-4" />
                  {navigation("pagination.previous")}
                </Button>
                <Button
                  variant="soft"
                  color="neutral"
                  disabled={detail.page >= pages}
                  render={
                    detail.page < pages ? (
                      <Link
                        href={`/replies/${detail.thread.prospectId}?thread=${detail.thread.id}&page=${detail.page + 1}`}
                      />
                    ) : undefined
                  }
                >
                  {navigation("pagination.next")}
                  <ChevronRightIcon aria-hidden className="size-4" />
                </Button>
              </div>
            </div>
          )}
          {detail.sendAttempts.length > 0 && (
            <section className="border-accent-foreground border-t px-4 py-6 sm:px-6">
              <h2 className="font-heading font-medium text-foreground-rich text-lg">
                {t("attemptsTitle")}
              </h2>
              <ol className="mt-3 divide-y divide-accent-foreground">
                {detail.sendAttempts.map((attempt) => (
                  <li key={attempt.id} className="space-y-2 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span
                        className={
                          attempt.status === "accepted"
                            ? "text-success"
                            : attempt.status === "starting"
                              ? "text-foreground-dimmed"
                              : "text-warning"
                        }
                      >
                        {t(`send.${attempt.status}`)}
                      </span>
                      <time
                        dateTime={attempt.createdAt}
                        className="text-foreground-dimmed text-xs"
                      >
                        {date(attempt.createdAt)} UTC
                      </time>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-foreground-dimmed text-sm leading-6">
                      {attempt.body}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
        <aside className="min-w-0 border-accent-foreground border-t px-4 py-6 sm:px-6 xl:border-t-0 xl:border-l">
          <ConversationEditor key={detail.thread.id} detail={detail} />
        </aside>
      </div>
    </div>
  );
};
