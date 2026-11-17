"use client";

import { ClockIcon, EnvelopeIcon } from "@zenncore/icons";
import { field, InferredForm } from "@zenncore/web/components/inferred-form";
import { useFormatter, useMessages, useTranslations } from "next-intl";
import { z } from "zod";
import { type Activity, OUTCOME_KINDS, type Prospect } from "@/lib/outbound";
import * as Outbound from "@/server/app/outbound";
import { Empty, Multiline, Notice, Submit, useMutation } from "./common";

export const Replies = ({
  prospects,
  events,
}: {
  prospects: Prospect[];
  events: Activity[];
}) => {
  const t = useTranslations("outbound");
  const messages = useMessages();
  const labels = messages.outbound.replies.outcomes;
  const mutation = useMutation();
  const replies = events.filter((event) =>
    OUTCOME_KINDS.some((kind) => event.kind.includes(kind)),
  );
  return (
    <>
      {prospects.length > 0 && (
        <div className="border-accent-foreground border-b px-4 py-6 sm:px-6">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-foreground-rich text-lg">
            <EnvelopeIcon aria-hidden className="size-5 text-primary" />
            {t("replies.action.primary")}
          </h2>
          <p className="mb-6 max-w-3xl text-foreground-dimmed text-sm leading-6">
            {t("replies.manualNote")}
          </p>
          <InferredForm
            config={{
              prospect: field({
                shape: "select",
                validator: z.enum(prospects.map((prospect) => prospect.id)),
                label: t("prospect.fields.name"),
                items: prospects.map((prospect) => ({
                  value: prospect.id,
                  label: `${prospect.name} · ${prospect.company}`,
                })),
              }),
              kind: field({
                shape: "select",
                validator: z.enum(OUTCOME_KINDS),
                label: t("replies.fields.outcome"),
                items: OUTCOME_KINDS.map((value) => ({
                  value,
                  label: labels[value],
                })),
              }),
              note: field({
                shape: "custom",
                Component: Multiline,
                validator: z.string().max(5000),
                label: t("replies.fields.note"),
                classList: { field: "sm:col-span-2" },
              }),
            }}
            defaultValues={{
              prospect: prospects[0]?.id ?? "",
              kind: "reply",
              note: "",
            }}
            onSubmit={(values) =>
              mutation.run(() => Outbound.recordOutcome(values))
            }
            className="grid max-w-4xl gap-6 sm:grid-cols-2"
          >
            <div className="space-y-4 sm:col-span-2">
              <Submit pending={mutation.pending}>
                {t("replies.action.primary")}
              </Submit>
              <Notice value={mutation.notice} />
            </div>
          </InferredForm>
        </div>
      )}
      {replies.length ? (
        <ActivityList events={replies} />
      ) : (
        <Empty
          title={t("replies.emptyTitle")}
          description={t("replies.emptyDescription")}
        />
      )}
    </>
  );
};

export const ActivityList = ({ events }: { events: Activity[] }) => {
  const format = useFormatter();
  const t = useTranslations("outbound");
  if (!events.length)
    return (
      <p className="px-4 py-8 text-foreground-dimmed text-sm sm:px-6">
        {t("overview.activityEmpty")}
      </p>
    );
  return (
    <ol className="divide-y divide-accent-foreground">
      {[...events]
        .sort((first, second) =>
          second.createdAt.localeCompare(first.createdAt),
        )
        .map((event) => (
          <li
            key={event.id}
            className="grid gap-2 px-4 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:px-6"
          >
            <time
              dateTime={event.createdAt}
              className="flex items-center gap-2 text-foreground-dimmed text-xs tabular-nums"
            >
              <ClockIcon aria-hidden className="size-4 shrink-0" />
              {format.dateTime(new Date(event.createdAt), {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "UTC",
              })}{" "}
              UTC
            </time>
            <p className="min-w-0 whitespace-pre-wrap break-words text-sm">
              {event.detail}
            </p>
          </li>
        ))}
    </ol>
  );
};
